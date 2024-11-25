import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import {
  SocketActionTypes,
  type CreateChannelPayload,
  type CreateChannelResponse,
  SendMessagePayload,
  UploadFilePayload,
  DownloadFilePayload,
  CancelDownloadPayload,
  GetMessagesPayload,
  ConnectionProcessInfo,
  InitCommunityPayload,
  Community,
  DeleteFilesFromChannelSocketPayload,
  SaveCSRPayload,
  type UserProfile,
  type DeleteChannelResponse,
  type MessagesLoadedPayload,
  type NetworkInfo,
  Identity,
} from '@quiet/types'
import EventEmitter from 'events'
import { CONFIG_OPTIONS, SERVER_IO_PROVIDER } from '../const'
import { ConfigOptions, ServerIoProviderTypes } from '../types'
import { suspendableSocketEvents } from './suspendable.events'
import { createLogger } from '../common/logger'
import type net from 'node:net'

@Injectable()
export class SocketService extends EventEmitter implements OnModuleInit {
  private readonly logger = createLogger(SocketService.name)

  public resolveReadyness: (value: void | PromiseLike<void>) => void
  public readyness: Promise<void>
  private sockets: Set<net.Socket>

  constructor(
    @Inject(SERVER_IO_PROVIDER) public readonly serverIoProvider: ServerIoProviderTypes,
    @Inject(CONFIG_OPTIONS) public readonly configOptions: ConfigOptions
  ) {
    super()

    this.readyness = new Promise<void>(resolve => {
      this.resolveReadyness = resolve
    })

    this.sockets = new Set<net.Socket>()

    this.attachListeners()
  }

  async onModuleInit() {
    this.logger.info('init: Started')
    await this.init()
    this.logger.info('init: Finished')
  }

  public async init() {
    const connection = new Promise<void>(resolve => {
      this.serverIoProvider.io.on(SocketActionTypes.CONNECTION, socket => {
        socket.on(SocketActionTypes.START, async () => {
          resolve()
        })
      })
    })

    await this.listen()

    this.logger.info('init: Waiting for frontend to connect')
    await connection
    this.logger.info('init: Frontend connected')
  }

