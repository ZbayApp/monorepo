import { peerIdFromKeys } from '@libp2p/peer-id'
import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { Crypto } from '@peculiar/webcrypto'
import { EventEmitter } from 'events'
import fs from 'fs'
import getPort from 'get-port'
import { Agent } from 'https'
import path from 'path'
import PeerId from 'peer-id'
import { CryptoEngine, setEngine } from 'pkijs'
import { getLibp2pAddressesFromCsrs, removeFilesFromDir } from '../common/utils'

import { LazyModuleLoader } from '@nestjs/core'
import { createLibp2pAddress, filterValidAddresses, isPSKcodeValid } from '@quiet/common'
import { CertFieldsTypes, createRootCA, getCertFieldValue, loadCertificate } from '@quiet/identity'
import {
  ChannelMessageIdsResponse,
  ChannelSubscribedPayload,
  ChannelsReplicatedPayload,
  Community,
  CommunityMetadata,
  ConnectionProcessInfo,
  CreateChannelPayload,
  CreateChannelResponse,
  DeleteFilesFromChannelSocketPayload,
  DownloadStatus,
  ErrorMessages,
  FileMetadata,
  GetMessagesPayload,
  InitCommunityPayload,
  InvitationDataV2,
  InvitationDataVersion,
  MessagesLoadedPayload,
  NetworkDataPayload,
  NetworkInfo,
  NetworkStats,
  PushNotificationPayload,
  RemoveDownloadStatus,
  SaveCSRPayload,
  SendCertificatesResponse,
  SendMessagePayload,
  SocketActionTypes,
  UploadFilePayload,
  type DeleteChannelResponse,
  type SavedOwnerCertificatePayload,
  type UserProfile,
  type UserProfilesStoredEvent,
  Identity,
  CreateUserCsrPayload,
  InitUserCsrPayload,
  UserCsr,
} from '@quiet/types'
import { CONFIG_OPTIONS, QUIET_DIR, SERVER_IO_PROVIDER, SOCKS_PROXY_AGENT } from '../const'
import { Libp2pService } from '../libp2p/libp2p.service'
import { Libp2pEvents, Libp2pNodeParams, Libp2pPeerInfo } from '../libp2p/libp2p.types'
import { LocalDbService } from '../local-db/local-db.service'
import { LocalDBKeys } from '../local-db/local-db.types'
import { RegistrationService } from '../registration/registration.service'
import { RegistrationEvents } from '../registration/registration.types'
import { emitError } from '../socket/socket.errors'
import { SocketService } from '../socket/socket.service'
import { StorageService } from '../storage/storage.service'
import { StorageEvents } from '../storage/storage.types'
import { StorageServiceClient } from '../storageServiceClient/storageServiceClient.service'
import { ServerStoredCommunityMetadata } from '../storageServiceClient/storageServiceClient.types'
import { Tor } from '../tor/tor.service'
import { ConfigOptions, GetPorts, ServerIoProviderTypes } from '../types'
import { ServiceState, TorInitState } from './connections-manager.types'
import { DateTime } from 'luxon'
import { createLogger } from '../common/logger'
import { createUserCsr, getPubKey, loadPrivateKey, pubKeyFromCsr } from '@quiet/identity'
import { config } from '@quiet/state-manager'

@Injectable()
export class ConnectionsManagerService extends EventEmitter implements OnModuleInit {
  public communityId: string
  public communityState: ServiceState
  public libp2pService: Libp2pService
  private ports: GetPorts
  isTorInit: TorInitState = TorInitState.NOT_STARTED
  private peerInfo: Libp2pPeerInfo | undefined = undefined

  private readonly logger = createLogger(ConnectionsManagerService.name)
  constructor(
    @Inject(SERVER_IO_PROVIDER) public readonly serverIoProvider: ServerIoProviderTypes,
    @Inject(CONFIG_OPTIONS) public configOptions: ConfigOptions,
    @Inject(QUIET_DIR) public readonly quietDir: string,
    @Inject(SOCKS_PROXY_AGENT) public readonly socksProxyAgent: Agent,
    private readonly socketService: SocketService,
    private readonly registrationService: RegistrationService,
    private readonly storageServerProxyService: StorageServiceClient,
    private readonly localDbService: LocalDbService,
    private readonly storageService: StorageService,
    private readonly tor: Tor,
    private readonly lazyModuleLoader: LazyModuleLoader
  ) {
    super()
  }

  async onModuleInit() {
    process.on('unhandledRejection', error => {
      this.logger.error(error)
      throw new Error()
    })
    // process.on('SIGINT', function () {
    //   // This is not graceful even in a single percent. we must close services first, not just kill process %
    //   // this.logger.info('\nGracefully shutting down from SIGINT (Ctrl-C)')
    //   process.exit(0)
    // })
    const webcrypto = new Crypto()
    // @ts-ignore
    global.crypto = webcrypto

    setEngine(
      'newEngine',
      // @ts-ignore
      new CryptoEngine({
        name: 'newEngine',
        // @ts-ignore
        crypto: webcrypto,
      })
    )

    await this.init()
  }

