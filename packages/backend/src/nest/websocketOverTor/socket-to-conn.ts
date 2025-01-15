// Forked from:
// https://github.com/libp2p/js-libp2p/blob/863949482bfa83ac3be2b72a4036ed9315f52d11/packages/transport-websockets/src/socket-to-conn.ts

import { AbortError, TimeoutError } from '@libp2p/interface'
import { CLOSE_TIMEOUT, SocketCloseCode } from './constants'
import type { AbortOptions, ComponentLogger, CounterGroup, MultiaddrConnection } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { DuplexWebSocket } from 'it-ws/duplex'
import { CloseEvent, ErrorEvent, MessageEvent, WebSocket } from 'ws'
import { abortableAsyncIterable } from '../common/utils'
import { Uint8ArrayList } from 'uint8arraylist'
import { Source } from 'it-stream-types'

export interface SocketToConnOptions {
  localAddr?: Multiaddr
  logger: ComponentLogger
  metrics?: CounterGroup
  metricPrefix?: string
  signal?: AbortSignal
}

// Convert a stream into a MultiaddrConnection
// https://github.com/libp2p/interface-transport#multiaddrconnection
export function socketToMaConn(
  stream: DuplexWebSocket,
  remoteAddr: Multiaddr,
  options: SocketToConnOptions
): MultiaddrConnection {
  const log = options.logger.forComponent(`libp2p:websockets:maconn:${remoteAddr.getPeerId()}`)
  const metrics = options.metrics
  const metricPrefix = options.metricPrefix ?? ''
  stream.source = abortableAsyncIterable(stream.source, options.signal)

  const generateSink = (
    source: AsyncGenerator<Uint8Array | Uint8ArrayList, any, unknown>
  ): AsyncGenerator<Uint8Array, any, unknown> =>
    (async function* () {
      for await (const buf of source) {
        if (buf instanceof Uint8Array) {
          yield buf
        } else {
          yield buf.subarray()
        }
      }
    })()

  const maConn: MultiaddrConnection = {
    log,

    async sink(source) {
      try {
        await stream.sink(generateSink(source))
      } catch (err: any) {
        log.error(`Error on sink`, err)
      }
    },

    source: stream.source,

    remoteAddr,

    timeline: { open: Date.now() },

    async close(options: AbortOptions = {}) {
      const start = Date.now()

      if (options.signal == null) {
        const signal = AbortSignal.timeout(CLOSE_TIMEOUT)

        options = {
          ...options,
          signal,
        }
      }

      const listener = (): void => {
        const { host, port } = maConn.remoteAddr.toOptions()
        log('timeout closing stream to %s:%s after %dms, destroying it manually', host, port, Date.now() - start)

        this.abort(new TimeoutError('Socket close timeout'))
      }

      options.signal?.addEventListener('abort', listener)

      try {
        await stream.close()
      } catch (err: any) {
        log.error('Error closing WebSocket gracefully', err)
        this.abort(err)
      } finally {
        options.signal?.removeEventListener('abort', listener)
        maConn.timeline.close = Date.now()
      }
    },

    abort(err: Error): void {
      const { host, port } = maConn.remoteAddr.toOptions()
      log('timeout closing stream to %s:%s due to error', host, port, err)

      stream.destroy()
      maConn.timeline.close = Date.now()

      // ws WebSocket.terminate does not accept an Error arg to emit an 'error'
      // event on destroy like other node streams so we can't update a metric
      // with an event listener
      // https://github.com/websockets/ws/issues/1752#issuecomment-622380981
      metrics?.increment({ [`${metricPrefix}error`]: true })
    },
  }

  stream.socket.onerror = (errorEvent: ErrorEvent) => {
    log.error(`Error on socket: ${errorEvent.message}`, errorEvent.error)
  }

  stream.socket.onclose = (closeEvent: CloseEvent) => {
    switch (closeEvent.code) {
      case SocketCloseCode.ERROR:
      case SocketCloseCode.INVALID_DATA:
        log.error(`Socket is closing with code ${closeEvent.code} due to error`, closeEvent.reason)
        break
      case SocketCloseCode.NORMAL:
      case SocketCloseCode.GO_AWAY:
      case SocketCloseCode.UNDEFINED:
      default:
        break
    }

    metrics?.increment({ [`${metricPrefix}close`]: true })

    // In instances where `close` was not explicitly called,
    // such as an iterable stream ending, ensure we have set the close
    // timeline
    if (maConn.timeline.close == null) {
      maConn.timeline.close = Date.now()
    }
  }

  return maConn
}
