import {
  ComponentLogger,
  Connection,
  NewStreamOptions,
  PeerId,
  PeerStore,
  serviceCapabilities,
  serviceDependencies,
  Stream,
  Topology,
} from '@libp2p/interface'
import type { ConnectionManager, IncomingStreamData, Registrar } from '@libp2p/interface-internal'
import * as Auth from '@localfirst/auth'
import { pushable, type Pushable } from 'it-pushable'
import { Uint8ArrayList } from 'uint8arraylist'
import { pipe } from 'it-pipe'
import { encode, decode } from 'it-length-prefixed'

import { SigChainService } from '../auth/sigchain.service'
import { createLogger } from '../common/logger'
import { createQuietLogger } from '@quiet/logger'
import { ConnectionParams } from '3rd-party/auth/packages/auth/dist/connection/Connection'
import { Libp2pService } from './libp2p.service'
import { Libp2pEvents } from './libp2p.types'

export interface Libp2pAuthComponents {
  peerId: PeerId
  peerStore: PeerStore
  registrar: Registrar
  connectionManager: ConnectionManager
  logger: ComponentLogger
}

export interface Libp2pAuthStatus {
  started: boolean
  joining: boolean
}

export interface PushableStream {
  stream: Stream
  pushable: Pushable<Uint8Array | Uint8ArrayList>
}

enum JoinStatus {
  PENDING = 'PENDING',
  JOINING = 'JOINING',
  JOINED = 'JOINED',
}

const createLFALogger = createQuietLogger('localfirst')

export class Libp2pAuth {
  private readonly protocol: string
  private readonly components: Libp2pAuthComponents
  private sigChainService: SigChainService
  private libp2pService: Libp2pService
  private authConnections: Record<string, Auth.Connection>
  private outboundStreamQueue: Pushable<{ peerId: PeerId; connection: Connection }>
  private outboundStreams: Record<string, PushableStream>
  private inboundStreams: Record<string, Stream>
  private bufferedConnections: { peerId: PeerId; connection: Connection }[]
  private joining: boolean = false
  private unblockInterval: NodeJS.Timeout
  private joinStatus: JoinStatus
  private logger: ReturnType<typeof createLogger> = createLogger('libp2p:auth')
  readonly [serviceCapabilities]: string[] = ['@quiet/auth']
  readonly [serviceDependencies]: string[] = ['@libp2p/identify']
  readonly [Symbol.toStringTag]: string = 'lfaAuth'

  constructor(sigChainService: SigChainService, libp2pService: Libp2pService, components: Libp2pAuthComponents) {
    this.protocol = '/local-first-auth/1.0.0'
    this.components = components
    this.sigChainService = sigChainService
    this.libp2pService = libp2pService
    this.authConnections = {}
    this.outboundStreamQueue = pushable<{ peerId: PeerId; connection: Connection }>({ objectMode: true })
    this.outboundStreams = {}
    this.inboundStreams = {}
    this.bufferedConnections = []
    this.joinStatus = JoinStatus.PENDING
    this.logger = this.logger.extend(sigChainService.getActiveChain().localUserContext.user.userName)

    this.logger.info('Auth service initialized')
    this.logger.info('sigChainService', sigChainService.activeChainTeamName)

    pipe(this.outboundStreamQueue, async source => {
      for await (const { peerId, connection } of source) {
        await this.openOutboundStream(peerId, connection)
      }
    }).catch(e => {
      this.logger.error('Outbound stream queue error', e)
    })

    this.unblockInterval = setInterval(this.unblockConnections, 5_000, this.bufferedConnections, this.joinStatus)
  }

  private emit(eventName: string, ...args: any[]) {
    this.libp2pService.emit(eventName, ...args)
  }

  private async unblockConnections(conns: { peerId: PeerId; connection: Connection }[], status: JoinStatus) {
    if (status !== JoinStatus.JOINED) return

    this.logger.info(`Unblocking ${conns.length} connections now that we've joined the chain`)
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
      notifyOnLimitedConnection: false,
    }