  private async generatePorts() {
    const controlPort = await getPort()
    const socksPort = await getPort()
    const libp2pHiddenService = await getPort()
    const dataServer = await getPort()
    const httpTunnelPort = await getPort()

    this.ports = {
      socksPort,
      libp2pHiddenService,
      controlPort,
      dataServer,
      httpTunnelPort,
    }
  }

  public async init() {
    this.logger.info('init')
    this.communityState = ServiceState.DEFAULT
    await this.generatePorts()
    if (!this.configOptions.httpTunnelPort) {
      this.configOptions.httpTunnelPort = await getPort()
    }

    this.attachSocketServiceListeners()
    this.attachTorEventsListeners()
    this.attachStorageListeners()

    if (this.localDbService.getStatus() === 'closed') {
      await this.localDbService.open()
    }

    if (this.configOptions.torControlPort) {
      await this.migrateLevelDb()
      await this.launchCommunityFromStorage()
    }
  }

  /**
   * Migrate LevelDB when upgrading Quiet for existing communities
   *
   * Move data from Redux in the frontend to LevelDB in the backend for existing
   * communities when upgrading. Hopefully this will make features easier to
   * test and develop. In order to do this, we need the data to be accessible on
   * the backend before it's first used. Since the backend starts up
   * asynchronously, independent of the frontend, we wait for the frontend to
   * load migration data before launching the community.
   */
  public async migrateLevelDb(): Promise<void> {
    // Empty promise used to wait on a callback below
    let onDataReceived: () => void
    const dataReceivedPromise = new Promise<void>((resolve: () => void) => {
      onDataReceived = resolve
    })

    // TODO: add migration of network info in COMMUNITY to IDENTITY
    // This is related to a specific migration, perhaps there is a way to
    // encapsulate this in LocalDbService.
    const keys = [LocalDBKeys.CURRENT_COMMUNITY_ID, LocalDBKeys.COMMUNITIES, LocalDBKeys.IDENTITIES]
    const keysRequired: string[] = []

    for (const key of keys) {
      if (!(await this.localDbService.exists(key))) {
        keysRequired.push(key)
      }
    }

    this.socketService.on(SocketActionTypes.LOAD_MIGRATION_DATA, async (data: Record<string, any>) => {
      this.logger.info('Migrating LevelDB')
      await this.localDbService.load(data)
      onDataReceived()
    })

    // Only require migration data for existing communities. We can tell because
    // they are using the deprecated COMMUNITY key in LevelDB. This is related
    // to a specific migration. Perhaps we want a more general purpose migration
    // mechanism, like a table to hold migrations that have already been
    // applied.
    if ((await this.localDbService.exists(LocalDBKeys.COMMUNITY)) && keysRequired.length > 0) {
      this.logger.info('Migration data required:', keysRequired)
      this.serverIoProvider.io.emit(SocketActionTypes.MIGRATION_DATA_REQUIRED, keysRequired)
      await dataReceivedPromise
    } else {
      this.logger.info('Nothing to migrate')
    }
  }

  public async launchCommunityFromStorage() {
    this.logger.info('Launching community from storage')
    const community = await this.localDbService.getCurrentCommunity()
    if (!community) {
      this.logger.info('No community found in storage')
      return
    }

    const identity = await this.storageService.getIdentity(community.id)
    if (!identity) {
      this.logger.warn('No identity found in storage')
      return
    }

    const sortedPeers = await this.localDbService.getSortedPeers(community.peerList ?? [])
    this.logger.info('launchCommunityFromStorage - sorted peers', sortedPeers)
    if (sortedPeers.length > 0) {
      community.peerList = sortedPeers
    }
    await this.localDbService.setCommunity(community)

    await this.launchCommunity(community)
  }

  public async closeAllServices(options: { saveTor: boolean } = { saveTor: false }) {
    this.logger.info('Closing services')

    await this.closeSocket()

    if (this.tor && !options.saveTor) {
      this.logger.info('Killing tor')
      await this.tor.kill()
    } else if (options.saveTor) {
      this.logger.info('Saving tor')
    }
    if (this.storageService) {
      this.logger.info('Stopping OrbitDB')
      await this.storageService?.stopOrbitDb()
    }
    if (this.libp2pService) {
      this.logger.info('Stopping libp2p')
      await this.libp2pService.close()
    }
    if (this.localDbService) {
      this.logger.info('Closing local DB')
      await this.localDbService.close()
    }
  }

  public async closeSocket() {
    await this.socketService.close()
  }

  public async pause() {
    this.logger.info('Pausing!')
    await this.closeSocket()
    this.logger.info('Pausing libp2pService!')
    this.peerInfo = await this.libp2pService?.pause()
    this.logger.info('Found the following peer info on pause: ', this.peerInfo)
  }

