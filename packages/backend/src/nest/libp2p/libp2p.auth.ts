// ISLA: This is what needs to be added to Quiet to make it work Libp2p and LFA work together
import { ComponentLogger, Connection, NewStreamOptions, PeerId, PeerStore, Stream, Topology } from '@libp2p/interface'
import type { ConnectionManager, IncomingStreamData, Registrar } from '@libp2p/interface-internal'
import * as Auth from '@localfirst/auth'
import { pushable, type Pushable } from 'it-pushable'
import { Uint8ArrayList } from 'uint8arraylist'
import { pipe } from 'it-pipe'
import { encode, decode } from 'it-length-prefixed'

import { SigChainService } from '../auth/sigchain.service'
import { AuthEvents, QuietAuthEvents } from './libp2p.types'
import { createLogger } from '../common/logger'
import { createQuietLogger } from '@quiet/logger'
import { ConnectionParams } from '3rd-party/auth/packages/auth/dist/connection/Connection'

const logger = createLogger('libp2p:auth')

export interface Libp2pAuthComponents {
  peerId: PeerId
  peerStore: PeerStore
  registrar: Registrar
  connectionManager: ConnectionManager
  logger: ComponentLogger
}

interface PushableStream {
  stream: Stream
  pushable: Pushable<Uint8Array | Uint8ArrayList>
}

enum JoinStatus {
  PENDING = 'PENDING',
  JOINING = 'JOINING',
  JOINED = 'JOINED',
}

const createLFALogger = createQuietLogger('localfirst:')

export class Libp2pAuth {
  private readonly protocol: string
  private readonly components: Libp2pAuthComponents
  private sigChainService: SigChainService
  private authConnections: Record<string, Auth.Connection>
  private outboundStreamQueue: Pushable<{ peerId: PeerId; connection: Connection }>
  private outboundStreams: Record<string, PushableStream>
  private inboundStreams: Record<string, Stream>
  private restartableAuthConnections: Map<number, Auth.Connection>
  private bufferedConnections: { peerId: PeerId; connection: Connection }[]
  private events: QuietAuthEvents
  private peerId: PeerId
  private joining: boolean = false
  private restartInterval: any
  private unblockInterval: NodeJS.Timeout
  private joinStatus: JoinStatus

  constructor(
    peerId: PeerId,
    sigChainService: SigChainService,
    components: Libp2pAuthComponents,
    events: QuietAuthEvents
  ) {
    this.protocol = '/local-first-auth/1.0.0'
    this.peerId = peerId
    this.components = components
    this.sigChainService = sigChainService
    this.authConnections = {}
    this.restartableAuthConnections = new Map()
    this.outboundStreamQueue = pushable<{ peerId: PeerId; connection: Connection }>({ objectMode: true })
    this.outboundStreams = {}
    this.inboundStreams = {}
    this.bufferedConnections = []
    this.joinStatus = JoinStatus.PENDING
    this.events = events

    logger.info('Auth service initialized')
    logger.info('sigChainService', sigChainService.activeChainTeamName)

    pipe(this.outboundStreamQueue, async source => {
      for await (const { peerId, connection } of source) {
        await this.openOutboundStream(peerId, connection)
      }
    }).catch(e => {
      logger.error('Outbound stream queue error', e)
    })

    this.restartInterval = setInterval(this.restartStoppedConnections, 45_000, this.restartableAuthConnections)
    this.unblockInterval = setInterval(this.unblockConnections, 5_000, this.bufferedConnections, this.joinStatus)
  }
  private restartStoppedConnections(restartableAuthConnections: Map<number, Auth.Connection>) {
    logger.info(`Attempting to restart stopped auth connections`)
    for (const [ms, connection] of restartableAuthConnections.entries()) {
      if (ms >= Date.now()) {
        connection.start()
        restartableAuthConnections.delete(ms)
      }
    }
  }

  private async unblockConnections(conns: { peerId: PeerId; connection: Connection }[], status: JoinStatus) {
    if (status !== JoinStatus.JOINED) return

    logger.info(`Unblocking ${conns.length} connections now that we've joined the chain`)
    while (conns.length > 0) {
      const conn = conns.pop()
      if (conn != null) {
        await this.onPeerConnected(conn.peerId, conn.connection)
      }
    }
  }

