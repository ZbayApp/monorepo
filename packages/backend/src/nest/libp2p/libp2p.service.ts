import { KEEP_ALIVE, type Libp2p } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
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
import { HEADLESS_OPTIONS, LIBP2P_DB_PATH, SERVER_IO_PROVIDER, SOCKS_PROXY_AGENT } from '../const'
import { HeadlessOptions, ServerIoProviderTypes } from '../types'
import {
  CreatedLibp2pPeerId,
  Libp2pConnectedPeer,
  Libp2pDatastorePrefix,
  Libp2pEvents,
  Libp2pNodeParams,
  Libp2pPeerInfo,
} from './libp2p.types'
import { createLogger } from '../common/logger'
import { Libp2pDatastore } from './libp2p.datastore'
import { libp2pAuth, Libp2pAuth } from './libp2p.auth'
import { SigChainService } from '../auth/sigchain.service'
import { generatePeerLibp2pConfig, generateServerLibp2pConfig, getTcpListenAddress } from './libp2p.config'

const KEY_LENGTH = 32
export const LIBP2P_PSK_METADATA = '/key/swarm/psk/1.0.0/\n/base16/\n'

@Injectable()
export class Libp2pService extends EventEmitter {
  public libp2pInstance: Libp2p | null
  private dialQueue: string[]
  public connectedPeers: Map<string, Libp2pConnectedPeer>
  public dialedPeers: Set<string>
  public libp2pDatastore: Libp2pDatastore | null
  private redialTimeout: NodeJS.Timeout
  public localAddress: string
  private _connectedPeersInterval: NodeJS.Timeout
  private authService: Libp2pAuth | undefined
  private readonly headless: boolean

  private logger = createLogger(Libp2pService.name)

  constructor(
    @Inject(SERVER_IO_PROVIDER) public readonly serverIoProvider: ServerIoProviderTypes,
    @Inject(SOCKS_PROXY_AGENT) public readonly socksProxyAgent: Agent,
    @Inject(LIBP2P_DB_PATH) public readonly datastorePath: string,
    @Inject(HEADLESS_OPTIONS) private readonly headlessOptions: HeadlessOptions | undefined,
    private sigchainService: SigChainService
  ) {
    super()

    this.dialQueue = []
    this.connectedPeers = new Map()
    this.dialedPeers = new Set()
    this.headless = !!this.headlessOptions
  }

  public emit(event: string | symbol, ...args: any[]): boolean {
    this.logger.info(`Emitting event: ${event.toString()}`, args)
    if (
      event === Libp2pEvents.AUTH_DISCONNECTED &&
      ['LOCAL_ERROR', 'REMOTE_ERROR', 'ERROR'].includes(args[0].event.type)
    ) {
      this.hangUpPeer(args[0].connection.remoteAddr.toString())
    }
    return super.emit(event, ...args)
  }