  public async resume() {
    this.logger.info('Resuming!')
    await this.openSocket()
    const peersToDial = await this.getPeersOnResume()
    this.libp2pService?.resume(peersToDial)
  }

  public async getPeersOnResume(): Promise<string[]> {
    this.logger.info('Getting peers to redial')
    if (this.peerInfo && (this.peerInfo?.connected.length !== 0 || this.peerInfo?.dialed.length !== 0)) {
      this.logger.info('Found peer info from pause: ', this.peerInfo)
      return [...this.peerInfo.connected, ...this.peerInfo.dialed]
    }

    this.logger.info('Getting peers from stored community (if exists)')
    const community = await this.localDbService.getCurrentCommunity()
    if (!community) {
      this.logger.warn(`No community launched, no peers found`)
      return []
    }
    return await this.localDbService.getSortedPeers(community.peerList ?? [])
  }

  // This method is only used on iOS through rn-bridge for reacting on lifecycle changes
  public async openSocket() {
    await this.socketService.init()
  }

  public async leaveCommunity(): Promise<boolean> {
    this.logger.info('Running leaveCommunity')

    await this.closeAllServices({ saveTor: true })

    this.logger.info('Purging data')
    await this.purgeData()

    this.logger.info('Resetting Tor')
    this.tor.resetHiddenServices()

    this.logger.info('Resetting state')
    await this.resetState()

    this.logger.info('Reopening local DB')
    await this.localDbService.open()

    this.logger.info('Restarting socket')
    await this.openSocket()

    return true
  }

  async resetState() {
    this.communityId = ''
    this.ports = { ...this.ports, libp2pHiddenService: await getPort() }
    this.communityState = ServiceState.DEFAULT
  }

  public async purgeData() {
    this.logger.info('Purging community data')
    const dirsToRemove = fs
      .readdirSync(this.quietDir)
      .filter(
        i =>
          i.startsWith('Ipfs') || i.startsWith('OrbitDB') || i.startsWith('backendDB') || i.startsWith('Local Storage')
      )
    for (const dir of dirsToRemove) {
      const dirPath = path.join(this.quietDir, dir)
      this.logger.info(`Removing dir: ${dirPath}`)
      removeFilesFromDir(dirPath)
    }
  }

  public async getNetwork(): Promise<NetworkInfo> {
    this.logger.info('Getting network information')

    this.logger.info('Creating hidden service')
    const hiddenService = await this.tor.createNewHiddenService({ targetPort: this.ports.libp2pHiddenService })

    this.logger.info('Destroying the hidden service we created')
    await this.tor.destroyHiddenService(hiddenService.onionAddress.split('.')[0])

    // TODO: Do we want to create the PeerId here? It doesn't necessarily have
    // anything to do with Tor.
    this.logger.info('Getting peer ID')
    const peerId: PeerId = await PeerId.create()
    const peerIdJson = peerId.toJSON()
    this.logger.info(`Created network for peer ${peerId.toString()}. Address: ${hiddenService.onionAddress}`)

    return {
      hiddenService,
      peerId: peerIdJson,
    }
  }

  public async createNetwork(communityId: string): Promise<NetworkInfo | undefined> {
    let network: NetworkInfo

    try {
      network = await this.getNetwork()
    } catch (e) {
      this.logger.error(`Creating network for community ${communityId} failed`, e)
      emitError(this.serverIoProvider.io, {
        type: SocketActionTypes.CREATE_NETWORK,
        message: ErrorMessages.NETWORK_SETUP_FAILED,
        community: communityId,
      })
      return
    }

    // TODO: Should we save this network info in LevelDB at this point?
    return network
  }

  public async createIdentity(id: string): Promise<Identity | undefined> {
    let identity: Identity | undefined = await this.storageService.getIdentity(id)
    if (!identity) {
      this.logger.info('Creating identity')
      const network: NetworkInfo = await this.getNetwork()
      identity = {
        id: id,
        nickname: '',
        hiddenService: network.hiddenService,
        peerId: network.peerId,
        userCsr: null,
        userCertificate: null,
        joinTimestamp: null,
      }
      this.logger.info('Created identity', identity)
    } else {
      this.logger.info('Retrieved identity from localDbService', identity)
    }
    await this.storageService.setIdentity(identity)
    return identity
  }

