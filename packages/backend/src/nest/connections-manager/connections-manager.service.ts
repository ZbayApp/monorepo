import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { Crypto } from '@peculiar/webcrypto'
import { EventEmitter } from 'events'
import fs from 'fs'
import getPort from 'get-port'
import { Agent } from 'https'
import path from 'path'
import { CryptoEngine, setEngine } from 'pkijs'
import { createPeerId, getUsersFromCsrs, removeFilesFromDir } from '../common/utils'

import { createLibp2pAddress, filterValidAddresses, isPSKcodeValid } from '@quiet/common'
import {
  CertFieldsTypes,
  createRootCA,
  createUserCsr,
  configCrypto,
  getCertFieldValue,
  getPubKey,
  loadCertificate,
  loadPrivateKey,
  pubKeyFromCsr,
} from '@quiet/identity'
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
  PeerId as QuietPeerId,
  InvitationDataVersion,
  InvitationDataV2,
  PermissionsError,
  HiddenService,
} from '@quiet/types'
import { CONFIG_OPTIONS, HEADLESS_OPTIONS, QUIET_DIR, SERVER_IO_PROVIDER, SOCKS_PROXY_AGENT } from '../const'
import { Libp2pService } from '../libp2p/libp2p.service'
import { CreatedLibp2pPeerId, Libp2pEvents, Libp2pNodeParams, Libp2pPeerInfo } from '../libp2p/libp2p.types'
import { LocalDbService } from '../local-db/local-db.service'
import { LocalDBKeys } from '../local-db/local-db.types'
import { RegistrationService } from '../registration/registration.service'
import { RegistrationEvents } from '../registration/registration.types'
import { emitError } from '../socket/socket.errors'
import { SocketService } from '../socket/socket.service'
import { StorageService } from '../storage/storage.service'
import { StorageEvents } from '../storage/storage.types'
import { Tor } from '../tor/tor.service'
import { ConfigOptions, GetPorts, HeadlessOptions, ServerIoProviderTypes } from '../types'
import { ServiceState, TorInitState } from './connections-manager.types'
import { DateTime } from 'luxon'
import { createLogger } from '../common/logger'
import { peerIdFromString } from '@libp2p/peer-id'
import { privateKeyFromRaw } from '@libp2p/crypto/keys'
import { SigChainService } from '../auth/sigchain.service'
import { Base58, InviteResult } from '3rd-party/auth/packages/auth/dist'

@Injectable()
export class ConnectionsManagerService extends EventEmitter implements OnModuleInit {
  public communityId: string
  public communityState: ServiceState
  private ports: GetPorts
  isTorInit: TorInitState = TorInitState.NOT_STARTED
  private peerInfo: Libp2pPeerInfo | undefined = undefined
  public readonly headless: boolean

  private readonly logger = createLogger(ConnectionsManagerService.name)
  constructor(
    @Inject(SERVER_IO_PROVIDER) public readonly serverIoProvider: ServerIoProviderTypes,
    @Inject(CONFIG_OPTIONS) public configOptions: ConfigOptions,
    @Inject(QUIET_DIR) public readonly quietDir: string,
    @Inject(SOCKS_PROXY_AGENT) public readonly socksProxyAgent: Agent,
    @Inject(HEADLESS_OPTIONS) private readonly headlessOptions: HeadlessOptions,
    private readonly socketService: SocketService,
    private readonly registrationService: RegistrationService,
    public readonly libp2pService: Libp2pService,
    private readonly localDbService: LocalDbService,
    private readonly storageService: StorageService,
    private readonly tor: Tor,
    private readonly sigChainService: SigChainService
  ) {
    super()
    this.headless = !!headlessOptions
  }

