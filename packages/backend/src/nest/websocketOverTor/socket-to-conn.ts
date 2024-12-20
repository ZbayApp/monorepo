// Forked from:
// https://github.com/libp2p/js-libp2p/blob/863949482bfa83ac3be2b72a4036ed9315f52d11/packages/transport-websockets/src/socket-to-conn.ts

import { CodeError } from '@libp2p/interface'
import { CLOSE_TIMEOUT } from './constants'
import type { AbortOptions, ComponentLogger, CounterGroup, MultiaddrConnection } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { DuplexWebSocket } from 'it-ws/duplex'

export interface SocketToConnOptions {
  localAddr?: Multiaddr
  logger: ComponentLogger
  metrics?: CounterGroup
  metricPrefix?: string
}

// Convert a stream into a MultiaddrConnection
// https://github.com/libp2p/interface-transport#multiaddrconnection
export function socketToMaConn(
  stream: DuplexWebSocket,
  remoteAddr: Multiaddr,
  options: SocketToConnOptions
): MultiaddrConnection {
  const log = options.logger.forComponent('libp2p:websockets:maconn')
  const metrics = options.metrics
  const metricPrefix = options.metricPrefix ?? ''

  const maConn: MultiaddrConnection = {
    log,

    async sink(source) {
      try {
        await stream.sink(
          (async function* () {
            for await (const buf of source) {
              if (buf instanceof Uint8Array) {
                yield buf
              } else {
                yield buf.subarray()
              }
            }
          })()
        )
      } catch (err: any) {
        if (err.type !== 'aborted') {
          log.error(err)
        }
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

        this.abort(new CodeError('Socket close timeout', 'ERR_SOCKET_CLOSE_TIMEOUT'))
      }

      options.signal?.addEventListener('abort', listener)

      try {
        await stream.close()
      } catch (err: any) {
        log.error('error closing WebSocket gracefully', err)
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

  stream.socket.addEventListener(
    'close',
    () => {
      metrics?.increment({ [`${metricPrefix}close`]: true })

      // In instances where `close` was not explicitly called,
      // such as an iterable stream ending, ensure we have set the close
      // timeline
      if (maConn.timeline.close == null) {
        maConn.timeline.close = Date.now()
      }
    },
    { once: true }
  )

  return maConn
}
