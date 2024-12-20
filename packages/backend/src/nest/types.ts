import { IncomingMessage, ServerResponse, Server } from 'http'
import { DefaultEventsMap } from 'socket.io/dist/typed-events'
import { Server as SocketIO } from 'socket.io'
import { Storage } from '@orbitdb/core'

export class ConnectionsManagerTypes {
  options: Partial<ConnectionsManagerOptions>
  socketIOPort: number
  socketIOSecret: string
  httpTunnelPort?: number
  torAuthCookie?: string
  torControlPort?: number
  torResourcesPath?: string
  torBinaryPath?: string
}

export class ConnectionsManagerOptions {
  env: {
    appDataPath?: string
    resourcesPath?: string
  } = {}

  bootstrapMultiaddrs?: string[] = []
  createPaths?: boolean = true
}

export class ConfigOptions {
  options: Partial<ConnectionsManagerOptions>
  socketIOPort: number
  httpTunnelPort?: number
  torAuthCookie?: string
  torControlPort?: number
  torResourcesPath?: string
  torBinaryPath?: string
  env: {
    appDataPath?: string
    resourcesPath?: string
  } = {}

  bootstrapMultiaddrs?: string[] = []
  createPaths?: boolean = true
}

export class ServerIoProviderTypes {
  server: Server<typeof IncomingMessage, typeof ServerResponse>
  io: SocketIO<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
}

export interface GetPorts {
  socksPort: number
  libp2pHiddenService: number
  controlPort: number
  dataServer: number
  httpTunnelPort: number
}

export type OrbitDbStorage = {
  indexStorage: Storage
  headsStorage: Storage
  entryStorage: Storage
}