  public async addUserCsr(payload: InitUserCsrPayload): Promise<Identity | undefined> {
    const { communityId, nickname } = payload
    this.logger.info('Creating user CSR for community', communityId)

    let identity: Identity | undefined = await this.storageService.getIdentity(communityId)
    if (!identity) {
      emitError(this.serverIoProvider.io, {
        type: SocketActionTypes.CREATE_USER_CSR,
        message: ErrorMessages.USER_CSR_CREATION_FAILED,
        community: communityId,
      })
      this.logger.error('Identity not found')
      return
    }

    let createUserCsrPayload: CreateUserCsrPayload

    if (identity?.userCsr) {
      this.logger.info('Recreating user CSR')
      if (identity.userCsr?.userCsr == null || identity.userCsr.userKey == null) {
        this.logger.error('identity.userCsr?.userCsr == null || identity.userCsr.userKey == null')
        return
      }
      const _pubKey = await pubKeyFromCsr(identity.userCsr.userCsr)
      const publicKey = await getPubKey(_pubKey)
      const privateKey = await loadPrivateKey(identity.userCsr.userKey, config.signAlg)

      const existingKeyPair: CryptoKeyPair = { privateKey, publicKey }

      createUserCsrPayload = {
        nickname: nickname,
        commonName: identity.hiddenService.onionAddress,
        peerId: identity.peerId.id,
        signAlg: config.signAlg,
        hashAlg: config.hashAlg,
        existingKeyPair,
      }
    } else {
      this.logger.info('Creating new user CSR')
      createUserCsrPayload = {
        nickname: nickname,
        commonName: identity.hiddenService.onionAddress,
        peerId: identity.peerId.id,
        signAlg: config.signAlg,
        hashAlg: config.hashAlg,
      }
    }

    let userCsr: UserCsr
    try {
      userCsr = await createUserCsr(createUserCsrPayload)
    } catch (e) {
      emitError(this.serverIoProvider.io, {
        type: SocketActionTypes.CREATE_USER_CSR,
        message: ErrorMessages.USER_CSR_CREATION_FAILED,
        community: communityId,
      })
      return
    }

    identity = { ...identity, userCsr: userCsr, nickname: nickname }
    this.logger.info('Created user CSR')
    await this.storageService.setIdentity(identity)
    if (payload.isUsernameTaken) {
      await this.storageService.saveCSR({ csr: userCsr.userCsr })
    }
    return identity
  }

  public async createCommunity(payload: InitCommunityPayload): Promise<Community | undefined> {
    this.logger.info('Creating community', payload.id)

    if (!payload.CA || !payload.rootCa) {
      this.logger.error('CA and rootCa are required to create community')
      return
    }

    let identity = await this.storageService.getIdentity(payload.id)
    if (!identity) {
      emitError(this.serverIoProvider.io, {
        type: SocketActionTypes.CREATE_COMMUNITY,
        message: ErrorMessages.IDENTITY_NOT_FOUND,
        community: payload.id,
      })
      return
    } else if (!identity.userCsr) {
      emitError(this.serverIoProvider.io, {
        type: SocketActionTypes.CREATE_COMMUNITY,
        message: ErrorMessages.USER_CSR_NOT_FOUND,
        community: payload.id,
      })
      return
    }

    const psk = Libp2pService.generateLibp2pPSK().psk
    let ownerCertResult: SavedOwnerCertificatePayload

    try {
      this.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, ConnectionProcessInfo.REGISTERING_OWNER_CERTIFICATE)
      ownerCertResult = await this.registrationService.registerOwnerCertificate({
        communityId: payload.id,
        userCsr: identity.userCsr,
        permsData: {
          certificate: payload.CA.rootCertString,
          privKey: payload.CA.rootKeyString,
        },
      })
    } catch (e) {
      this.logger.error('Failed to register owner certificate')
      return
    }

    const localAddress = createLibp2pAddress(identity.hiddenService.onionAddress, identity.peerId.id)

    let community: Community = {
      id: payload.id,
      name: payload.name,
      CA: payload.CA,
      rootCa: payload.rootCa,
      peerList: [localAddress],
      ownerCertificate: ownerCertResult.network.certificate,
      psk: psk,
    }

    await this.localDbService.setCommunity(community)
    await this.localDbService.setCurrentCommunityId(community.id)

    identity = {
      ...identity,
      userCertificate: ownerCertResult.network.certificate,
      id: payload.id,
    }
    await this.storageService.setIdentity(identity)
    await this.launchCommunity(community)

    const meta = await this.storageService.updateCommunityMetadata({
      id: community.id,
      rootCa: community.rootCa as string,
      ownerCertificate: community.ownerCertificate as string,
    })
    const currentCommunity = await this.localDbService.getCurrentCommunity()

    if (meta && currentCommunity) {
      community = {
        ...currentCommunity,
        ownerOrbitDbIdentity: meta.ownerOrbitDbIdentity,
      }
      await this.localDbService.setCommunity(community)
    }

