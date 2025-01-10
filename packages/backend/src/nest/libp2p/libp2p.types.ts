import { PeerId, PrivateKey } from '@libp2p/interface'
import { Agent } from 'http'
import { EventEmitter } from 'stream'
import { createLogger } from '../common/logger'

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

export enum AuthEvents {
  INITIALIZED_CHAIN = 'INITIALIZED_CHAIN',
  DIAL_FINISHED = 'DIAL_FINISHED',
  AUTH_TIMEOUT = 'AUTH_TIMEOUT',
  MISSING_DEVICE = 'MISSING_DEVICE',
}
export class QuietAuthEvents {
  private _events: EventEmitter
  private _LOGGER: ReturnType<typeof createLogger>

  constructor() {
    this._events = new EventEmitter()
    this._LOGGER = createLogger(`quietAuthEvents`)
  }

  public emit(event: AuthEvents, ...args: any[]) {
    this._LOGGER.debug(`emit ${event}`)
    this._events.emit(event, ...args)
  }

  public on(event: AuthEvents, listener: (...args: any[]) => void) {
    this._events.on(
      event,
      // this.appendLogToListener(event, listener)
      listener
    )
  }

  public once(event: AuthEvents, listener: (...args: any[]) => void) {
    this._events.once(
      event,
      // this.appendLogToListener(event, listener)
      listener
    )
  }
}
export interface CreatedLibp2pPeerId {
  peerId: PeerId
  privKey: PrivateKey
  noiseKey: Uint8Array
}