  async start() {
    logger.info('Auth service starting')

    const topology: Topology = {
      onConnect: this.onPeerConnected.bind(this),
      onDisconnect: this.onPeerDisconnected.bind(this),
      notifyOnLimitedConnection: false,
    }

    const registrar = this.components.registrar
    await registrar.register(this.protocol, topology)
    await registrar.handle(this.protocol, this.onIncomingStream.bind(this), {
      runOnLimitedConnection: false,
    })
  }

  async stop() {
    // TODO
  }

  private async openOutboundStream(peerId: PeerId, connection: Connection) {
    if (peerId.toString() in this.outboundStreams) {
      return
    }

    logger.info('Opening outbound stream for peer', peerId.toString())
    const outboundStream = await connection.newStream(this.protocol, {
      runOnLimitedConnection: false,
      negotiateFully: true,
    })
    const outboundPushable: Pushable<Uint8Array | Uint8ArrayList> = pushable()
    this.outboundStreams[peerId.toString()] = {
      stream: outboundStream,
      pushable: outboundPushable,
    }

    pipe(outboundPushable, outboundStream).catch((e: Error) =>
      logger.error(`Error opening outbound stream to ${peerId}`, e)
    )

    if (connection.direction === 'outbound') {
      await this.openInboundStream(peerId, connection)
    }

    this.authConnections[peerId.toString()].start()
  }

  private async openInboundStream(peerId: PeerId, connection: Connection) {
    if (peerId.toString() in this.inboundStreams) {
      return
    }

    logger.info('Opening new inbound stream for peer', peerId.toString())
    const inboundStream = await connection.newStream(this.protocol, {
      runOnLimitedConnection: false,
      negotiateFully: true,
    } as NewStreamOptions)

    this.handleIncomingMessages(peerId, inboundStream)
    this.inboundStreams[peerId.toString()] = inboundStream
  }

  private async onIncomingStream({ stream, connection }: IncomingStreamData) {
    const peerId = connection.remotePeer
    logger.info(`Handling existing incoming stream ${peerId.toString()}`)

    const oldStream = this.inboundStreams[peerId.toString()]
    if (oldStream) {
      logger.info(`Old inbound stream found!`)
      await this.closeInboundStream(peerId, true)
    }

    this.handleIncomingMessages(peerId, stream)

    this.inboundStreams[peerId.toString()] = stream
  }

  private handleIncomingMessages(peerId: PeerId, stream: Stream) {
    pipe(
      stream,
      source => decode(source),
      async source => {
        for await (const data of source) {
          try {
            if (!(peerId.toString() in this.authConnections)) {
              logger.error(`No auth connection established for ${peerId.toString()}`)
            } else {
              this.authConnections[peerId.toString()].deliver(data.subarray())
            }
          } catch (e) {
            logger.error(`Error while delivering message to ${peerId}`, e)
          }
        }
      }
    )
  }

  private sendMessage(peerId: PeerId, message: Uint8Array) {
    try {
      this.outboundStreams[peerId.toString()]?.pushable.push(
        // length-prefix encoded
        encode.single(message)
      )
    } catch (e) {
      logger.error(`Error while sending auth message over stream to ${peerId.toString()}`, e)
    }
  }