    this.logger.info(`Created and launched community ${community.id}`)
    if (identity.userCsr?.userCsr) {
      await this.storageService.saveCSR({ csr: identity.userCsr.userCsr })
    }
    return community
  }

  // TODO: add back when QSS is implemented
  // public async downloadCommunityData(inviteData: InvitationDataV2) {
  //   this.logger.info('Downloading invite data', inviteData)
  //   this.storageServerProxyService.setServerAddress(inviteData.serverAddress)
  //   let downloadedData: ServerStoredCommunityMetadata
  //   try {
  //     downloadedData = await this.storageServerProxyService.downloadData(inviteData.cid)
  //   } catch (e) {
  //     this.logger.error(`Downloading community data failed`, e)
  //     return
  //   }
  //   return {
  //     psk: downloadedData.psk,
  //     peers: downloadedData.peerList,
  //     ownerOrbitDbIdentity: downloadedData.ownerOrbitDbIdentity,
  //   }
  // }

  public async joinCommunity(payload: InitCommunityPayload): Promise<Community | undefined> {
    this.logger.info('Joining community: peers:', payload.peers)
    const identity = await this.storageService.getIdentity(payload.id)

    if (!identity) {
      emitError(this.serverIoProvider.io, {
        type: SocketActionTypes.LAUNCH_COMMUNITY,
        message: ErrorMessages.IDENTITY_NOT_FOUND,
        community: payload.id,
      })
      return
    }

    const metadata = {
      psk: payload.psk,
      peers: payload.peers,
      ownerOrbitDbIdentity: payload.ownerOrbitDbIdentity,
    }

    const inviteData = payload.inviteData
    // TODO: add back when QSS is implemented
    // if (inviteData) {
    //   this.logger.info(`Joining community: inviteData version: ${inviteData.version}`)
    //   switch (inviteData.version) {
    //     case InvitationDataVersion.v2:
    //       const downloadedData = await this.downloadCommunityData(inviteData)
    //       if (!downloadedData) {
    //         emitError(this.serverIoProvider.io, {
    //           type: SocketActionTypes.LAUNCH_COMMUNITY,
    //           message: ErrorMessages.STORAGE_SERVER_CONNECTION_FAILED,
    //         })
    //         return
    //       }
    //       metadata = downloadedData
    //       break
    //   }
    // }

    if (!metadata.peers || metadata.peers.length === 0) {
      this.logger.error('Joining community: Peers required')
      return
    }

    if (!metadata.psk || !isPSKcodeValid(metadata.psk)) {
      this.logger.error('Joining community: Libp2p PSK is not valid')
      emitError(this.serverIoProvider.io, {
        type: SocketActionTypes.LAUNCH_COMMUNITY,
        message: ErrorMessages.NETWORK_SETUP_FAILED,
        community: payload.id,
      })
      return
    }

    if (!metadata.ownerOrbitDbIdentity) {
      this.logger.error('Joining community: ownerOrbitDbIdentity is not valid')
      emitError(this.serverIoProvider.io, {
        type: SocketActionTypes.LAUNCH_COMMUNITY,
        message: ErrorMessages.NETWORK_SETUP_FAILED,
        community: payload.id,
      })
      return
    }

    const localAddress = createLibp2pAddress(identity.hiddenService.onionAddress, identity.peerId.id)

    const community = {
      id: payload.id,
      peerList: [...new Set([localAddress, ...metadata.peers])],
      psk: metadata.psk,
      ownerOrbitDbIdentity: metadata.ownerOrbitDbIdentity,
      inviteData,
    }

    await this.localDbService.setCommunity(community)
    await this.localDbService.setCurrentCommunityId(community.id)

    await this.launchCommunity(community)
    this.logger.info(`Joined and launched community ${community.id}`)
    if (identity.userCsr?.userCsr) {
      await this.storageService.saveCSR({ csr: identity.userCsr.userCsr })
    }
    return community
  }

  public async launchCommunity(community: Community) {
    if ([ServiceState.LAUNCHING, ServiceState.LAUNCHED].includes(this.communityState)) {
      this.logger.error(
        'Cannot launch community more than once.' +
          ' Community has already been launched or is currently being launched.'
      )
      return
    }
    this.communityState = ServiceState.LAUNCHING
    this.logger.info(`Community state is now ${this.communityState}`)

    try {
      await this.launch(community)
    } catch (e) {
      this.logger.error(`Failed to launch community ${community.id}`, e)
      emitError(this.serverIoProvider.io, {
        type: SocketActionTypes.LAUNCH_COMMUNITY,
        message: ErrorMessages.COMMUNITY_LAUNCH_FAILED,
        community: community.id,
        trace: e.stack,
      })
      return
    }

    this.logger.info(`Launched community ${community.id}`)

    this.serverIoProvider.io.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, ConnectionProcessInfo.COMMUNITY_LAUNCHED)

    this.communityId = community.id
    this.communityState = ServiceState.LAUNCHED

    // Unblock websocket endpoints
    this.socketService.resolveReadyness()

    this.serverIoProvider.io.emit(SocketActionTypes.COMMUNITY_LAUNCHED, { id: community.id })
  }

  public async spawnTorHiddenService(communityId: string, identity: Identity): Promise<string> {
    this.logger.info(`Spawning hidden service for community ${communityId}, peer: ${identity.peerId.id}`)
    this.serverIoProvider.io.emit(
      SocketActionTypes.CONNECTION_PROCESS_INFO,
      ConnectionProcessInfo.SPAWNING_HIDDEN_SERVICE
    )
    return await this.tor.spawnHiddenService({
      targetPort: this.ports.libp2pHiddenService,
      privKey: identity.hiddenService.privateKey,
    })
  }

  public async launch(community: Community) {
    this.logger.info(`Launching community ${community.id}`)

    const identity = await this.storageService.getIdentity(community.id)
    if (!identity) {
      throw new Error(ErrorMessages.IDENTITY_NOT_FOUND)
    }

    const onionAddress = await this.spawnTorHiddenService(community.id, identity)

    const { Libp2pModule } = await import('../libp2p/libp2p.module')
    const moduleRef = await this.lazyModuleLoader.load(() => Libp2pModule)
    const { Libp2pService } = await import('../libp2p/libp2p.service')
    const lazyService = moduleRef.get(Libp2pService)
    this.libp2pService = lazyService

    const restoredRsa = await PeerId.createFromJSON(identity.peerId)
    const peerId = await peerIdFromKeys(restoredRsa.marshalPubKey(), restoredRsa.marshalPrivKey())
    const peers = filterValidAddresses(community.peerList ? community.peerList : [])
    const localAddress = createLibp2pAddress(onionAddress, peerId.toString())

    const params: Libp2pNodeParams = {
      peerId,
      listenAddresses: [this.libp2pService.createLibp2pListenAddress(onionAddress)],
      agent: this.socksProxyAgent,
      localAddress: localAddress,
      targetPort: this.ports.libp2pHiddenService,
      peers: peers.filter(p => p !== localAddress),
      psk: Libp2pService.generateLibp2pPSK(community.psk).fullKey,
    }
    await this.libp2pService.createInstance(params)

    // Libp2p event listeners
    this.libp2pService.on(Libp2pEvents.PEER_CONNECTED, async (payload: { peers: string[] }) => {
      this.serverIoProvider.io.emit(SocketActionTypes.PEER_CONNECTED, payload)
      for (const peer of payload.peers) {
        const peerStats: NetworkStats = {
          peerId: peer,
          connectionTime: 0,
          lastSeen: DateTime.utc().toSeconds(),
        }

        await this.localDbService.update(LocalDBKeys.PEERS, {
          [peer]: peerStats,
        })
      }
    })

    this.libp2pService.on(Libp2pEvents.PEER_DISCONNECTED, async (payload: NetworkDataPayload) => {
      const peerPrevStats = await this.localDbService.find(LocalDBKeys.PEERS, payload.peer)
      const prev = peerPrevStats?.connectionTime || 0

      const peerStats: NetworkStats = {
        peerId: payload.peer,
        connectionTime: prev + payload.connectionDuration,
        lastSeen: payload.lastSeen,
      }

      await this.localDbService.update(LocalDBKeys.PEERS, {
        [payload.peer]: peerStats,
      })
      // BARTEK: Potentially obsolete to send this to state-manager
      this.serverIoProvider.io.emit(SocketActionTypes.PEER_DISCONNECTED, payload)
    })

    await this.storageService.init(peerId)
    // We can use Nest for dependency injection, but I think since the
    // registration service depends on the storage service being
    // initialized, this is helpful to manually inject the storage
    // service for now. Both object construction and object
    // initialization need to happen in order based on dependencies.
    await this.registrationService.init(this.storageService)

    if (community.CA) {
      this.registrationService.setPermsData({
        certificate: community.CA.rootCertString,
        privKey: community.CA.rootKeyString,
      })
    }

    this.logger.info('Storage initialized')
    this.serverIoProvider.io.emit(
      SocketActionTypes.CONNECTION_PROCESS_INFO,
      ConnectionProcessInfo.CONNECTING_TO_COMMUNITY
    )
  }

  private attachTorEventsListeners() {
    this.logger.info('attachTorEventsListeners')

    this.tor.on(SocketActionTypes.CONNECTION_PROCESS_INFO, data => {
      this.serverIoProvider.io.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, data)
    })
    this.tor.on(SocketActionTypes.REDIAL_PEERS, async data => {
      this.logger.info(`Socket - ${SocketActionTypes.REDIAL_PEERS}`)
      const peerInfo = this.libp2pService?.getCurrentPeerInfo()
      await this.libp2pService?.redialPeers([...peerInfo.connected, ...peerInfo.dialed])
    })
    this.socketService.on(SocketActionTypes.CONNECTION_PROCESS_INFO, data => {
      this.serverIoProvider.io.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, data)
    })
  }

  private attachSocketServiceListeners() {
    // Community
    this.socketService.on(SocketActionTypes.CONNECTION, async () => {
      // Update Frontend with Initialized Communities
      if (this.communityId) {
        this.serverIoProvider.io.emit(SocketActionTypes.COMMUNITY_LAUNCHED, { id: this.communityId })
        this.logger.info('this.libp2pService.connectedPeers', this.libp2pService.connectedPeers)
        this.logger.info('this.libp2pService.dialedPeers', this.libp2pService.dialedPeers)
        this.serverIoProvider.io.emit(
          SocketActionTypes.CONNECTED_PEERS,
          Array.from(this.libp2pService.connectedPeers.keys())
        )
        this.serverIoProvider.io.emit(SocketActionTypes.CERTIFICATES_STORED, {
          certificates: await this.storageService?.loadAllCertificates(),
        })
        await this.storageService?.loadAllChannels()
      }
    })
    this.socketService.on(
      SocketActionTypes.CREATE_NETWORK,
      async (communityId: string, callback: (response: NetworkInfo | undefined) => void) => {
        this.logger.info(`socketService - ${SocketActionTypes.CREATE_NETWORK}`)
        callback(await this.createNetwork(communityId))
      }
    )
    this.socketService.on(
      SocketActionTypes.CREATE_IDENTITY,
      async (id: string, callback: (response: Identity | undefined) => void) => {
        this.logger.info(`socketService - ${SocketActionTypes.CREATE_IDENTITY}`)
        callback(await this.createIdentity(id))
      }
    )
    this.socketService.on(
      SocketActionTypes.CREATE_USER_CSR,
      async (payload: InitUserCsrPayload, callback: (response: Identity | undefined) => void) => {
        this.logger.info(`socketService - ${SocketActionTypes.CREATE_USER_CSR}`)
        callback(await this.addUserCsr(payload))
      }
    )
    this.socketService.on(
      SocketActionTypes.CREATE_COMMUNITY,
      async (args: InitCommunityPayload, callback: (response: Community | undefined) => void) => {
        this.logger.info(`socketService - ${SocketActionTypes.CREATE_COMMUNITY}`)
        callback(await this.createCommunity(args))
      }
    )
    // TODO: Rename to JOIN_COMMUNITY?
    this.socketService.on(
      SocketActionTypes.LAUNCH_COMMUNITY,
      async (args: InitCommunityPayload, callback: (response: Community | undefined) => void) => {
        this.logger.info(`socketService - ${SocketActionTypes.LAUNCH_COMMUNITY}`)
        callback(await this.joinCommunity(args))
      }
    )

    this.socketService.on(SocketActionTypes.LEAVE_COMMUNITY, async (callback: (closed: boolean) => void) => {
      this.logger.info(`socketService - ${SocketActionTypes.LEAVE_COMMUNITY}`)
      callback(await this.leaveCommunity())
    })

    // Username registration
    this.socketService.on(SocketActionTypes.ADD_CSR, async (payload: SaveCSRPayload) => {
      this.logger.info(`socketService - ${SocketActionTypes.ADD_CSR}`)
      await this.storageService?.saveCSR(payload)
    })

    // Public Channels
    this.socketService.on(
      SocketActionTypes.CREATE_CHANNEL,
      async (args: CreateChannelPayload, callback: (response?: CreateChannelResponse) => void) => {
        callback(await this.storageService?.subscribeToChannel(args.channel))
      }
    )
    this.socketService.on(
      SocketActionTypes.DELETE_CHANNEL,
      async (
        payload: { channelId: string; ownerPeerId: string },
        callback: (response: DeleteChannelResponse) => void
      ) => {
        callback(await this.storageService?.deleteChannel(payload))
      }
    )
    this.socketService.on(
      SocketActionTypes.DELETE_FILES_FROM_CHANNEL,
      async (payload: DeleteFilesFromChannelSocketPayload) => {
        this.logger.info(`socketService - ${SocketActionTypes.DELETE_FILES_FROM_CHANNEL}`, payload)
        await this.storageService?.deleteFilesFromChannel(payload)
        // await this.deleteFilesFromTemporaryDir() //crashes on mobile, will be fixes in next versions
      }
    )
    this.socketService.on(SocketActionTypes.SEND_MESSAGE, async (args: SendMessagePayload) => {
      await this.storageService?.sendMessage(args.message)
    })
    this.socketService.on(
      SocketActionTypes.GET_MESSAGES,
      async (payload: GetMessagesPayload, callback: (response?: MessagesLoadedPayload) => void) => {
        callback(await this.storageService?.getMessages(payload.channelId, payload.ids))
      }
    )

    // Files
    this.socketService.on(SocketActionTypes.DOWNLOAD_FILE, async (metadata: FileMetadata) => {
      await this.storageService?.downloadFile(metadata)
    })
    this.socketService.on(SocketActionTypes.UPLOAD_FILE, async (metadata: FileMetadata) => {
      await this.storageService?.uploadFile(metadata)
    })
    this.socketService.on(SocketActionTypes.FILE_UPLOADED, async (args: FileMetadata) => {
      await this.storageService?.uploadFile(args)
    })
    this.socketService.on(SocketActionTypes.CANCEL_DOWNLOAD, mid => {
      this.storageService?.cancelDownload(mid)
    })

    // System
    this.socketService.on(SocketActionTypes.CLOSE, async () => {
      await this.closeAllServices()
    })

    // User Profile
    this.socketService.on(SocketActionTypes.SET_USER_PROFILE, async (profile: UserProfile) => {
      await this.storageService?.addUserProfile(profile)
    })
  }

  private attachStorageListeners() {
    if (!this.storageService) return
    this.storageService.on(SocketActionTypes.CONNECTION_PROCESS_INFO, data => {
      this.serverIoProvider.io.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, data)
    })
    this.storageService.on(StorageEvents.CERTIFICATES_STORED, (payload: SendCertificatesResponse) => {
      this.logger.info(`Storage - ${StorageEvents.CERTIFICATES_STORED}`)
      this.serverIoProvider.io.emit(SocketActionTypes.CERTIFICATES_STORED, payload)
    })
    this.storageService.on(StorageEvents.CHANNELS_STORED, (payload: ChannelsReplicatedPayload) => {
      this.serverIoProvider.io.emit(SocketActionTypes.CHANNELS_STORED, payload)
    })
    this.storageService.on(StorageEvents.MESSAGES_STORED, (payload: MessagesLoadedPayload) => {
      this.serverIoProvider.io.emit(SocketActionTypes.MESSAGES_STORED, payload)
    })
    this.storageService.on(StorageEvents.MESSAGE_IDS_STORED, (payload: ChannelMessageIdsResponse) => {
      if (payload.ids.length === 0) {
        return
      }
      this.serverIoProvider.io.emit(SocketActionTypes.MESSAGE_IDS_STORED, payload)
    })
    this.storageService.on(StorageEvents.CHANNEL_SUBSCRIBED, (payload: ChannelSubscribedPayload) => {
      this.serverIoProvider.io.emit(SocketActionTypes.CHANNEL_SUBSCRIBED, payload)
    })
    this.storageService.on(StorageEvents.REMOVE_DOWNLOAD_STATUS, (payload: RemoveDownloadStatus) => {
      this.serverIoProvider.io.emit(SocketActionTypes.REMOVE_DOWNLOAD_STATUS, payload)
    })
    this.storageService.on(StorageEvents.FILE_UPLOADED, (payload: UploadFilePayload) => {
      this.serverIoProvider.io.emit(SocketActionTypes.FILE_UPLOADED, payload)
    })
    this.storageService.on(StorageEvents.DOWNLOAD_PROGRESS, (payload: DownloadStatus) => {
      this.serverIoProvider.io.emit(SocketActionTypes.DOWNLOAD_PROGRESS, payload)
    })
    this.storageService.on(StorageEvents.MESSAGE_MEDIA_UPDATED, (payload: FileMetadata) => {
      this.serverIoProvider.io.emit(SocketActionTypes.MESSAGE_MEDIA_UPDATED, payload)
    })
    this.storageService.on(StorageEvents.COMMUNITY_UPDATED, (payload: Community) => {
      this.serverIoProvider.io.emit(SocketActionTypes.COMMUNITY_UPDATED, payload)
    })
    this.storageService.on(StorageEvents.SEND_PUSH_NOTIFICATION, (payload: PushNotificationPayload) => {
      this.serverIoProvider.io.emit(SocketActionTypes.PUSH_NOTIFICATION, payload)
    })
    this.storageService.on(StorageEvents.CSRS_STORED, async (payload: { csrs: string[] }) => {
      this.logger.info(`Storage - ${StorageEvents.CSRS_STORED}`)
      this.libp2pService.emit(Libp2pEvents.DIAL_PEERS, await getLibp2pAddressesFromCsrs(payload.csrs))
      this.serverIoProvider.io.emit(SocketActionTypes.CSRS_STORED, payload)
      this.registrationService.emit(RegistrationEvents.REGISTER_USER_CERTIFICATE, payload)
    })
    this.storageService.on(StorageEvents.COMMUNITY_METADATA_STORED, async (meta: CommunityMetadata) => {
      this.logger.info(`Storage - ${StorageEvents.COMMUNITY_METADATA_STORED}: ${meta}`)
      const community = await this.localDbService.getCurrentCommunity()

      if (community) {
        const rootCaCert = loadCertificate(meta.rootCa)
        const communityName = getCertFieldValue(rootCaCert, CertFieldsTypes.commonName)

        if (!communityName) {
          this.logger.error(`Could not retrieve ${CertFieldsTypes.commonName} from CommunityMetadata.rootCa`)
        }

        const updatedCommunity = {
          ...community,
          name: communityName ?? undefined,
          rootCa: meta.rootCa,
          ownerCertificate: meta.ownerCertificate,
          ownerOrbitDbIdentity: meta.ownerOrbitDbIdentity,
        }
        await this.localDbService.setCommunity(updatedCommunity)

        this.serverIoProvider.io.emit(SocketActionTypes.COMMUNITY_UPDATED, updatedCommunity)
      }
    })
    this.storageService.on(StorageEvents.USER_PROFILES_STORED, (payload: UserProfilesStoredEvent) => {
      this.serverIoProvider.io.emit(SocketActionTypes.USER_PROFILES_STORED, payload)
    })
    this.storageService.on(StorageEvents.IDENTITY_STORED, (payload: Identity) => {
      this.serverIoProvider.io.emit(SocketActionTypes.IDENTITY_STORED, payload)
    })
  }
}
