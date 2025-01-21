import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import { TypedEventEmitter, setMaxListeners, Connection } from '@libp2p/interface'
import { ipPortToMultiaddr as toMultiaddr } from '@libp2p/utils/ip-port-to-multiaddr'
import { multiaddr, protocols } from '@multiformats/multiaddr'
import { WebSockets } from '@multiformats/multiaddr-matcher'
import { pEvent } from 'p-event'
import * as ws from 'ws'
import { socketToMaConn } from './socket-to-conn'
import type {
  ComponentLogger,
  Logger,
  Listener,
  ListenerEvents,
  CreateListenerOptions,
  CounterGroup,
  MetricGroup,
  Metrics,
  TypedEventTarget,
  Libp2pEvents,
  Upgrader,
  MultiaddrConnection,
} from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { DuplexWebSocket } from 'it-ws/duplex'
import type { Server } from 'node:http'
import { createServer, type WebSocketServer } from 'it-ws/server'

export interface WebSocketListenerComponents {
  logger: ComponentLogger
  events: TypedEventTarget<Libp2pEvents>
  metrics?: Metrics
}

export interface WebSocketListenerInit extends CreateListenerOptions {
  server?: Server
  targetPort: number
  inboundConnectionUpgradeTimeout?: number
  cert?: string
  key?: string
  http?: http.ServerOptions
  https?: http.ServerOptions
}

export interface WebSocketListenerMetrics {
  status?: MetricGroup
  errors?: CounterGroup
  events?: CounterGroup
}

