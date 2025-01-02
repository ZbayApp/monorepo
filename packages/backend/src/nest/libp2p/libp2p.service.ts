import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { noise, pureJsCrypto } from '@chainsafe/libp2p-noise'
import { plaintext } from '@libp2p/plaintext'
import { yamux } from '@chainsafe/libp2p-yamux'

import { identify, identifyPush } from '@libp2p/identify'
import { PeerId, Stream, type Libp2p } from '@libp2p/interface'
import { kadDHT } from '@libp2p/kad-dht'
import { keychain } from '@libp2p/keychain'
import { peerIdFromString } from '@libp2p/peer-id'
import { ping } from '@libp2p/ping'
import { preSharedKey } from '@libp2p/pnet'
import * as filters from '@libp2p/websockets/filters'
import { createLibp2p } from 'libp2p'

import { multiaddr } from '@multiformats/multiaddr'
import { Inject, Injectable } from '@nestjs/common'

import crypto from 'crypto'
import { EventEmitter } from 'events'
import { Agent } from 'https'
import { DateTime } from 'luxon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'

import { createLibp2pAddress, createLibp2pListenAddress } from '@quiet/common'
import { ConnectionProcessInfo, type NetworkDataPayload, SocketActionTypes, type UserData } from '@quiet/types'

import { getUsersAddresses } from '../common/utils'
import { LIBP2P_DB_PATH, SERVER_IO_PROVIDER, SOCKS_PROXY_AGENT } from '../const'
import { ServerIoProviderTypes } from '../types'
import { webSockets } from '../websocketOverTor'
import {
  CreatedLibp2pPeerId,
  Libp2pConnectedPeer,
  Libp2pEvents,
  Libp2pNodeParams,
  Libp2pPeerInfo,
} from './libp2p.types'
import { createLogger } from '../common/logger'
import { Libp2pDatastore } from './libp2p.datastore'
import { WEBSOCKET_CIPHER_SUITE, BITSWAP_PROTOCOL } from './libp2p.const'

const KEY_LENGTH = 32
export const LIBP2P_PSK_METADATA = '/key/swarm/psk/1.0.0/\n/base16/\n'

@Injectable()
export class Libp2pService extends EventEmitter {
  public libp2pInstance: Libp2p | null
  private dialQueue: string[]
  public connectedPeers: Map<string, Libp2pConnectedPeer>
  public dialedPeers: Set<string>
  public libp2pDatastore: Libp2pDatastore
  private redialTimeout: NodeJS.Timeout
  private localAddress: string

  private readonly logger = createLogger(Libp2pService.name)

  constructor(
    @Inject(SERVER_IO_PROVIDER) public readonly serverIoProvider: ServerIoProviderTypes,
    @Inject(SOCKS_PROXY_AGENT) public readonly socksProxyAgent: Agent,
    @Inject(LIBP2P_DB_PATH) public readonly datastorePath: string
  ) {
    super()

    this.dialQueue = []
    this.connectedPeers = new Map()
    this.dialedPeers = new Set()
  }

  public dialPeer = async (peerAddress: string) => {
    this.logger.info(`Dialing peer address: ${peerAddress}`)

    if (!peerAddress.includes(this.libp2pInstance?.peerId.toString() ?? '')) {
      this.dialedPeers.add(peerAddress)
      try {
        await this.libp2pInstance?.dial(multiaddr(peerAddress))
      } catch (e) {
        this.logger.warn(`Failed to dial peer address: ${peerAddress}`, e)
        this.dialQueue.push(peerAddress)
      }
    } else {
      this.logger.warn('Not dialing self')
    }
  }

  public dialPeers = async (peerAddresses: string[]) => {
    const dialable = peerAddresses.filter(p => p !== this.localAddress)
    this.logger.info('Dialing peer addresses', dialable)
    this.logger.info('Local Address', this.localAddress)
    this.logger.info(peerAddresses.length, dialable.length)

    for (const addr of dialable) {
      this.dialPeer(addr)
    }
  }

  /**
   * It doesn't look like libp2p redials peers if it fails to dial them the
   * first time, so we handle that. Even if we fail to dial a peer, we keep
   * retrying.
   */
  private redialPeersInBackground = () => {
    const peerAddrs = [...this.dialQueue]

    this.dialQueue = []

    for (const addr of peerAddrs) {
      this.dialPeer(addr)
    }

    // TODO: Implement exponential backoff for peers that fail to connect
    this.redialTimeout = setTimeout(this.redialPeersInBackground.bind(this), 20000)
  }

  public dialUsers = async (users: UserData[]) => {
    const addrs = await getUsersAddresses(users.filter(x => x.peerId !== this.libp2pInstance?.peerId.toString()))

    await this.dialPeers(addrs)
  }

  public getCurrentPeerInfo = (): Libp2pPeerInfo => {
    return {
      dialed: Array.from(this.dialedPeers),
      connected: Array.from(this.connectedPeers.values()).map(peer => peer.address),
    }
  }