  async onModuleInit() {
    process.on('unhandledRejection', reason => {
      // console.log(`why won't this log rejection`, (reason as any).message)
      this.logger.error(`Unhandled rejection`, reason)
      throw new Error(`Unhandled Rejection`)
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
    const community: Community | undefined = await this.localDbService.getCurrentCommunity()
    if (!community) {
      this.logger.info('No community found in storage')
      return
    }

    const identity = await this.storageService.getIdentity(community.id)
    if (!identity) {
      this.logger.warn('No identity found in storage')
      return
    }

    if (community.name) {
      try {
        this.logger.info('Loading sigchain for community', community.name)
        await this.sigChainService.loadChain(community.name, true)
      } catch (e) {
        this.logger.warn('Failed to load sigchain', e)
      }
    } else {
      this.logger.warn('No community name found in storage')
    }

    const sortedPeers = await this.localDbService.getSortedPeers(community.peerList ?? [])
    this.logger.info('launchCommunityFromStorage - sorted peers', sortedPeers)
    if (sortedPeers.length > 0) {
      community.peerList = sortedPeers
    }
    await this.localDbService.setCommunity(community)

    this.logger.info('Launching community from storage with peers', community.peerList)
    await this.launchCommunity(community)
  }

  public async closeSocket() {
    await this.socketService.close()
  }

  public async saveActiveChain() {
    try {
      await this.sigChainService.saveChain(this.sigChainService.activeChainTeamName!)
    } catch (e) {
      this.logger.info('Failed to save active chain', e)
    }
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

  public async closeAllServices(
    options: { saveTor: boolean; closeDatastore: boolean } = { saveTor: false, closeDatastore: true }
  ) {
    this.logger.info('Saving active sigchain')
    await this.saveActiveChain()
    await this.sigChainService.deleteChain(this.sigChainService.activeChainTeamName!, false)

    this.logger.info('Closing services', options)

    await this.closeSocket()

    if (this.tor && !options.saveTor) {
      this.logger.info('Killing tor')
      await this.tor.kill()
    } else if (options.saveTor) {
      this.logger.info('Saving tor')
    }
    if (this.storageService) {
      this.logger.info('Stopping StorageService')
      await this.storageService?.stop()
    }
    if (this.libp2pService) {
      this.logger.info('Stopping libp2p')
      await this.libp2pService.close(options.closeDatastore)
    }
    if (this.localDbService) {
      this.logger.info('Closing local DB')
      await this.localDbService.close()
    }
  }

  public async leaveCommunity(): Promise<boolean> {
    this.logger.info('Running leaveCommunity')

    await this.closeAllServices({ saveTor: true, closeDatastore: false })

    this.logger.info('Resetting StorageService')
    await this.storageService.clean()

    this.logger.info('Cleaning libp2p datastore')
    await this.libp2pService.cleanDatastore()

    this.logger.info('Closing libp2p datastore')
    await this.libp2pService.closeDatastore()

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
          i.startsWith('Ipfs') ||
          i.startsWith('OrbitDB') ||
          i.startsWith('backendDB') ||
          i.startsWith('Local Storage') ||
          i.startsWith('libp2pDatastore') ||
          i.startsWith('databases')
      )
    for (const dir of dirsToRemove) {
      const dirPath = path.join(this.quietDir, dir)
      this.logger.info(`Removing dir: ${dirPath}`)
      removeFilesFromDir(dirPath)
    }
  }

  public async getNetwork(): Promise<NetworkInfo> {
    this.logger.info('Getting network information')

    let hiddenService: HiddenService | undefined = undefined
    if (this.headlessOptions == null) {
      this.logger.info('Creating hidden service')
      hiddenService = await this.tor.createNewHiddenService({ targetPort: this.ports.libp2pHiddenService })

      this.logger.info('Destroying the hidden service we created')
      await this.tor.destroyHiddenService(hiddenService.onionAddress.split('.')[0])
    } else {
      this.logger.info(`Skipping tor hidden service generation in headless mode`)
    }

    // TODO: Do we want to create the PeerId here? It doesn't necessarily have
    // anything to do with Tor.
    this.logger.info('Getting peer ID')
    const peerId = await createPeerId()
    const peerIdJson: QuietPeerId = {
      id: peerId.peerId.toString(),
      privKey: uint8ArrayToString(peerId.privKey.raw, 'base64'),
      noiseKey: uint8ArrayToString(peerId.noiseKey, 'base64'),
    }
    this.logger.info(`Created network for peer ${peerId.toString()}. Tor address: ${hiddenService?.onionAddress}`)

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

    const commonName = this.headless ? this.headlessOptions.hostname : identity.hiddenService!.onionAddress
    if (identity?.userCsr) {
      this.logger.info('Recreating user CSR')
      if (identity.userCsr?.userCsr == null || identity.userCsr.userKey == null) {
        this.logger.error('identity.userCsr?.userCsr == null || identity.userCsr.userKey == null')
        return
      }
      const _pubKey = pubKeyFromCsr(identity.userCsr.userCsr)
      const publicKey = await getPubKey(_pubKey)
      const privateKey = await loadPrivateKey(identity.userCsr.userKey, configCrypto.signAlg)

      const existingKeyPair: CryptoKeyPair = { privateKey, publicKey }

      createUserCsrPayload = {
        nickname,
        commonName,
        peerId: identity.peerId.id,
        signAlg: configCrypto.signAlg,
        hashAlg: configCrypto.hashAlg,
        existingKeyPair,
      }
    } else {
      this.logger.info('Creating new user CSR')
      createUserCsrPayload = {
        nickname,
        commonName,
        peerId: identity.peerId.id,
        signAlg: configCrypto.signAlg,
        hashAlg: configCrypto.hashAlg,
      }
    }

    let userCsr: UserCsr
    try {
      this.logger.info(`Creating user csr for username ${createUserCsrPayload.nickname}`)
      userCsr = await createUserCsr(createUserCsrPayload)
    } catch (e) {
      emitError(this.serverIoProvider.io, {
        type: SocketActionTypes.CREATE_USER_CSR,
        message: ErrorMessages.USER_CSR_CREATION_FAILED,
        community: communityId,
      })
      return
    }

    identity = { ...identity, userCsr, nickname }
    this.logger.info('Created user CSR')
    await this.storageService.setIdentity(identity)
    this.logger.info(`Current identity in storage: ${await this.storageService.getIdentity(identity.id)}`)
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

    const peerAddress = this.headless ? this.headlessOptions.hostname : identity.hiddenService!.onionAddress
    const localAddress = createLibp2pAddress(peerAddress, identity.peerId.id)

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

    if (!community.name) {
      this.logger.error('Community name is required to create sigchain')
      return community
    }
    this.logger.info(`Creating new LFA chain`)
    await this.sigChainService.createChain(community.name, identity.nickname, true)

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

    // this is the forever invite that all users get
    this.logger.info(`Creating long lived LFA invite code`)
    this.socketService.emit(SocketActionTypes.CREATE_LONG_LIVED_LFA_INVITE)
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
      name: payload.name,
    }

    const inviteData = payload.inviteData
    let communityName: string | undefined
    if (inviteData && inviteData?.version == InvitationDataVersion.v2) {
      communityName = (payload.inviteData as InvitationDataV2).authData.communityName
      this.sigChainService.createChainFromInvite(identity.nickname, communityName, inviteData.authData.seed, true)
    }

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

    const peerAddress = this.headless ? this.headlessOptions.hostname : identity.hiddenService!.onionAddress
    const localAddress = createLibp2pAddress(peerAddress, identity.peerId.id)

    const community = {
      id: payload.id,
      name: communityName,
      peerList: [...new Set([localAddress, ...metadata.peers])],
      psk: metadata.psk,
      ownerOrbitDbIdentity: metadata.ownerOrbitDbIdentity,
      inviteData,
    }

    await this.localDbService.setCommunity(community)
    await this.localDbService.setCurrentCommunityId(community.id)
    await this.launchCommunity(community)
    if (identity.userCsr?.userCsr) {
      await this.storageService.saveCSR({ csr: identity.userCsr.userCsr })
    }
    this.logger.info(`Joined and launched community ${community.id}`)
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
      privKey: identity.hiddenService!.privateKey,
    })
  }

  public async launch(community: Community) {
    this.logger.info(`Launching community ${community.id}`)

    const identity = await this.storageService.getIdentity(community.id)
    if (!identity) {
      throw new Error(ErrorMessages.IDENTITY_NOT_FOUND)
    }

    this.logger.info(JSON.stringify(identity.peerId, null, 2))
    const peerIdData: CreatedLibp2pPeerId = {
      peerId: peerIdFromString(identity.peerId.id),
      privKey: privateKeyFromRaw(Buffer.from(identity.peerId.privKey, 'base64')),
      noiseKey: Buffer.from(identity.peerId.noiseKey, 'base64'),
    }
    this.logger.info(peerIdData.peerId.toString())
    const peers = filterValidAddresses(community.peerList ? community.peerList : [])
    const peerAddress = this.headless
      ? this.headlessOptions.hostname
      : await this.spawnTorHiddenService(community.id, identity)
    const localAddress = this.libp2pService.createLibp2pAddress(
      peerAddress,
      peerIdData.peerId.toString(),
      this.headless
    )
    const listenAddress = this.libp2pService.createLibp2pListenAddress(peerAddress, this.headless)

    const params: Libp2pNodeParams = {
      peerId: peerIdData,
      listenAddresses: [listenAddress],
      agent: this.socksProxyAgent,
      localAddress: localAddress,
      targetPort: this.ports.libp2pHiddenService,
      psk: Libp2pService.generateLibp2pPSK(community.psk).fullKey,
      headless: this.headless,
    }
    await this.libp2pService.createInstance(params)

    // Libp2p event listeners
    this.libp2pService.on(Libp2pEvents.PEER_CONNECTED, async (payload: { peers: string[] }) => {
      this.logger.info(`Handling ${Libp2pEvents.PEER_CONNECTED} event - adding network stats`, payload)
      for (const peer of payload.peers) {
        const peerStats: NetworkStats = {
          peerId: peer,
          connectionTime: 0,
          lastSeen: DateTime.utc().toSeconds(),
        }

        await this.localDbService.update(LocalDBKeys.PEERS, {
          [peer]: peerStats,
        })

        this.serverIoProvider.io.emit(SocketActionTypes.PEER_CONNECTED, {
          peer: peerStats.peerId,
          lastSeen: peerStats.lastSeen,
          connectionDuration: 0,
        })
      }
    })

    this.libp2pService.on(Libp2pEvents.PEER_DISCONNECTED, async (payload: NetworkDataPayload) => {
      this.logger.info(`Handling ${Libp2pEvents.PEER_DISCONNECTED} event - updating connection time`, payload)
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

      this.serverIoProvider.io.emit(SocketActionTypes.PEER_DISCONNECTED, payload)
    })

    await this.storageService.init(peerIdData.peerId)
    // We can use Nest for dependency injection, but I think since the
    // registration service depends on the storage service being
    // initialized, this is helpful to manually inject the storage
    // service for now. Both object construction and object
    // initialization need to happen in order based on dependencies.
    this.registrationService.init(this.storageService)

    if (community.CA) {
      this.registrationService.setPermsData({
        certificate: community.CA.rootCertString,
        privKey: community.CA.rootKeyString,
      })
    }

    // FIXME: Don't await this
    // FIXME: Wait until Tor is bootstrapped to dial peers
    this.libp2pService.dialPeers(peers ?? [])

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
      await this.libp2pService?.redialPeers()
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
        await this.storageService?.channels.loadAllChannels()
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

    // Local First Auth

    this.socketService.on(
      SocketActionTypes.CREATE_LONG_LIVED_LFA_INVITE,
      async (callback?: (response: InviteResult | undefined) => void) => {
        this.logger.info(`socketService - ${SocketActionTypes.CREATE_LONG_LIVED_LFA_INVITE}`)

        if (this.sigChainService.activeChainTeamName == null) {
          this.logger.warn(`No sigchain configured, skipping long lived LFA invite code generation!`)
          callback?.(undefined)
          return
        }

        try {
          const invite = this.sigChainService.getActiveChain().invites.createLongLivedUserInvite()
          await this.sigChainService.saveChain(this.sigChainService.activeChainTeamName)
          this.serverIoProvider.io.emit(SocketActionTypes.CREATED_LONG_LIVED_LFA_INVITE, invite)
          callback?.(invite)
        } catch (e) {
          if (e instanceof PermissionsError) {
            this.logger.info(e.message)
            callback?.(undefined)
          } else {
            this.logger.error(`Failed to generate a new long lived LFA invite code!`, e)
            callback?.(undefined)
          }
        }
      }
    )

    this.socketService.on(
      SocketActionTypes.VALIDATE_OR_CREATE_LONG_LIVED_LFA_INVITE,
      async (
        inviteId: Base58,
        callback: (response: { valid: boolean; newInvite?: InviteResult } | undefined) => void
      ) => {
        this.logger.info(`socketService - ${SocketActionTypes.VALIDATE_OR_CREATE_LONG_LIVED_LFA_INVITE}`)

        if (this.sigChainService.activeChainTeamName == null) {
          this.logger.warn(`No sigchain configured, skipping long lived LFA invite code validation/generation!`)
          callback(undefined)
          return
        }

        if (this.sigChainService.getActiveChain().invites.isValidLongLivedUserInvite(inviteId)) {
          callback({ valid: true })
        } else {
          try {
            const newInvite = this.sigChainService.getActiveChain().invites.createLongLivedUserInvite()
            await this.sigChainService.saveChain(this.sigChainService.activeChainTeamName)
            this.serverIoProvider.io.emit(SocketActionTypes.CREATED_LONG_LIVED_LFA_INVITE, newInvite)
            callback({ valid: false, newInvite })
          } catch (e) {
            e instanceof PermissionsError
              ? this.logger.info(e.message)
              : this.logger.error(`Failed to generate a new long lived LFA invite code!`, e)
            callback({ valid: false })
          }
        }
      }
    )

    // Username registration

    this.socketService.on(SocketActionTypes.ADD_CSR, async (payload: SaveCSRPayload) => {
      this.logger.info(`socketService - ${SocketActionTypes.ADD_CSR}`)
      await this.storageService?.saveCSR(payload)
    })

    // Public Channels

    this.socketService.on(
      SocketActionTypes.CREATE_CHANNEL,
      async (args: CreateChannelPayload, callback: (response?: CreateChannelResponse) => void) => {
        callback(await this.storageService?.channels.subscribeToChannel(args.channel))
      }
    )
    this.socketService.on(
      SocketActionTypes.DELETE_CHANNEL,
      async (
        payload: { channelId: string; ownerPeerId: string },
        callback: (response: DeleteChannelResponse) => void
      ) => {
        callback(await this.storageService?.channels.deleteChannel(payload))
      }
    )
    this.socketService.on(
      SocketActionTypes.DELETE_FILES_FROM_CHANNEL,
      async (payload: DeleteFilesFromChannelSocketPayload) => {
        this.logger.info(`socketService - ${SocketActionTypes.DELETE_FILES_FROM_CHANNEL}`)
        await this.storageService?.channels.deleteFilesFromChannel(payload)
        // await this.deleteFilesFromTemporaryDir() //crashes on mobile, will be fixes in next versions
      }
    )
    this.socketService.on(SocketActionTypes.SEND_MESSAGE, async (args: SendMessagePayload) => {
      await this.storageService?.channels.sendMessage(args.message)
    })
    this.socketService.on(
      SocketActionTypes.GET_MESSAGES,
      async (payload: GetMessagesPayload, callback: (response?: MessagesLoadedPayload) => void) => {
        callback(await this.storageService?.channels.getMessages(payload.channelId, payload.ids))
      }
    )

    // Files
    this.socketService.on(SocketActionTypes.DOWNLOAD_FILE, async (metadata: FileMetadata) => {
      await this.storageService?.channels.downloadFile(metadata)
    })
    this.socketService.on(SocketActionTypes.UPLOAD_FILE, async (metadata: FileMetadata) => {
      await this.storageService?.channels.uploadFile(metadata)
    })
    this.socketService.on(SocketActionTypes.FILE_UPLOADED, async (args: FileMetadata) => {
      await this.storageService?.channels.uploadFile(args)
    })
    this.socketService.on(SocketActionTypes.CANCEL_DOWNLOAD, mid => {
      this.storageService?.channels.cancelDownload(mid)
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
    // Channel and Message Events
    this.storageService.channels.on(StorageEvents.CHANNELS_STORED, (payload: ChannelsReplicatedPayload) => {
      this.serverIoProvider.io.emit(SocketActionTypes.CHANNELS_STORED, payload)
    })
    this.storageService.channels.on(StorageEvents.MESSAGES_STORED, (payload: MessagesLoadedPayload) => {
      this.serverIoProvider.io.emit(SocketActionTypes.MESSAGES_STORED, payload)
    })
    this.storageService.channels.on(StorageEvents.MESSAGE_IDS_STORED, (payload: ChannelMessageIdsResponse) => {
      if (payload.ids.length === 0) {
        return
      }
      this.serverIoProvider.io.emit(SocketActionTypes.MESSAGE_IDS_STORED, payload)
    })
    this.storageService.channels.on(StorageEvents.CHANNEL_SUBSCRIBED, (payload: ChannelSubscribedPayload) => {
      this.serverIoProvider.io.emit(SocketActionTypes.CHANNEL_SUBSCRIBED, payload)
    })
    this.storageService.channels.on(StorageEvents.REMOVE_DOWNLOAD_STATUS, (payload: RemoveDownloadStatus) => {
      this.serverIoProvider.io.emit(SocketActionTypes.REMOVE_DOWNLOAD_STATUS, payload)
    })
    this.storageService.channels.on(StorageEvents.FILE_UPLOADED, (payload: UploadFilePayload) => {
      this.serverIoProvider.io.emit(SocketActionTypes.FILE_UPLOADED, payload)
    })
    this.storageService.channels.on(StorageEvents.DOWNLOAD_PROGRESS, (payload: DownloadStatus) => {
      this.serverIoProvider.io.emit(SocketActionTypes.DOWNLOAD_PROGRESS, payload)
    })
    this.storageService.channels.on(StorageEvents.MESSAGE_MEDIA_UPDATED, (payload: FileMetadata) => {
      this.serverIoProvider.io.emit(SocketActionTypes.MESSAGE_MEDIA_UPDATED, payload)
    })
    this.storageService.channels.on(StorageEvents.SEND_PUSH_NOTIFICATION, (payload: PushNotificationPayload) => {
      this.serverIoProvider.io.emit(SocketActionTypes.PUSH_NOTIFICATION, payload)
    })
    // Other Events
    this.storageService.on(SocketActionTypes.CONNECTION_PROCESS_INFO, data => {
      this.serverIoProvider.io.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, data)
    })
    this.storageService.on(StorageEvents.CERTIFICATES_STORED, (payload: SendCertificatesResponse) => {
      this.logger.info(`Storage - ${StorageEvents.CERTIFICATES_STORED}`)
      this.serverIoProvider.io.emit(SocketActionTypes.CERTIFICATES_STORED, payload)
    })
    this.storageService.on(StorageEvents.COMMUNITY_UPDATED, (payload: Community) => {
      this.serverIoProvider.io.emit(SocketActionTypes.COMMUNITY_UPDATED, payload)
    })
    this.storageService.on(StorageEvents.CSRS_STORED, async (payload: { csrs: string[] }) => {
      this.logger.info(`Storage - ${StorageEvents.CSRS_STORED}`)
      const users = await getUsersFromCsrs(payload.csrs)
      this.logger.info(`CSRS => Users`, payload.csrs, users)
      this.serverIoProvider.io.emit(SocketActionTypes.CSRS_STORED, payload)
      this.libp2pService.dialUsers(users)
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