export class WebSocketListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private readonly log: Logger
  private readonly logger: ComponentLogger
  private readonly wsServer: WebSocketServer
  private readonly metrics: WebSocketListenerMetrics
  private readonly sockets: Set<net.Socket>
  private readonly upgrader: Upgrader
  private readonly inboundConnectionUpgradeTimeout: number
  private readonly httpOptions?: http.ServerOptions
  private http?: http.Server
  private addr?: string
  private listeningMultiaddr?: Multiaddr
  private init: WebSocketListenerInit
  private readonly components: WebSocketListenerComponents
  private readonly connections: Set<DuplexWebSocket>

  constructor(components: WebSocketListenerComponents, init: WebSocketListenerInit) {
    super()

    this.components = components
    this.log = this.components.logger.forComponent('libp2p:websockets:listener')
    this.logger = this.components.logger
    this.upgrader = init.upgrader
    this.httpOptions = init.http
    this.inboundConnectionUpgradeTimeout = init.inboundConnectionUpgradeTimeout ?? 5000
    this.sockets = new Set()
    this.init = init
    this.connections = new Set<DuplexWebSocket>()
    this.http = init.server ?? http.createServer(this.httpOptions ?? {})

    this.wsServer = createServer({
      ...this.init,
      server: this.http,
      onConnection: this.onWsServerConnection.bind(this),
    })

    components.metrics?.registerMetricGroup('libp2p_websockets_inbound_connections_total', {
      label: 'address',
      help: 'Current active connections in WebSocket listener',
      calculate: () => {
        if (this.addr == null) {
          return {}
        }

        return {
          [this.addr]: this.sockets.size,
        }
      },
    })

    this.addr = 'unknown'
    this.metrics = {
      status: this.components.metrics?.registerMetricGroup('libp2p_websockets_listener_status_info', {
        label: 'address',
        help: 'Current status of the WebSocket listener socket',
      }),
      errors: this.components.metrics?.registerMetricGroup('libp2p_websockets_listener_errors_total', {
        label: 'address',
        help: 'Total count of WebSocket listener errors by type',
      }),
      events: this.components.metrics?.registerMetricGroup('libp2p_websockets_listener_events_total', {
        label: 'address',
        help: 'Total count of WebSocket listener events by type',
      }),
    }
  }

  onWsServerConnection(stream: DuplexWebSocket): void {
    const _log = this.components.logger.forComponent(`libp2p:websockets:listener:ws-connection:${stream.remoteAddress}`)

    let addr: string | ws.AddressInfo | null

    try {
      addr = this.wsServer.address()

      if (typeof addr === 'string') {
        throw new Error('Cannot listen on unix sockets')
      }

      if (addr == null) {
        throw new Error('Server was closing or not running')
      }
    } catch (err: any) {
      _log.error('error obtaining remote socket address - %e', err)
      stream.close()
      return
    }

    let maConn: MultiaddrConnection

    try {
      maConn = socketToMaConn(stream, toMultiaddr(stream.remoteAddress ?? '', stream.remotePort ?? 0), {
        logger: this.logger,
        metrics: this.metrics?.events,
        metricPrefix: `${this.addr} `,
      })
    } catch (err: any) {
      _log.error('inbound connection failed', err)
      this.metrics.errors?.increment({ [`${this.addr} inbound_to_connection`]: true })
      stream.close()
      return
    }

    _log('new inbound connection %s', maConn.remoteAddr)
    const signal = AbortSignal.timeout(this.inboundConnectionUpgradeTimeout)
    setMaxListeners(Infinity, signal)

    void this.upgrader
      .upgradeInbound(maConn)
      .then(() => {
        this.log('inbound connection %s upgraded', maConn.remoteAddr)

        this.dispatchEvent(new CustomEvent<Connection>('connection'))
      })
      .catch(async err => {
        _log.error('inbound connection failed to upgrade - %e', err)
        this.metrics.errors?.increment({ [`${this.addr} inbound_upgrade`]: true })

        await maConn.close().catch(err => {
          _log.error('inbound connection failed to close after upgrade failed', err)
          this.metrics.errors?.increment({ [`${this.addr} inbound_closing_failed`]: true })
        })
      })

    // store the socket so we can close it when the listener closes
    this.connections.add(stream)

    stream.socket.on('close', () => {
      this.metrics.events?.increment({ [`${this.addr} close`]: true })
      this.connections.delete(stream)
    })

    stream.socket.on('error', err => {
      _log.error('socket error - %e', err)
      this.metrics.events?.increment({ [`${this.addr} error`]: true })
      stream.destroy()
    })

    stream.socket.once('unexpected-response', (req: http.ClientRequest) => {
      this.metrics.events?.increment({ [`${this.addr} unexpected-response`]: true })
      _log.error('unexpected response - %d %s', req.req.statusCode, req.req.statusMessage)
    })
  }

  async listen(ma: Multiaddr): Promise<void> {
    let listenerType: string = 'unknown'
    if (WebSockets.exactMatch(ma)) {
      listenerType = 'ws'
    } else {
      throw new Error(`Multiaddr ${ma.toString()} doesn't match WebSockets formatter!`)
    }

    this.listeningMultiaddr = ma
    const { host } = ma.toOptions()
    this.addr = `${host}:${this.init.targetPort}`

    const _log = this.components.logger.forComponent(`libp2p:websockets:listener:${listenerType}:${this.addr}`)
    _log(`Listening on address`, this.addr)

    this.wsServer.listen({ ...ma.toOptions(), port: this.init.targetPort })

    await new Promise<void>((resolve, reject) => {
      const onListening = (): void => {
        _log(`Listening!`)
        removeListeners()
        resolve()
      }
      const onError = (err: Error): void => {
        _log.error(`Error on listener`, err)
        this.metrics.errors?.increment({ [`${this.addr} listen_error`]: true })
        removeListeners()
        reject(err)
      }
      const onDrop = (): void => {
        this.metrics.events?.increment({ [`${this.addr} drop`]: true })
      }
      const removeListeners = (): void => {
        this.wsServer.removeListener('listening', onListening)
        this.wsServer.removeListener('error', onError)
        this.wsServer.removeListener('drop', onDrop)
      }

      this.wsServer.addListener('listening', onListening)
      this.wsServer.addListener('error', onError)
      this.wsServer.addListener('drop', onDrop)
    })

    this.safeDispatchEvent('listening')
  }

  async close(): Promise<void> {
    // close all connections, must be done after closing the server to prevent
    // race conditions where a new connection is accepted while we are closing
    // the existing ones
    this.http?.closeAllConnections()
    ;[...this.connections].forEach(connection => {
      connection.destroy()
    })

    await this.wsServer.close()
    this.http?.close()

    await Promise.all([
      pEvent(this.wsServer, 'close'),
      this.http == null ? null : pEvent(this.http, 'close'),
      pEvent(this.wsServer, 'close'),
    ])

    this.safeDispatchEvent('close')
  }

  getAddrs(): Multiaddr[] {
    const multiaddrs = []
    const address = this.wsServer.address()

    if (address == null) {
      throw new Error('Listener is not ready yet')
    }

    if (typeof address === 'string') {
      throw new Error(
        'Wrong address type received - expected AddressInfo, got string - are you trying to listen on a unix socket?'
      )
    }

    if (this.listeningMultiaddr == null) {
      throw new Error('Listener is not ready yet')
    }

    const ipfsId = this.listeningMultiaddr.getPeerId()
    const protos = this.listeningMultiaddr.protos()

    // Because TCP will only return the IPv6 version
    // we need to capture from the passed multiaddr
    if (protos.some(proto => proto.code === protocols('ip4').code)) {
      const wsProto = protos.some(proto => proto.code === protocols('ws').code) ? '/ws' : '/wss'
      let m = this.listeningMultiaddr.decapsulate('tcp')
      m = m.encapsulate(`/tcp/${address.port}${wsProto}`)
      if (ipfsId != null) {
        m = m.encapsulate(`/p2p/${ipfsId}`)
      }

      if (m.toString().includes('0.0.0.0')) {
        const netInterfaces = os.networkInterfaces()
        Object.values(netInterfaces).forEach(niInfos => {
          if (niInfos == null) {
            return
          }

          niInfos.forEach(ni => {
            if (ni.family === 'IPv4') {
              multiaddrs.push(multiaddr(m.toString().replace('0.0.0.0', ni.address)))
            }
          })
        })
      } else {
        multiaddrs.push(m)
      }
    }

    return multiaddrs
  }
}

export function createListener(components: WebSocketListenerComponents, init: WebSocketListenerInit): Listener {
  return new WebSocketListener(components, init)
}
