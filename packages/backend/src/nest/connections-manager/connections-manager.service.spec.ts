import { jest } from '@jest/globals'

import { Test, TestingModule } from '@nestjs/testing'
import { getFactory, prepareStore, type Store, type communities, type identity } from '@quiet/state-manager'
import { type Community, type Identity, type InitCommunityPayload } from '@quiet/types'
import { type FactoryGirl } from 'factory-girl'
import { TestModule } from '../common/test.module'
import { removeFilesFromDir } from '../common/utils'
import { QUIET_DIR, TOR_PASSWORD_PROVIDER } from '../const'
import { Libp2pModule } from '../libp2p/libp2p.module'
import { LocalDbModule } from '../local-db/local-db.module'
import { LocalDbService } from '../local-db/local-db.service'
import { LocalDBKeys } from '../local-db/local-db.types'
import { RegistrationModule } from '../registration/registration.module'
import { SocketModule } from '../socket/socket.module'
import { ConnectionsManagerModule } from './connections-manager.module'
import { ConnectionsManagerService } from './connections-manager.service'
import { createLibp2pAddress } from '@quiet/common'

describe('ConnectionsManagerService', () => {
  let module: TestingModule
  let connectionsManagerService: ConnectionsManagerService
  let localDbService: LocalDbService
  let quietDir: string
  let store: Store
  let factory: FactoryGirl
  let community: Community
  let userIdentity: Identity
  let communityRootCa: string

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
    quietDir = await module.resolve(QUIET_DIR)
  })

  afterEach(async () => {
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
    const remotePeer = createLibp2pAddress(
      'y7yczmugl2tekami7sbdz5pfaemvx7bahwthrdvcbzw5vex2crsr26qd',
      '12D3KooWKCWstmqi5gaQvipT7xVneVGfWV7HYpCbmUu626R92hXx'
    )

    // Using the factory includes extra properties that affect the assertion
    // below
    const actualCommunity = {
      id: community.id,
      peerList: [remotePeer],
    }
    await localDbService.setCommunity(actualCommunity)
    await localDbService.setCurrentCommunityId(community.id)

    await localDbService.setIdentity(userIdentity)

    await connectionsManagerService.closeAllServices()

    const launchCommunitySpy = jest.spyOn(connectionsManagerService, 'launchCommunity').mockResolvedValue()

    await connectionsManagerService.init()

    const localPeerAddress = createLibp2pAddress(userIdentity.hiddenService.onionAddress, userIdentity.peerId.id)
    const updatedLaunchCommunityPayload = { ...actualCommunity, peerList: [localPeerAddress, remotePeer] }

    expect(launchCommunitySpy).toHaveBeenCalledWith(updatedLaunchCommunityPayload)
  })

  it('does not launch community on init if its data does not exist in local db', async () => {
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

    const peerid = '12D3KooWKCWstmqi5gaQvipT7xVneVGfWV7HYpCbmUu626R92hXx'
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