  private readonly attachListeners = () => {
    this.logger.info('Attaching listeners')

    // Attach listeners here
    this.serverIoProvider.io.on(SocketActionTypes.CONNECTION, socket => {
      this.logger.info('Socket connection')

      // On websocket connection, update presentation service with network data
      this.emit(SocketActionTypes.CONNECTION)

      socket.on(SocketActionTypes.CLOSE, async () => {
        this.logger.info('Socket connection closed')
        this.emit(SocketActionTypes.CLOSE)
      })

      socket.use(async (event, next) => {
        const type = event[0]
        if (suspendableSocketEvents.includes(type)) {
          this.logger.info('Awaiting readyness before emitting: ', type)
          await this.readyness
        }
        next()
      })

      // ====== Channels =====
      socket.on(
        SocketActionTypes.CREATE_CHANNEL,
        (payload: CreateChannelPayload, callback: (response: CreateChannelResponse) => void) => {
          this.emit(SocketActionTypes.CREATE_CHANNEL, payload, callback)
        }
      )

      socket.on(
        SocketActionTypes.DELETE_CHANNEL,
        async (
          payload: { channelId: string; ownerPeerId: string },
          callback: (response: DeleteChannelResponse) => void
        ) => {
          this.emit(SocketActionTypes.DELETE_CHANNEL, payload, callback)
        }
      )

      // ====== Messages ======
      socket.on(SocketActionTypes.SEND_MESSAGE, async (payload: SendMessagePayload) => {
        this.emit(SocketActionTypes.SEND_MESSAGE, payload)
      })

      socket.on(
        SocketActionTypes.GET_MESSAGES,
        (payload: GetMessagesPayload, callback: (response?: MessagesLoadedPayload) => void) => {
          this.emit(SocketActionTypes.GET_MESSAGES, payload, callback)
        }
      )

      // ====== Files ======
      socket.on(SocketActionTypes.UPLOAD_FILE, async (payload: UploadFilePayload) => {
        this.emit(SocketActionTypes.UPLOAD_FILE, payload.file)
      })

      socket.on(SocketActionTypes.DOWNLOAD_FILE, async (payload: DownloadFilePayload) => {
        this.emit(SocketActionTypes.DOWNLOAD_FILE, payload.metadata)
      })

      socket.on(SocketActionTypes.CANCEL_DOWNLOAD, async (payload: CancelDownloadPayload) => {
        this.emit(SocketActionTypes.CANCEL_DOWNLOAD, payload.mid)
      })

      socket.on(SocketActionTypes.DELETE_FILES_FROM_CHANNEL, async (payload: DeleteFilesFromChannelSocketPayload) => {
        this.emit(SocketActionTypes.DELETE_FILES_FROM_CHANNEL, payload)
      })

      // ====== Certificates ======
      socket.on(SocketActionTypes.ADD_CSR, async (payload: SaveCSRPayload) => {
        this.logger.info(`On ${SocketActionTypes.ADD_CSR}`)

        this.emit(SocketActionTypes.ADD_CSR, payload)
      })

      // ====== Community ======
      socket.on(
        SocketActionTypes.CREATE_COMMUNITY,
        async (payload: InitCommunityPayload, callback: (response: Community | undefined) => void) => {
          this.logger.info(`Creating community`, payload.id)
          this.emit(SocketActionTypes.CREATE_COMMUNITY, payload, callback)
        }
      )

      socket.on(
        SocketActionTypes.LAUNCH_COMMUNITY,
        async (payload: InitCommunityPayload, callback: (response: Community | undefined) => void) => {
          this.logger.info(`Launching community ${payload.id}`)
          this.emit(SocketActionTypes.LAUNCH_COMMUNITY, payload, callback)
          this.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, ConnectionProcessInfo.LAUNCHING_COMMUNITY)
        }
      )

      socket.on(
        SocketActionTypes.CREATE_NETWORK,
        async (communityId: string, callback: (response: NetworkInfo | undefined) => void) => {
          this.logger.info(`Creating network for community ${communityId}`)
          this.emit(SocketActionTypes.CREATE_NETWORK, communityId, callback)
        }
      )
      socket.on(
        SocketActionTypes.CREATE_IDENTITY,
        async (communityId: string, callback: (response: Identity | undefined) => void) => {
          this.logger.info(`Creating identity for community ${communityId}`)
          this.emit(SocketActionTypes.CREATE_IDENTITY, communityId, callback)
        }
      )
      socket.on(
        SocketActionTypes.CREATE_USER_CSR,
        async (payload: { id: string; nickname: string }, callback: (response: Identity | undefined) => void) => {
          this.logger.info(`Creating user CSR for community ${payload}`)
          this.emit(SocketActionTypes.CREATE_USER_CSR, payload, callback)
        }
      )

      socket.on(SocketActionTypes.LEAVE_COMMUNITY, (callback: (closed: boolean) => void) => {
        this.logger.info('Leaving community')
        this.emit(SocketActionTypes.LEAVE_COMMUNITY, callback)
      })

      socket.on(SocketActionTypes.LIBP2P_PSK_STORED, payload => {
        this.logger.info('Saving PSK', payload)
        this.emit(SocketActionTypes.LIBP2P_PSK_STORED, payload)
      })

      // ====== Users ======

      socket.on(SocketActionTypes.SET_USER_PROFILE, (profile: UserProfile) => {
        this.emit(SocketActionTypes.SET_USER_PROFILE, profile)
      })

      // ====== Misc ======

      socket.on(SocketActionTypes.LOAD_MIGRATION_DATA, async (data: Record<string, any>) => {
        this.emit(SocketActionTypes.LOAD_MIGRATION_DATA, data)
      })
    })

    // Ensure the underlying connections get closed. See:
    // https://github.com/socketio/socket.io/issues/1602
    this.serverIoProvider.server.on('connection', conn => {
      this.sockets.add(conn)
      conn.on('close', () => {
        this.sockets.delete(conn)
      })
    })
  }

  public getConnections = (): Promise<number> => {
    return new Promise(resolve => {
      this.serverIoProvider.server.getConnections((err, count) => {
        if (err) throw new Error(err.message)
        resolve(count)
      })
    })
  }

  // Ensure the underlying connections get closed. See:
  // https://github.com/socketio/socket.io/issues/1602
  //
  // I also tried `this.serverIoProvider.io.disconnectSockets(true)`
  // which didn't work for me, but we still call it.
  public closeSockets = () => {
    this.logger.info('Disconnecting sockets')
    this.serverIoProvider.io.disconnectSockets(true)
    this.sockets.forEach(s => s.destroy())
  }

  public listen = async (): Promise<void> => {
    this.logger.info(`Opening data server on port ${this.configOptions.socketIOPort}`)

    if (this.serverIoProvider.server.listening) {
      this.logger.warn('Failed to listen. Server already listening.')
      return
    }

    const numConnections = await this.getConnections()

    if (numConnections > 0) {
      this.logger.warn('Failed to listen. Connections still open:', numConnections)
      return
    }

    return new Promise(resolve => {
      this.serverIoProvider.server.listen(this.configOptions.socketIOPort, '127.0.0.1', () => {
        this.logger.info(`Data server running on port ${this.configOptions.socketIOPort}`)
        resolve()
      })
    })
  }

  public close = (): Promise<void> => {
    return new Promise(resolve => {
      this.logger.info(`Closing data server on port ${this.configOptions.socketIOPort}`)

      if (!this.serverIoProvider.server.listening) {
        this.logger.warn('Data server is not running.')
        resolve()
        return
      }

      this.serverIoProvider.io.close(err => {
        if (err) throw new Error(err.message)
        this.logger.info('Data server closed')
        resolve()
      })

      this.closeSockets()
    })
  }
}
