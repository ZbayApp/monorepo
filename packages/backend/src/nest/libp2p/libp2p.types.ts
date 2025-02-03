import { PeerId, PrivateKey } from '@libp2p/interface'
import { Agent } from 'http'

export enum Libp2pEvents {
  PEER_CONNECTED = 'peerConnected',
  PEER_DISCONNECTED = 'peerDisconnected',
  NETWORK_STATS = 'networkStats',
  AUTH_CONNECTED = 'authConnected',
  AUTH_JOINED = 'authJoined',
  AUTH_STATE_CHANGED = 'authStateChanged',
  AUTH_REMOTE_ERROR = 'authRemoteError',
  AUTH_LOCAL_ERROR = 'authLocalError',
  AUTH_DISCONNECTED = 'authDisconnected',
  AUTH_UPDATED = 'authUpdated',
}
export enum AuthErrors {}

export interface Libp2pNodeParams {
  peerId: CreatedLibp2pPeerId
  listenAddresses: string[]
  agent: Agent | undefined
  localAddress: string
  targetPort: number
  psk: Uint8Array
  transport?: any[]
  useConnectionProtector?: boolean
  instanceName?: string
}

export type Libp2pPeerInfo = {
  dialed: string[]
  connected: string[]
}

export type Libp2pConnectedPeer = {
  address: string
  connectedAtSeconds: number
}

export type Libp2pDatastoreOptions = {
  inMemory: boolean
  datastorePath?: string
}
export interface CreatedLibp2pPeerId {
  peerId: PeerId
  privKey: PrivateKey
  noiseKey: Uint8Array
}
