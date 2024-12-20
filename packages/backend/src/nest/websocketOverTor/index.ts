// Forked from:
// https://github.com/libp2p/js-libp2p/blob/863949482bfa83ac3be2b72a4036ed9315f52d11/packages/transport-websockets/src/index.ts
//
// Essentially, the only thing we've done is override the listening port of the
// listener and add a remoteAddress query parameter in the _connect function.

import { CodeError, transportSymbol, serviceCapabilities } from '@libp2p/interface'
import { multiaddrToUri as toUri } from '@multiformats/multiaddr-to-uri'
import { connect, type WebSocketOptions } from 'it-ws/client'
import pDefer from 'p-defer'
import { CustomProgressEvent } from 'progress-events'
import { raceSignal } from 'race-signal'
import * as filters from './filters'
import { createListener } from './listener'
import { socketToMaConn } from './socket-to-conn'
import type {
  Transport,
  MultiaddrFilter,
  CreateListenerOptions,
  DialTransportOptions,
  Listener,
  AbortOptions,
  ComponentLogger,
  Logger,
  Connection,
  OutboundConnectionUpgradeEvents,
  Metrics,
  CounterGroup,
} from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Server } from 'http'
import type { DuplexWebSocket } from 'it-ws/duplex'
import type { ProgressEvent } from 'progress-events'
import type { ClientOptions } from 'ws'

export interface WebSocketsInit extends AbortOptions, WebSocketOptions {
  filter?: MultiaddrFilter
  websocket?: ClientOptions
  server?: Server
  localAddress: string
  targetPort: number
}

export interface WebSocketsComponents {
  logger: ComponentLogger
  metrics?: Metrics
}

export interface WebSocketsMetrics {
  dialerEvents: CounterGroup
}

export type WebSocketsDialEvents = OutboundConnectionUpgradeEvents | ProgressEvent<'websockets:open-connection'>

export class WebSockets implements Transport<WebSocketsDialEvents> {
  private readonly log: Logger
  private readonly init: WebSocketsInit
  private readonly logger: ComponentLogger
  private readonly metrics?: WebSocketsMetrics
  private readonly components: WebSocketsComponents

  constructor(components: WebSocketsComponents, init: WebSocketsInit) {
    this.log = components.logger.forComponent('libp2p:websockets')
    this.logger = components.logger
    this.components = components
    this.init = init

    if (components.metrics != null) {
      this.metrics = {
        dialerEvents: components.metrics.registerCounterGroup('libp2p_websockets_dialer_events_total', {
          label: 'event',
          help: 'Total count of WebSockets dialer events by type',
        }),
      }
    }
  }

  readonly [transportSymbol] = true

  readonly [Symbol.toStringTag] = '@quiet/websockets'

  readonly [serviceCapabilities]: string[] = ['@libp2p/transport']

  async dial(ma: Multiaddr, options: DialTransportOptions<WebSocketsDialEvents>): Promise<Connection> {
    this.log('dialing %s', ma)
    options = options ?? {}

    const socket = await this._connect(ma, options)
    const maConn = socketToMaConn(socket, ma, {
      logger: this.logger,
      metrics: this.metrics?.dialerEvents,
    })
    this.log('new outbound connection %s', maConn.remoteAddr)

    const conn = await options.upgrader.upgradeOutbound(maConn, options)
    this.log('outbound connection %s upgraded', maConn.remoteAddr)
    return conn
  }

  async _connect(ma: Multiaddr, options: DialTransportOptions<WebSocketsDialEvents>): Promise<DuplexWebSocket> {
    options?.signal?.throwIfAborted()

    const cOpts = ma.toOptions()
    this.log('dialing %s:%s', cOpts.host, cOpts.port)

    const errorPromise = pDefer()
    const addr = `${toUri(ma)}/?remoteAddress=${encodeURIComponent(this.init.localAddress)}`
    this.log('CONNECTING TO ADDR', addr)
    const rawSocket = connect(addr, this.init)
    rawSocket.socket.addEventListener('error', errorEvent => {
      // the WebSocket.ErrorEvent type doesn't actually give us any useful
      // information about what happened
      // https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/error_event
      const err = new CodeError(`Could not connect to ${ma.toString()}`, 'ERR_CONNECTION_FAILED')
      this.log.error('connection error:', err, errorEvent.error)
      this.metrics?.dialerEvents.increment({ error: true })
      errorPromise.reject(err)
    })

    try {
      options.onProgress?.(new CustomProgressEvent('websockets:open-connection'))
      await raceSignal(Promise.race([rawSocket.connected(), errorPromise.promise]), options.signal)
    } catch (err: any) {
      if (options.signal?.aborted === true) {
        this.metrics?.dialerEvents.increment({ abort: true })
      }

      rawSocket.close().catch(err => {
        this.log.error('error closing raw socket', err)
      })

      throw err
    }

    this.log('connected %s', ma)
    this.metrics?.dialerEvents.increment({ connect: true })
    return rawSocket
  }

  /**
   * Creates a Websockets listener. The provided `handler` function will be called
   * anytime a new incoming Connection has been successfully upgraded via
   * `upgrader.upgradeInbound`
   */
  createListener(options: CreateListenerOptions): Listener {
    return createListener(
      {
        logger: this.logger,
        metrics: this.components.metrics,
      },
      {
        ...this.init,
        ...options,
        targetPort: this.init.targetPort,
      }
    )
  }

  /**
   * Takes a list of `Multiaddr`s and returns only valid Websockets addresses.
   * By default, in a browser environment only DNS+WSS multiaddr is accepted,
   * while in a Node.js environment DNS+{WS, WSS} multiaddrs are accepted.
   */
  listenFilter(multiaddrs: Multiaddr[]): Multiaddr[] {
    multiaddrs = Array.isArray(multiaddrs) ? multiaddrs : [multiaddrs]

    if (this.init?.filter != null) {
      return this.init?.filter(multiaddrs)
    }

    return filters.all(multiaddrs)
  }

  /**
   * Filter check for all Multiaddrs that this transport can dial
   */
  dialFilter(multiaddrs: Multiaddr[]): Multiaddr[] {
    return this.listenFilter(multiaddrs)
  }
}

export function webSockets(init: WebSocketsInit): (components: WebSocketsComponents) => Transport {
  return components => {
    return new WebSockets(components, init)
  }
}