  public dialPeer = async (peerAddress: string) => {
    if (this.headless) {
      this.logger.trace(`Skipping dial on headless peer`)
      return
    }

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
    await this.libp2pDatastore?.deleteKeysByPrefix(Libp2pDatastorePrefix.PEERS)
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

  public readonly createLibp2pAddress = (address: string, peerId: string, isHeadless: boolean = false): string => {
    if (isHeadless) return ''
    return createLibp2pAddress(address, peerId)
  }

  public readonly createLibp2pListenAddress = (
    address: string,
    peerId: string,
    isHeadless: boolean = false
  ): string => {
    if (isHeadless) return getTcpListenAddress(peerId)
    return createLibp2pListenAddress(address)
  }

  /**
   * Based on 'libp2p/pnet' generateKey
   *
   * @param key: base64 encoded psk
   */
  public static generateLibp2pPSK(key?: string) {
    let psk: Buffer | undefined = undefined

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
    const controller = new AbortController()
    try {
      const ma = multiaddr(peerAddress)
      const peerId = peerIdFromString(ma.getPeerId()!)

      this.logger.info('Disconnecting auth service gracefully')
      this.authService?.closeAuthConnection(peerId)

      this.logger.info('Hanging up connection on libp2p')
      await this.libp2pInstance?.hangUp(ma, { signal: controller.signal })

      if (!ma.protoNames().includes('ip4')) {
        this.logger.info('Removing peer from peer store')
        await this.libp2pInstance?.peerStore.delete(peerId as any)
      }

      this.logger.info('Clearing local data')
      this.dialedPeers.delete(peerAddress)
      this.connectedPeers.delete(peerId.toString())
      this.logger.info('Done hanging up')
    } catch (e) {
      this.logger.error('Error while hanging up on peer', e)
      if (!controller.signal.aborted) {
        controller.abort(e)
      }
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
    if (params.instanceName != null) {
      this.logger = this.logger.extend(params.instanceName)
    }
    this.logger.info(`Creating new libp2p instance`)
    if (params.headless) {
      this.logger.warn(`RUNNING IN HEADLESS MODE!`)
    }

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
    this.libp2pDatastore.init()
    const auth = libp2pAuth(this.sigchainService, this)
    const config = params.headless
      ? generateServerLibp2pConfig(params, this.libp2pDatastore, auth)
      : generatePeerLibp2pConfig(params, this.libp2pDatastore, auth)
    try {
      libp2p = await createLibp2p(config)
    } catch (err) {
      this.logger.error('Error while creating instance of libp2p', err)
      throw err
    }

    this.libp2pInstance = libp2p
    const maybeAuth = libp2p.services['auth']
    if (maybeAuth != null) {
      this.authService = maybeAuth as Libp2pAuth
    }
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

    this.libp2pInstance.addEventListener('connection:open', openEvent => {
      this.logger.info(
        `Opened connection with ID ${openEvent.detail.id} with peer`,
        openEvent.detail.remotePeer.toString()
      )
    })

    this.libp2pInstance.addEventListener('peer:identify', async event => {
      const identifyResult = event.detail
      this.logger.info(`Identified peer`, identifyResult.peerId.toString())
      if ((await this.libp2pInstance?.peerStore?.get(identifyResult.peerId))?.tags.has(KEEP_ALIVE)) {
        return
      }

      await this.libp2pInstance?.peerStore?.patch(identifyResult.peerId, {
        tags: {
          [KEEP_ALIVE]: {},
        },
      })
    })

    this.libp2pInstance.addEventListener('peer:discovery', peer => {
      this.logger.info(`${peerId.peerId.toString()} discovered ${peer.detail.id}`)
    })

    this.libp2pInstance.addEventListener('connection:close', event => {
      this.logger.warn(`Connection with ID ${event.detail.id} closing with peer`, event.detail.remotePeer.toString())
    })

    this.libp2pInstance.addEventListener('transport:close', event => {
      this.logger.info(`Transport closing`)
    })

    this.libp2pInstance.addEventListener('peer:connect', async event => {
      const remotePeerId = event.detail.toString()
      const localPeerId = peerId.peerId.toString()
      this.logger.info(`${localPeerId} connected to ${remotePeerId}`)

      const connectedPeers: Map<string, Libp2pConnectedPeer> = new Map()
      for (const conn of this.libp2pInstance?.getConnections() ?? []) {
        connectedPeers.set(conn.remotePeer.toString(), {
          peerId: conn.remotePeer.toString(),
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

    this.logger.info(
      `Libp2p Multiaddrs:`,
      this.libp2pInstance.getMultiaddrs().map(addr => addr.toString())
    )

    this._connectedPeersInterval = setInterval(() => {
      const connections: Libp2pConnectedPeer[] = []
      for (const [peerId, peer] of this.connectedPeers.entries()) {
        connections.push({
          peerId,
          address: peer.address,
          connectedAtSeconds: peer.connectedAtSeconds,
        })
      }
      this.logger.info(`Current Connected Peers`, {
        connectionCount: this.connectedPeers.size,
        connections,
      })
    }, 60_000)

    this.logger.info(`Initialized libp2p for peer ${peerId.peerId.toString()}`)
  }

  public async cleanDatastore(): Promise<void> {
    await this.libp2pDatastore?.clean()
  }

  public async closeDatastore(): Promise<void> {
    await this.libp2pDatastore?.close()
    this.libp2pDatastore = null
  }

  public async close(closeDatastore = true): Promise<void> {
    this.logger.info('Closing libp2p service')
    clearTimeout(this.redialTimeout)
    clearInterval(this._connectedPeersInterval)

    await this.hangUpPeers(undefined)
    await this.libp2pInstance?.stop()
    if (closeDatastore) {
      await this.closeDatastore()
    }

    this.libp2pInstance = null
    this.connectedPeers = new Map()
    this.dialedPeers = new Set()
    this.dialQueue = []
  }
}
