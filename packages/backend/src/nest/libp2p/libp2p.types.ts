import { PeerId, PrivateKey } from '@libp2p/interface'
import { Agent } from 'http'

export enum Libp2pEvents {
  PEER_CONNECTED = 'peerConnected',
  PEER_DISCONNECTED = 'peerDisconnected',
  NETWORK_STATS = 'networkStats',
}

export interface Libp2pNodeParams {
  peerId: CreatedLibp2pPeerId
  listenAddresses: string[]
  agent: Agent
  localAddress: string
  targetPort: number
  psk: Uint8Array
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
}
