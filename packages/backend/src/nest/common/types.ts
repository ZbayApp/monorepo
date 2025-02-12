import { type PublicChannel } from '@quiet/types'
import { ChannelStore } from '../storage/channels/channel.store'

export interface PublicChannelsRepo {
  store: ChannelStore
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