  public pause = async (): Promise<Libp2pPeerInfo> => {
    clearTimeout(this.redialTimeout)
    const peerInfo = this.getCurrentPeerInfo()
    await this.hangUpPeers(Array.from(this.dialedPeers))
    this.dialedPeers.clear()
    this.connectedPeers.clear()
    // await this.libp2pInstance?.stop()
    await this.libp2pDatastore.deleteKeysByPrefix('peers')
    return peerInfo
  }

  public resume = async (peersToDial: string[]): Promise<void> => {
    // await this.libp2pInstance?.start()
    if (peersToDial.length > 0) {
      this.logger.info(`Redialing ${peersToDial.length} peers`)
      await this.redialPeers(peersToDial)
    } else {
      this.logger.info(`No peers to redial!`)
    }

    this.redialPeersInBackground()
  }

  public readonly createLibp2pAddress = (address: string, peerId: string): string => {
    return createLibp2pAddress(address, peerId)
  }

  public readonly createLibp2pListenAddress = (address: string): string => {
    return createLibp2pListenAddress(address)
  }

  /**
   * Based on 'libp2p/pnet' generateKey
   *
   * @param key: base64 encoded psk
   */
  public static generateLibp2pPSK(key?: string) {
    let psk

    if (key) {
      psk = Buffer.from(key, 'base64')
    } else {
      psk = crypto.randomBytes(KEY_LENGTH)
    }

    const base16StringKey = uint8ArrayToString(psk, 'base16')
    const fullKey = uint8ArrayFromString(LIBP2P_PSK_METADATA + base16StringKey)

    return { psk: psk.toString('base64'), fullKey }
  }

  public async hangUpPeers(peers?: string[]) {
    this.logger.info('Hanging up on all peers')
    const peersToHangUp = peers ?? Array.from(this.dialedPeers)
    for (const peer of peersToHangUp) {
      await this.hangUpPeer(peer)
    }
    this.logger.info('All peers hung up')
  }

  public async hangUpPeer(peerAddress: string) {
    this.logger.info('Hanging up on peer', peerAddress)
    try {
      const ma = multiaddr(peerAddress)
      const peerId = peerIdFromString(ma.getPeerId()!)

      this.logger.info('Hanging up connection on libp2p')
      await this.libp2pInstance?.hangUp(ma)

      this.logger.info('Removing peer from peer store')
      await this.libp2pInstance?.peerStore.delete(peerId as any)

      this.logger.info('Clearing local data')
      this.dialedPeers.delete(peerAddress)
      this.connectedPeers.delete(peerId.toString())
      this.logger.info('Done hanging up')
    } catch (e) {
      this.logger.error('Error while hanging up on peer', e)
    }
  }

  /**
   * Hang up existing peer connections and re-dial them. Specifically useful on
   * iOS where Tor receives a new port when the app resumes from background and
   * we want to close/re-open connections.
   */
  public async redialPeers(peersToDial?: string[]) {
    const dialed = peersToDial ?? Array.from(this.dialedPeers)
    const connectedAddrs = [...this.connectedPeers.values()].map(p => p.address)
    const toDial = peersToDial ?? [...connectedAddrs, ...this.dialedPeers]

    if (dialed.length === 0) {
      this.logger.info('No peers to redial!')
      return
    }

    this.logger.info(`Re-dialing ${dialed.length} peers`)

    // TODO: Sort peers
    await this.hangUpPeers(dialed)

    await this.dialPeers(toDial)
  }

  public async createInstance(params: Libp2pNodeParams): Promise<Libp2p> {
    this.logger.info(`Creating new libp2p instance`)

    if (this.libp2pInstance) {
      this.logger.warn(`Found an existing instance of libp2p, returning...`)
      return this.libp2pInstance
    }

    this.logger.info(`Creating or opening existing level datastore for libp2p`)
    this.libp2pDatastore = new Libp2pDatastore({
      inMemory: false,
      datastorePath: this.datastorePath,
    })

    this.localAddress = params.localAddress

    let libp2p: Libp2p

    this.logger.info(`Creating libp2p`)
    try {
      libp2p = await createLibp2p({
        start: false,
        datastore: this.libp2pDatastore.init(),
        connectionManager: {
          maxConnections: 20, // TODO: increase?
          dialTimeout: 120_000,
          maxParallelDials: 10,
          inboundUpgradeTimeout: 30_000,
          outboundUpgradeTimeout: 30_000,
          protocolNegotiationTimeout: 10_000,
          maxDialQueueLength: 500,
        },
        privateKey: params.peerId.privKey,
        addresses: { listen: params.listenAddresses },
        connectionMonitor: {
          // ISLA: we should consider making this true if pings are reliable going forward
          abortConnectionOnPingFailure: false,
          pingInterval: 60_000,
          enabled: true,
        },
        connectionProtector: preSharedKey({ psk: params.psk }),
        streamMuxers: [
          yamux({
            maxInboundStreams: 3_000,
            maxOutboundStreams: 3_000,
            onStreamEnd: async (stream: Stream) => {
              if (stream.protocol === BITSWAP_PROTOCOL) {
                await stream.closeRead()
                await stream.closeWrite()
              }
            },
          }),
        ],
        connectionEncrypters: [noise({ crypto: pureJsCrypto, staticNoiseKey: params.peerId.noiseKey })],
        transports: [
          webSockets({
            filter: filters.all,
            websocket: {
              agent: params.agent,
              handshakeTimeout: 15_000,
              ciphers: WEBSOCKET_CIPHER_SUITE,
              followRedirects: true,
            },
            localAddress: params.localAddress,
            targetPort: params.targetPort,
            closeOnEnd: true,
          }),
        ],
        services: {
          ping: ping({ timeout: 30_000 }),
          pubsub: gossipsub({
            // neccessary to run a single peer
            allowPublishToZeroTopicPeers: true,
            fallbackToFloodsub: true,
            emitSelf: true,
            debugName: params.peerId.peerId.toString(),
            doPX: true,
          }),
          identify: identify({ timeout: 30_000 }),
          identifyPush: identifyPush({ timeout: 30_000 }),
          keychain: keychain(),
          dht: kadDHT({
            allowQueryWithZeroPeers: true,
            clientMode: false,
          }),
        },
      })
    } catch (err) {
      this.logger.error('Error while creating instance of libp2p', err)
      throw err
    }

    this.libp2pInstance = libp2p
    await this.afterCreation(params.peerId)
    return libp2p
  }

