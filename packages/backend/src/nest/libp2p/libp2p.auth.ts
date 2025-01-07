// ISLA: This is what needs to be added to Quiet to make it work Libp2p and LFA work together
import { ComponentLogger, Connection, PeerId, PeerStore, Stream, Topology } from '@libp2p/interface'
import type { ConnectionManager, IncomingStreamData, Registrar } from '@libp2p/interface-internal'
import * as Auth from '@localfirst/auth'
import { pushable, type Pushable } from 'it-pushable'
import { Uint8ArrayList } from 'uint8arraylist'
import { pipe } from 'it-pipe'
import { encode, decode } from 'it-length-prefixed'

import { SigChainService } from '../auth/sigchain.service.js'
import { AuthEvents, QuietAuthEvents } from './libp2p.types.js'
import { createLogger } from '../common/logger.js'
import { createQuietLogger } from '@quiet/logger'

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
  private logger: ReturnType<typeof createLogger>
  private authContext: Auth.Context

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
    this.logger = createLogger(`libp2p:auth:${peerId}`)

    pipe(this.outboundStreamQueue, async source => {
      for await (const { peerId, connection } of source) {
        await this.openOutboundStream(peerId, connection)
      }
    }).catch(e => {
      this.logger.error('Outbound stream queue error', e)
    })

    this.restartInterval = setInterval(
      this.restartStoppedConnections,
      45_000,
      this.restartableAuthConnections,
      this.logger
    )
    this.unblockInterval = setInterval(
      this.unblockConnections,
      5_000,
      this.bufferedConnections,
      this.joinStatus,
      this.logger
    )
  }

  private restartStoppedConnections(restartableAuthConnections: Map<number, Auth.Connection>) {
    this.logger.info(`Attempting to restart stopped auth connections`)
    for (const [ms, connection] of restartableAuthConnections.entries()) {
      if (ms >= Date.now()) {
        connection.start()
        restartableAuthConnections.delete(ms)
      }
    }
  }

  private async unblockConnections(
    conns: { peerId: PeerId; connection: Connection }[],
    status: JoinStatus,
    logger: ReturnType<typeof createLogger>
  ) {
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
    this.logger.info('Auth service starting')

    const topology: Topology = {
      onConnect: this.onPeerConnected.bind(this),
      onDisconnect: this.onPeerDisconnected.bind(this),
      notifyOnTransient: false,
    }

    const registrar = this.components.registrar
    await registrar.register(this.protocol, topology)
    await registrar.handle(this.protocol, this.onIncomingStream.bind(this), {
      runOnTransientConnection: false,
    })
  }

  async stop() {
    // TODO
  }

  private async openOutboundStream(peerId: PeerId, connection: Connection) {
    if (peerId.toString() in this.outboundStreams) {
      return
    }

    this.logger.info('Opening outbound stream for peer', peerId.toString())
    const outboundStream = await connection.newStream(this.protocol, {
      runOnTransientConnection: false,
      negotiateFully: true,
    })
    const outboundPushable: Pushable<Uint8Array | Uint8ArrayList> = pushable()
    this.outboundStreams[peerId.toString()] = {
      stream: outboundStream,
      pushable: outboundPushable,
    }

    pipe(outboundPushable, outboundStream).catch((e: Error) =>
      this.logger.error(`Error opening outbound stream to ${peerId}`, e)
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

    this.logger.info('Opening new inbound stream for peer', peerId.toString())
    const inboundStream = await connection.newStream(this.protocol, {
      runOnTransientConnection: false,
      negotiateFully: true,
    })

    this.handleIncomingMessages(peerId, inboundStream)
    this.inboundStreams[peerId.toString()] = inboundStream
  }

  private async onIncomingStream({ stream, connection }: IncomingStreamData) {
    const peerId = connection.remotePeer
    this.logger.info(`Handling existing incoming stream ${peerId.toString()}`)

    const oldStream = this.inboundStreams[peerId.toString()]
    if (oldStream) {
      this.logger.info(`Old inbound stream found!`)
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
              this.logger.error(`No auth connection established for ${peerId.toString()}`)
            } else {
              this.authConnections[peerId.toString()].deliver(data.subarray())
            }
          } catch (e) {
            this.logger.error(`Error while delivering message to ${peerId}`, e)
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
      this.logger.error(`Error while sending auth message over stream to ${peerId.toString()}`, e)
    }
  }

  // NOTE: This is not awaited by the registrar
  private async onPeerConnected(peerId: PeerId, connection: Connection) {
    if (this.joinStatus === JoinStatus.JOINING) {
      this.logger.warn(`Connection to ${peerId.toString()} will be buffered due to a concurrent join`)
      this.bufferedConnections.push({ peerId, connection })
      return
    }

    if (this.joinStatus === JoinStatus.PENDING) {
      this.joinStatus = JoinStatus.JOINING
    }

    this.logger.info(`Peer connected (direction = ${connection.direction})!`)

    // https://github.com/ChainSafe/js-libp2p-gossipsub/issues/398
    if (connection.status !== 'open') {
      this.logger.warn(`The connection with ${peerId.toString()} was not in an open state!`)
      return
    }

    const context = this.authContext
    this.logger.info(
      `Context with ${peerId.toString()} is a member context?: ${(context as Auth.InviteeMemberContext).invitationSeed == null}`
    )
    if (!context) {
      throw new Error('Auth context required to connect to peer')
    }

    if (peerId.toString() in this.authConnections) {
      this.logger.info(
        `A connection with ${peerId.toString()} was already available, skipping connection initialization!`
      )
      return
    }

    const authConnection = new Auth.Connection({
      context,
      sendMessage: (message: Uint8Array) => {
        this.sendMessage(peerId, message)
      },
      createLogger: createLFALogger,
    })

    const handleAuthConnErrors = (error: Auth.ConnectionErrorPayload, remoteUsername: string | undefined) => {
      this.logger.error(`Got an error while handling auth connection with ${remoteUsername}`, JSON.stringify(error))
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
      this.logger.info(
        `${sigChain.localUserContext.user.userId}: Joined team ${team.teamName} (userid: ${user.userId})!`
      )
      if (sigChain.team == null && !this.joining) {
        this.joining = true
        this.logger.info(
          `${user.userId}: Creating SigChain for user with name ${user.userName} and team name ${team.teamName}`
        )
        this.logger.info(`${user.userId}: Updating auth context`)
        this.sigChainService.getActiveChain().context = {
          ...this.sigChainService.getActiveChain().context,
          team,
          user,
        } as Auth.MemberContext
        this.joining = false
      }
      if (this.joinStatus === JoinStatus.JOINING) {
        this.joinStatus = JoinStatus.JOINED
        this.unblockConnections(this.bufferedConnections, this.joinStatus, this.logger)
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
      this.logger.info(`LFA Connected!`)
      if (this.sigChainService.activeChainTeamName != null) {
        this.logger.debug(`Sending sync message because our chain is intialized`)
        const sigChain = this.sigChainService.getActiveChain()
        const team = sigChain.team
        const user = sigChain.localUserContext.user
        authConnection.emit('sync', { team, user })
      }
    })

    authConnection.on('disconnected', event => {
      this.logger.info(`LFA Disconnected!`, event)
      authConnection.stop()
      this.restartableAuthConnections.set(Date.now() + 30_000, authConnection)
    })

    this.authConnections[peerId.toString()] = authConnection

    this.outboundStreamQueue.push({ peerId, connection })
  }

  private async onPeerDisconnected(peerId: PeerId) {
    this.logger.warn(`Disconnecting auth connection with peer ${peerId.toString()}`)
    await this.closeAuthConnection(peerId)
  }

  private async closeOutboundStream(peerId: PeerId, deleteRecord?: boolean) {
    this.logger.warn(`Closing outbound stream with ${peerId.toString()}`)
    const outboundStream = this.outboundStreams[peerId.toString()]

    if (outboundStream == null) {
      this.logger.warn(`Can't close outbound stream with ${peerId.toString()} as it doesn't exist`)
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
    this.logger.warn(`Closing inbound stream with ${peerId.toString()}`)
    const inboundStream = this.inboundStreams[peerId.toString()]

    if (inboundStream == null) {
      this.logger.warn(`Can't close inbound stream with ${peerId.toString()} as it doesn't exist`)
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
    this.logger.warn(`Closing auth connection with ${peerId.toString()}`)
    const connection = this.authConnections[peerId.toString()]

    if (connection == null) {
      this.logger.warn(`Can't close auth connection with ${peerId.toString()} as it doesn't exist`)
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