  // NOTE: This is not awaited by the registrar
  private async onPeerConnected(peerId: PeerId, connection: Connection) {
    if (this.joinStatus === JoinStatus.JOINING) {
      logger.warn(`Connection to ${peerId.toString()} will be buffered due to a concurrent join`)
      this.bufferedConnections.push({ peerId, connection })
      return
    }

    if (this.joinStatus === JoinStatus.PENDING) {
      this.joinStatus = JoinStatus.JOINING
    }

    logger.info(`Peer connected (direction = ${connection.direction})!`)

    // https://github.com/ChainSafe/js-libp2p-gossipsub/issues/398
    if (connection.status !== 'open') {
      logger.warn(`The connection with ${peerId.toString()} was not in an open state!`)
      return
    }

    const context = this.sigChainService.getActiveChain().context

    if (peerId.toString() in this.authConnections) {
      logger.info(`A connection with ${peerId.toString()} was already available, skipping connection initialization!`)
      return
    }

    const authConnection = new Auth.Connection({
      context,
      sendMessage: (message: Uint8Array) => {
        this.sendMessage(peerId, message)
      },
      createLogger: createLFALogger,
    } as ConnectionParams)

    const handleAuthConnErrors = (error: Auth.ConnectionErrorPayload, remoteUsername: string | undefined) => {
      logger.error(`Got an error while handling auth connection with ${remoteUsername}`, JSON.stringify(error))
      if (error.type === 'TIMEOUT') {
        this.events.emit(AuthEvents.AUTH_TIMEOUT, { peerId, remoteUsername })
      } else if (error.type === 'DEVICE_UNKNOWN') {
        this.events.emit(AuthEvents.MISSING_DEVICE, { peerId, remoteUsername })
      }
    }

    // TODO: Listen for updates to context and update context in storage
    authConnection.on('joined', payload => {
      const { team, user } = payload
      const sigChain = this.sigChainService.getActiveChain()
      logger.info(`${sigChain.localUserContext.user.userId}: Joined team ${team.teamName} (userid: ${user.userId})!`)
      if (sigChain.team == null && !this.joining) {
        this.joining = true
        logger.info(
          `${user.userId}: Creating SigChain for user with name ${user.userName} and team name ${team.teamName}`
        )
        logger.info(`${user.userId}: Updating auth context`)

        sigChain.context = {
          ...sigChain.context,
          team,
          user,
        } as Auth.MemberContext
        sigChain.team = team
        this.joining = false
      }
      if (this.joinStatus === JoinStatus.JOINING) {
        this.joinStatus = JoinStatus.JOINED
        this.unblockConnections(this.bufferedConnections, this.joinStatus)
      }
      this.events.emit(AuthEvents.INITIALIZED_CHAIN)
    })

    authConnection.on('localError', error => {
      handleAuthConnErrors(error, authConnection._context.userName)
    })

    authConnection.on('remoteError', error => {
      handleAuthConnErrors(error, authConnection._context.userName)
    })

    authConnection.on('connected', () => {
      logger.info(`LFA Connected!`)
      if (this.sigChainService.activeChainTeamName != null) {
        logger.debug(`Sending sync message because our chain is intialized`)
        const sigChain = this.sigChainService.getActiveChain()
        const team = sigChain.team
        const user = sigChain.localUserContext.user
        authConnection.emit('sync', { team, user })
      }
    })

    authConnection.on('disconnected', event => {
      logger.info(`LFA Disconnected!`, event)
      authConnection.stop()
      this.restartableAuthConnections.set(Date.now() + 30_000, authConnection)
    })

    this.authConnections[peerId.toString()] = authConnection

    this.outboundStreamQueue.push({ peerId, connection })
  }

  private async onPeerDisconnected(peerId: PeerId) {
    logger.warn(`Disconnecting auth connection with peer ${peerId.toString()}`)
    await this.closeAuthConnection(peerId)
  }

  private async closeOutboundStream(peerId: PeerId, deleteRecord?: boolean) {
    logger.warn(`Closing outbound stream with ${peerId.toString()}`)
    const outboundStream = this.outboundStreams[peerId.toString()]

    if (outboundStream == null) {
      logger.warn(`Can't close outbound stream with ${peerId.toString()} as it doesn't exist`)
      return
    }

    await outboundStream.pushable.end().onEmpty()
    await outboundStream.stream.close().catch(e => {
      outboundStream.stream.abort(e)
    })

    if (deleteRecord) {
      delete this.outboundStreams[peerId.toString()]
    }
  }

  private async closeInboundStream(peerId: PeerId, deleteRecord?: boolean) {
    logger.warn(`Closing inbound stream with ${peerId.toString()}`)
    const inboundStream = this.inboundStreams[peerId.toString()]

    if (inboundStream == null) {
      logger.warn(`Can't close inbound stream with ${peerId.toString()} as it doesn't exist`)
      return
    }

    await inboundStream.close().catch(e => {
      inboundStream.abort(e)
    })

    if (deleteRecord) {
      delete this.inboundStreams[peerId.toString()]
    }
  }

  private async closeAuthConnection(peerId: PeerId) {
    logger.warn(`Closing auth connection with ${peerId.toString()}`)
    const connection = this.authConnections[peerId.toString()]

    if (connection == null) {
      logger.warn(`Can't close auth connection with ${peerId.toString()} as it doesn't exist`)
    } else {
      connection.stop()
      delete this.authConnections[peerId.toString()]
    }

    await this.closeOutboundStream(peerId, true)
    await this.closeInboundStream(peerId, true)
  }
}

export const libp2pAuth = (
  peerId: PeerId,
  sigChainService: SigChainService,
  events: QuietAuthEvents
): ((components: Libp2pAuthComponents) => Libp2pAuth) => {
  return (components: Libp2pAuthComponents) => new Libp2pAuth(peerId, sigChainService, components, events)
}
