import { type EventsType } from '@orbitdb/core'
import { type ChannelMessage, type PublicChannel } from '@quiet/types'

export interface PublicChannelsRepo {
  db: EventsType<ChannelMessage>
  eventsAttached: boolean
}

export type ChannelInfoResponse = Record<string, PublicChannel>

export class StorageOptions {
  orbitDbDir?: string
  ipfsDir?: string
  createPaths = true
}

export interface IPublicKey {
  halfKey: string
}

export type IMessageThread = string

export class ConnectionsManagerOptions {
  env: {
    appDataPath?: string
    resourcesPath?: string
  } = {}

  bootstrapMultiaddrs?: string[] = []
  createPaths?: boolean = true
}

export interface ILibp2pStatus {
  address: string
  peerId: string
}