  private async afterCreation(peerId: CreatedLibp2pPeerId) {
    this.logger.info(`Performing post-creation setup of libp2p instance`)

    if (!this.libp2pInstance) {
      this.logger.error('libp2pInstance was not created')
      throw new Error('libp2pInstance was not created')
    }

    this.logger.info(`Local peerId: ${peerId.peerId.toString()}`)
    this.logger.info(`Setting up libp2p event listeners`)

    this.serverIoProvider.io.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, ConnectionProcessInfo.INITIALIZING_LIBP2P)

    this.libp2pInstance.addEventListener('peer:discovery', peer => {
      this.logger.info(`${peerId.peerId.toString()} discovered ${peer.detail.id}`)
    })

    this.libp2pInstance.addEventListener('connection:close', event => {
      this.logger.warn(`Connection closing with ${event.detail.remotePeer}`)
    })

    this.libp2pInstance.addEventListener('transport:close', event => {
      this.logger.warn(`Transport closing`)
    })

    this.libp2pInstance.addEventListener('peer:connect', async event => {
      const remotePeerId = event.detail.toString()
      const localPeerId = peerId.peerId.toString()
      this.logger.info(`${localPeerId} connected to ${remotePeerId}`)

      const connectedPeers: Map<string, Libp2pConnectedPeer> = new Map()
      for (const conn of this.libp2pInstance?.getConnections() ?? []) {
        connectedPeers.set(conn.remotePeer.toString(), {
          address: conn.remoteAddr.toString(),
          connectedAtSeconds: DateTime.utc().valueOf(),
        })
      }
      this.connectedPeers = connectedPeers
      this.logger.info(`${localPeerId} is connected to ${this.connectedPeers.size} peers`)
      this.logger.info(`${localPeerId} has ${this.libp2pInstance?.getConnections().length} open connections`)

      this.emit(Libp2pEvents.PEER_CONNECTED, {
        peers: [remotePeerId],
      })
    })

    this.libp2pInstance.addEventListener('peer:disconnect', async event => {
      const remotePeerId = event.detail.toString()
      const localPeerId = peerId.peerId.toString()
      this.logger.info(`${localPeerId} disconnected from ${remotePeerId}`)
      if (!this.libp2pInstance) {
        this.logger.error('libp2pInstance was not created')
        throw new Error('libp2pInstance was not created')
      }
      this.logger.info(`${localPeerId} has ${this.libp2pInstance.getConnections().length} open connections`)

      const connectionStartTime: number = this.connectedPeers.get(remotePeerId)!.connectedAtSeconds
      if (!connectionStartTime) {
        this.logger.error(`No connection start time for peer ${remotePeerId}`)
        return
      }

      const connectionEndTime: number = DateTime.utc().valueOf()

      const connectionDuration: number = connectionEndTime - connectionStartTime

      this.connectedPeers.delete(remotePeerId)
      this.logger.info(`${localPeerId} is connected to ${this.connectedPeers.size} peers`)
      const peerStat: NetworkDataPayload = {
        peer: remotePeerId,
        connectionDuration,
        lastSeen: connectionEndTime,
      }
      this.emit(Libp2pEvents.PEER_DISCONNECTED, peerStat)
    })

    this.logger.info(`Dialing peers and starting libp2p`)

    this.redialPeersInBackground()

    await this.libp2pInstance.start()

    this.logger.warn(
      `Libp2p Multiaddrs:`,
      this.libp2pInstance.getMultiaddrs().map(addr => addr.toString())
    )

    this.logger.info(`Initialized libp2p for peer ${peerId.peerId.toString()}`)
  }

  public async close(): Promise<void> {
    this.logger.info('Closing libp2p service')
    clearTimeout(this.redialTimeout)
    await this.hangUpPeers()
    await this.libp2pInstance?.stop()
    await this.libp2pDatastore?.close()

    this.libp2pInstance = null
    this.connectedPeers = new Map()
    this.dialedPeers = new Set()
  }
}