    const registrar = this.components.registrar
    await registrar.register(this.protocol, topology)
    await registrar.handle(this.protocol, this.onIncomingStream.bind(this), {
      runOnLimitedConnection: false,
    })
  }

  async stop() {
    this.logger.info('Stopping Libp2pAuth service')

    // Clear the unblock interval
    clearInterval(this.unblockInterval)

    // End the outbound stream queue to prevent further pushes
    this.outboundStreamQueue.end()

    // Close all outbound streams
    for (const peerId in this.outboundStreams) {
      await this.closeOutboundStream(peerId, true)
    }

    // Close all inbound streams
    for (const peerId in this.inboundStreams) {
      await this.closeInboundStream(peerId, true)
    }

    // Clear buffered connections
    this.bufferedConnections = []

    // Clear auth connections
    this.authConnections = {}

    this.logger.info('Libp2pAuth service stopped')
  }

  private async openOutboundStream(peerId: PeerId, connection: Connection) {
    if (peerId.toString() in this.outboundStreams) {
      return
    }

    this.logger.info('Opening outbound stream for peer', peerId.toString())
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
      runOnLimitedConnection: false,
      negotiateFully: true,
    } as NewStreamOptions)

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

    this.logger.info(`Peer connected (direction = ${connection.direction})! (status = ${connection.status})`)

    // https://github.com/ChainSafe/js-libp2p-gossipsub/issues/398
    if (connection.status !== 'open') {
      this.logger.warn(`The connection with ${peerId.toString()} was not in an open state!`)
      return
    }

    const context = this.sigChainService.getActiveChain().context

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
    } as ConnectionParams)

    authConnection.on('connected', () => {
      if (this.sigChainService.activeChainTeamName != null) {
        this.logger.debug(`Sending sync message because our chain is intialized`)
        const sigChain = this.sigChainService.getActiveChain()
        const team = sigChain.team
        const user = sigChain.localUserContext.user
        authConnection.emit('sync', { team, user })
      }
      this.emit(Libp2pEvents.AUTH_CONNECTED)
    })

    authConnection.on('disconnected', event => {
      this.logger.info(`LFA Disconnected!`, event)
      this.emit(Libp2pEvents.AUTH_DISCONNECTED)
    })

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
      this.emit(Libp2pEvents.AUTH_JOINED)
    })

    authConnection.on('change', payload => {
      this.emit(Libp2pEvents.AUTH_STATE_CHANGED, payload)
    })

    authConnection.on('updated', head => {
      this.logger.info('Received sync message, team graph updated', head)
    })

    // handle errors detected locally and reported to the peer
    authConnection.on('localError', error => {
      switch (error.type) {
        case Auth.connection.DEVICE_REMOVED:
        case Auth.connection.DEVICE_UNKNOWN:
        case Auth.connection.MEMBER_REMOVED:
        case Auth.connection.SERVER_REMOVED:
          this.emit(Libp2pEvents.AUTH_PEER_REMOVED, error, peerId)
          break
        case Auth.connection.IDENTITY_PROOF_INVALID:
        case Auth.connection.INVITATION_PROOF_INVALID:
        case Auth.connection.JOINED_WRONG_TEAM:
          this.emit(Libp2pEvents.AUTH_PEER_INVALID, error, peerId)
          break
        case Auth.connection.NEITHER_IS_MEMBER:
          this.emit(Libp2pEvents.AUTH_PEER_CANNOT_ADMIT, error)
          break
        case Auth.connection.TIMEOUT:
          this.emit(Libp2pEvents.AUTH_TIMEOUT, error)
          break
        default:
          this.emit(Libp2pEvents.AUTH_ERROR, error)
          break
      }
    })

    // handle errors sent by the peer
    authConnection.on('remoteError', error => {
      switch (error.type) {
        case Auth.connection.DEVICE_REMOVED:
        case Auth.connection.DEVICE_UNKNOWN:
        case Auth.connection.MEMBER_REMOVED:
        case Auth.connection.SERVER_REMOVED:
          this.emit(Libp2pEvents.AUTH_REMOVED, error)
          break
        case Auth.connection.IDENTITY_PROOF_INVALID:
        case Auth.connection.INVITATION_PROOF_INVALID:
        case Auth.connection.JOINED_WRONG_TEAM:
          this.emit(Libp2pEvents.AUTH_INVALID_PROOF, error)
          break
        case Auth.connection.TIMEOUT:
          this.emit(Libp2pEvents.AUTH_TIMEOUT, error)
          break
        default:
          this.emit(Libp2pEvents.AUTH_ERROR, error)
          break
      }
    })

    this.authConnections[peerId.toString()] = authConnection

    this.outboundStreamQueue.push({ peerId, connection })
  }

  private async onPeerDisconnected(peerId: PeerId) {
    this.logger.warn(`Disconnecting auth connection with peer ${peerId.toString()}`)
    await this.closeAuthConnection(peerId)
  }

  private async closeOutboundStream(peerId: PeerId | string, deleteRecord?: boolean) {
    this.logger.warn(`Closing outbound stream with ${peerId.toString()}`)
    const outboundStream = this.outboundStreams[peerId.toString()]

    if (outboundStream == null) {
      this.logger.warn(`Can't close outbound stream with ${peerId.toString()} as it doesn't exist`)
      return
    }

    await outboundStream.pushable.end()
    await outboundStream.stream.close().catch(e => {
      outboundStream.stream.abort(e)
    })

    if (deleteRecord) {
      delete this.outboundStreams[peerId.toString()]
    }
  }

  private async closeInboundStream(peerId: PeerId | string, deleteRecord?: boolean) {
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
  sigChainService: SigChainService,
  libp2pService: Libp2pService
): ((components: Libp2pAuthComponents) => Libp2pAuth) => {
  return (components: Libp2pAuthComponents) => new Libp2pAuth(sigChainService, libp2pService, components)
}
