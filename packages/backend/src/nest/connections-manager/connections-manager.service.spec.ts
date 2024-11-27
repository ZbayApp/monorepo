import { jest } from '@jest/globals'
import { LazyModuleLoader } from '@nestjs/core'
import { Test, TestingModule } from '@nestjs/testing'
import { getFactory, identity, prepareStore, type Store, type communities } from '@quiet/state-manager'
import { type Community, type Identity, type InitCommunityPayload } from '@quiet/types'
import { type FactoryGirl } from 'factory-girl'
import PeerId from 'peer-id'
import { TestModule } from '../common/test.module'
import { libp2pInstanceParams, removeFilesFromDir } from '../common/utils'
import { QUIET_DIR, TOR_PASSWORD_PROVIDER } from '../const'
import { Libp2pModule } from '../libp2p/libp2p.module'
import { Libp2pService } from '../libp2p/libp2p.service'
import { LocalDbModule } from '../local-db/local-db.module'
import { LocalDbService } from '../local-db/local-db.service'
import { LocalDBKeys } from '../local-db/local-db.types'
import { RegistrationModule } from '../registration/registration.module'
import { RegistrationService } from '../registration/registration.service'
import { SocketModule } from '../socket/socket.module'
import { ConnectionsManagerModule } from './connections-manager.module'
import { ConnectionsManagerService } from './connections-manager.service'
import { createLibp2pAddress } from '@quiet/common'
import { SigChain } from '../auth/sigchain'
import { createLogger } from '../common/logger'
import { Logger } from '@nestjs/common'
import { SigChainService } from '../auth/sigchain.service'

const logger = createLogger('connections-manager.service.spec')

describe('ConnectionsManagerService', () => {
  let module: TestingModule
  let connectionsManagerService: ConnectionsManagerService
  let localDbService: LocalDbService
  let registrationService: RegistrationService
  let libp2pService: Libp2pService
  let lazyModuleLoader: LazyModuleLoader
  let quietDir: string
  let store: Store
  let factory: FactoryGirl
  let community: Community
  let userIdentity: Identity
  let communityRootCa: string
  let peerId: PeerId
  let sigChainService: SigChainService

  beforeEach(async () => {
    jest.clearAllMocks()
    store = prepareStore().store
    factory = await getFactory(store)
    communityRootCa = 'rootCa'
    community = await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community', {
      rootCa: communityRootCa,
    })
    userIdentity = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'john',
    })

    module = await Test.createTestingModule({
      imports: [TestModule, ConnectionsManagerModule, LocalDbModule, RegistrationModule, SocketModule, Libp2pModule],
    })
      .overrideProvider(TOR_PASSWORD_PROVIDER)
      .useValue({ torPassword: '', torHashedPassword: '' })
      .compile()

    connectionsManagerService = await module.resolve(ConnectionsManagerService)
    localDbService = await module.resolve(LocalDbService)
    registrationService = await module.resolve(RegistrationService)
    sigChainService = await module.resolve(SigChainService)

    // initialize sigchain on local db
    sigChainService.createChain(community.name!, userIdentity.nickname, false)
    sigChainService.saveChain(community.name!)
    sigChainService.deleteChain(community.name!, false)

    lazyModuleLoader = await module.resolve(LazyModuleLoader)
    const { Libp2pModule: Module } = await import('../libp2p/libp2p.module')
    const moduleRef = await lazyModuleLoader.load(() => Module)
    const { Libp2pService } = await import('../libp2p/libp2p.service')
    libp2pService = moduleRef.get(Libp2pService)
    const params = await libp2pInstanceParams()
    peerId = params.peerId
    await libp2pService.createInstance(params)
    expect(libp2pService.libp2pInstance).not.toBeNull()

    connectionsManagerService.libp2pService = libp2pService

    quietDir = await module.resolve(QUIET_DIR)
  })

  afterEach(async () => {
    await libp2pService.libp2pInstance?.stop()
    if (connectionsManagerService) {
      await connectionsManagerService.closeAllServices()
    }
    removeFilesFromDir(quietDir)
  })

  afterAll(async () => {
    await module.close()
  })

  it('should be defined', () => {
    expect(connectionsManagerService).toBeDefined()
  })

  it('launches community on init if its data exists in local db', async () => {
    logger.info('launches community on init if its data exists in local db')
    const remotePeer = createLibp2pAddress(
      'y7yczmugl2tekami7sbdz5pfaemvx7bahwthrdvcbzw5vex2crsr26qd',
      'QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wfFJDPPLsbKSE'
    )

    // Using the factory includes extra properties that affect the assertion
    // below
    const actualCommunity = {
      id: community.id,
      name: community.name,
      peerList: [remotePeer],
    }
    // await localDbService.setSigChain(sigChain)
    await localDbService.setCommunity(actualCommunity)
    await localDbService.setCurrentCommunityId(community.id)

    await localDbService.setIdentity(userIdentity)

    logger.info('Closing all services')
    await connectionsManagerService.closeAllServices()

    const launchCommunitySpy = jest.spyOn(connectionsManagerService, 'launchCommunity').mockResolvedValue()

    await connectionsManagerService.init()

    const localPeerAddress = createLibp2pAddress(userIdentity.hiddenService.onionAddress, userIdentity.peerId.id)
    const updatedLaunchCommunityPayload = { ...actualCommunity, peerList: [localPeerAddress, remotePeer] }

    logger.info('updatedLaunchCommunityPayload', updatedLaunchCommunityPayload)

    // expect(launchCommunitySpy).toHaveBeenCalledWith(updatedLaunchCommunityPayload)
    expect(launchCommunitySpy).toBeCalledWith(updatedLaunchCommunityPayload)
    expect(sigChainService.getActiveChain()).toBeDefined()
    expect(sigChainService.getActiveChain()?.team.teamName).toBe(community.name)
  })

  it('does not launch community on init if its data does not exist in local db', async () => {
    logger.info('does not launch community on init if its data does not exist in local db')
    await connectionsManagerService.closeAllServices()
    await connectionsManagerService.init()
    const launchCommunitySpy = jest.spyOn(connectionsManagerService, 'launchCommunity')
    expect(launchCommunitySpy).not.toHaveBeenCalled()
  })

  it('community is only launched once', async () => {
    await localDbService.setCommunity(community)
    await localDbService.setCurrentCommunityId(community.id)

    //@ts-ignore
    const launchSpy = jest.spyOn(connectionsManagerService, 'launch').mockResolvedValue('address')

    await Promise.all([
      connectionsManagerService.launchCommunity(community),
      connectionsManagerService.launchCommunity(community),
    ])

    expect(launchSpy).toBeCalledTimes(1)
  })

  it('Bug reproduction - Error on startup - Error: TOR: Connection already established - Trigger launchCommunity from backend and state manager', async () => {
    await localDbService.setCommunity(community)
    await localDbService.setCurrentCommunityId(community.id)

    await localDbService.setIdentity(userIdentity)

    const peerid = 'QmaEvCkpUG7GxhgvMkk8wxurfi1ehjHhSUNRksWTmXN2ix'
    await localDbService.put(LocalDBKeys.PEERS, {
      [peerid]: {
        peerId: peerid,
        connectionTime: 50,
        lastSeen: 1000,
      },
    })

    await connectionsManagerService.closeAllServices()

    const launchCommunitySpy = jest.spyOn(connectionsManagerService, 'launchCommunity').mockResolvedValue()

    await connectionsManagerService.init()

    expect(launchCommunitySpy).toBeCalledTimes(1)
  })
})
