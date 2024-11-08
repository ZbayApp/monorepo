import PeerId from 'peer-id'
import { type DirResult } from 'tmp'
import crypto from 'crypto'
import { CustomEvent } from '@libp2p/interfaces/events'
import { jest, beforeEach, describe, it, expect, afterEach } from '@jest/globals'
import { communities, getFactory, identity, prepareStore, Store } from '@quiet/state-manager'
import {
  createPeerId,
  createTmpDir,
  libp2pInstanceParams,
  removeFilesFromDir,
  tmpQuietDirPath,
  generateRandomOnionAddress,
} from '../common/utils'
import { NetworkStats, type Community, type Identity } from '@quiet/types'
import { LazyModuleLoader } from '@nestjs/core'
import { TestingModule, Test } from '@nestjs/testing'
import { FactoryGirl } from 'factory-girl'
import { TestModule } from '../common/test.module'
import { TOR_PASSWORD_PROVIDER, QUIET_DIR } from '../const'
import { Libp2pModule } from '../libp2p/libp2p.module'
import { Libp2pService } from '../libp2p/libp2p.service'
import { LocalDbModule } from '../local-db/local-db.module'
import { LocalDbService } from '../local-db/local-db.service'
import { RegistrationModule } from '../registration/registration.module'
import { RegistrationService } from '../registration/registration.service'
import { SocketModule } from '../socket/socket.module'
import { WebSockets } from '../websocketOverTor'
import { ConnectionsManagerModule } from './connections-manager.module'
import { ConnectionsManagerService } from './connections-manager.service'
import { TorModule } from '../tor/tor.module'
import { Tor } from '../tor/tor.service'
import { TorControl } from '../tor/tor-control.service'
import { LocalDBKeys } from '../local-db/local-db.types'
import { DateTime } from 'luxon'
import waitForExpect from 'wait-for-expect'
import { Libp2pEvents } from '../libp2p/libp2p.types'
import { sleep } from '../common/sleep'
import { createLibp2pAddress, filterValidAddresses, generateChannelId } from '@quiet/common'
import { createLogger } from '../common/logger'
import { ServiceState } from './connections-manager.types'

const logger = createLogger('connectionsManager:test')

const MANY_PEERS_COUNT = 7
const MANY_PEERS_DIALS = MANY_PEERS_COUNT * 2

jest.setTimeout(100_000)

let tmpDir: DirResult
let tmpAppDataPath: string

let module: TestingModule
let connectionsManagerService: ConnectionsManagerService
let tor: Tor
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
let torControl: TorControl

beforeEach(async () => {
  jest.clearAllMocks()
  tmpDir = createTmpDir()
  tmpAppDataPath = tmpQuietDirPath(tmpDir.name)
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
    imports: [
      TestModule,
      ConnectionsManagerModule,
      LocalDbModule,
      RegistrationModule,
      SocketModule,
      Libp2pModule,
      TorModule,
    ],
  })
    .overrideProvider(TOR_PASSWORD_PROVIDER)
    .useValue({
      torPassword: 'b5e447c10b0d99e7871636ee5e0839b5',
      torHashedPassword: '16:FCFFE21F3D9138906021FAADD9E49703CC41848A95F829E0F6E1BDBE63',
    })
    .compile()
  quietDir = await module.resolve(QUIET_DIR)
  connectionsManagerService = await module.resolve(ConnectionsManagerService)
  localDbService = await module.resolve(LocalDbService)
  registrationService = await module.resolve(RegistrationService)
  tor = await module.resolve(Tor)
  await tor.init()

  const torPassword = crypto.randomBytes(16).toString('hex')
  torControl = await module.resolve(TorControl)
  torControl.authString = 'AUTHENTICATE ' + torPassword + '\r\n'

  lazyModuleLoader = await module.resolve(LazyModuleLoader)
  const { Libp2pModule: Module } = await import('../libp2p/libp2p.module')
  const moduleRef = await lazyModuleLoader.load(() => Module)
  const { Libp2pService } = await import('../libp2p/libp2p.service')
  libp2pService = moduleRef.get(Libp2pService)
  const params = await libp2pInstanceParams()
  peerId = params.peerId

  connectionsManagerService.libp2pService = libp2pService

  const pskBase64 = Libp2pService.generateLibp2pPSK().psk
  await localDbService.put(LocalDBKeys.PSK, pskBase64)
  await localDbService.put(LocalDBKeys.CURRENT_COMMUNITY_ID, community.id)
  await localDbService.setCommunity(community)
  await localDbService.setIdentity(userIdentity)
})

afterEach(async () => {
  if (connectionsManagerService) {
    await connectionsManagerService.closeAllServices()
  }
  removeFilesFromDir(quietDir)
})

describe('Connections manager', () => {
  it('saves peer stats when peer has been disconnected', async () => {
    logger.info('saves peer stats when peer has been disconnected')
    // @ts-expect-error
    libp2pService.processInChunksService.init = jest.fn()
    // @ts-expect-error
    libp2pService.processInChunksService.process = jest.fn()
    class RemotePeerEventDetail {
      peerId: string

      constructor(peerId: string) {
        this.peerId = peerId
      }

      toString = () => {
        return this.peerId
      }
    }
    const emitSpy = jest.spyOn(libp2pService, 'emit')

    // Peer connected
    await connectionsManagerService.init()
    libp2pService.connectedPeers.set(peerId.toString(), {
      connectedAtSeconds: DateTime.utc().valueOf(),
      address: peerId.toString(),
    })

    // Peer disconnected
    const remoteAddr = `${peerId.toString()}`
    const peerDisconectEventDetail = {
      remotePeer: new RemotePeerEventDetail(peerId.toString()),
      remoteAddr: new RemotePeerEventDetail(remoteAddr),
    }
    await waitForExpect(async () => {
      expect(libp2pService.libp2pInstance).not.toBeUndefined()
    }, 2_000)
    libp2pService.libp2pInstance?.dispatchEvent(
      new CustomEvent('peer:disconnect', { detail: peerDisconectEventDetail })
    )
    await waitForExpect(async () => {
      expect(libp2pService.connectedPeers.size).toEqual(0)
    }, 2000)

    await waitForExpect(async () => {
      expect(await localDbService.get(LocalDBKeys.PEERS)).not.toBeNull()
    }, 2000)
    const peerStats: Record<string, NetworkStats> = await localDbService.get(LocalDBKeys.PEERS)
    expect(Object.keys(peerStats)[0]).toEqual(remoteAddr)
    expect(emitSpy).toHaveBeenCalledWith(Libp2pEvents.PEER_DISCONNECTED, {
      peer: peerStats[remoteAddr].peerId,
      connectionDuration: peerStats[remoteAddr].connectionTime,
      lastSeen: peerStats[remoteAddr].lastSeen,
    })
  })

  it('creates network', async () => {
    logger.info('creates network')
    const spyOnDestroyHiddenService = jest.spyOn(tor, 'destroyHiddenService')
    await connectionsManagerService.init()
    const network = await connectionsManagerService.getNetwork()
    expect(network.hiddenService.onionAddress.split('.')[0]).toHaveLength(56)
    expect(network.hiddenService.privateKey).toHaveLength(99)
    const peerId = await PeerId.createFromJSON(network.peerId)
    expect(PeerId.isPeerId(peerId)).toBeTruthy()
    expect(await spyOnDestroyHiddenService.mock.results[0].value).toBeTruthy()
  })

  it('dials many peers on start when provided peer list', async () => {
    logger.info('dials many peers on start when provided peer list')
    const store = prepareStore().store
    const factory = await getFactory(store)
    const community = await factory.create<Community>('Community', { rootCa: 'rootCa' })
    const userIdentity = await factory.create<Identity>('Identity', { id: community.id, nickname: 'john' })
    const spyOnDial = jest.spyOn(WebSockets.prototype, 'dial')

    let peerAddress: string
    const peerList: string[] = []
    // add local peer to the list
    peerList.push(createLibp2pAddress(userIdentity.hiddenService.onionAddress, userIdentity.peerId.id))

    // add 7 random peers to the list
    for (let pCount = 0; pCount < MANY_PEERS_COUNT; pCount++) {
      peerAddress = createLibp2pAddress(generateRandomOnionAddress(56), (await createPeerId()).toString())
      logger.info(`pushing peer ${pCount}: ${peerAddress}`)
      peerList.push(peerAddress)
    }
    // all addresses are valid
    expect(peerList.length).toBe(filterValidAddresses(peerList).length)

    // update level db store of identity to sim saga registration
    localDbService.setIdentity(userIdentity)

    expect(connectionsManagerService.communityState).toBe(undefined)

    localDbService.setCommunity({ ...community, peerList: peerList })
    localDbService.setCurrentCommunityId(community.id)
    logger.info('Launching community', community.id, 'with peer list', peerList)
    await connectionsManagerService.init()
    await sleep(5000)

    expect(connectionsManagerService.communityState).toBe(ServiceState.LAUNCHED)
    // expect to dial all peers except self
    expect(spyOnDial).toHaveBeenCalledTimes(MANY_PEERS_DIALS)
    // Temporary fix for hanging test - websocketOverTor doesn't have abortController
    await sleep(5000)
  })

  it('dials same number of peers on start when launched from storage', async () => {
    logger.info('dials same number of peers on start when launched from storage')
    const spyOnDial = jest.spyOn(WebSockets.prototype, 'dial')

    let peerAddress: string
    const peerList: string[] = []
    // add local peer to the list
    peerList.push(createLibp2pAddress(userIdentity.hiddenService.onionAddress, userIdentity.peerId.id))
    // add 7 random peers to the list
    for (let pCount = 0; pCount < MANY_PEERS_COUNT; pCount++) {
      peerAddress = createLibp2pAddress(generateRandomOnionAddress(56), (await createPeerId()).toString())
      logger.info(`pushing peer ${pCount}: ${peerAddress}`)
      peerList.push(peerAddress)
    }
    // all addresses are valid
    expect(peerList.length).toBe(filterValidAddresses(peerList).length)

    // update level db store to sim launching established community
    localDbService.setCommunity({ ...community, peerList: peerList })
    localDbService.setIdentity(userIdentity)

    expect(connectionsManagerService.communityState).toBe(undefined)
    // community will launch from storage
    await connectionsManagerService.init()
    await sleep(5000)

    expect(connectionsManagerService.communityState).toBe(ServiceState.LAUNCHED)
    // expect to dial all peers except self
    expect(spyOnDial).toHaveBeenCalledTimes(MANY_PEERS_DIALS)
    // Temporary fix for hanging test - websocketOverTor doesn't have abortController
    await sleep(5000)
  })

  it('dials only valid peers on start when launched from storage', async () => {
    logger.info('dials same number of peers on start when launched from storage')
    const spyOnDial = jest.spyOn(WebSockets.prototype, 'dial')

    let peerAddress: string
    const peerList: string[] = []
    // add local peer to the list
    peerList.push(createLibp2pAddress(userIdentity.hiddenService.onionAddress, userIdentity.peerId.id))
    // add 7 random peers to the list
    for (let pCount = 0; pCount < MANY_PEERS_COUNT; pCount++) {
      peerAddress = createLibp2pAddress(generateRandomOnionAddress(56), (await createPeerId()).toString())
      logger.info(`pushing peer ${pCount}: ${peerAddress}`)
      peerList.push(peerAddress)
    }
    // add invalid peer address (too short)
    peerList.push(createLibp2pAddress(generateRandomOnionAddress(50), (await createPeerId()).toString()))
    // all addresses are valid
    expect(peerList.length).toBe(filterValidAddresses(peerList).length + 1)

    // update level db store to sim launching established community
    localDbService.setCommunity({ ...community, peerList: peerList })
    localDbService.setIdentity(userIdentity)

    expect(connectionsManagerService.communityState).toBe(undefined)
    // community will launch from storage
    await connectionsManagerService.init()
    await sleep(5000)

    expect(connectionsManagerService.communityState).toBe(ServiceState.LAUNCHED)
    // expect to dial all peers except self
    expect(spyOnDial).toHaveBeenCalledTimes(MANY_PEERS_DIALS)
    // Temporary fix for hanging test - websocketOverTor doesn't have abortController
    await sleep(5000)
  })
  it('dials only valid peers on start when provided peer list', async () => {
    logger.info('dials only valid peers on start when provided peer list')
    const store = prepareStore().store
    const factory = await getFactory(store)
    const community = await factory.create<Community>('Community', { rootCa: 'rootCa' })
    const userIdentity = await factory.create<Identity>('Identity', { id: community.id, nickname: 'john' })
    const spyOnDial = jest.spyOn(WebSockets.prototype, 'dial')

    let peerAddress: string
    const peerList: string[] = []
    // add local peer to the list
    peerList.push(createLibp2pAddress(userIdentity.hiddenService.onionAddress, userIdentity.peerId.id))
    // add 7 random peers to the list
    for (let pCount = 0; pCount < MANY_PEERS_COUNT; pCount++) {
      peerAddress = createLibp2pAddress(generateRandomOnionAddress(56), (await createPeerId()).toString())
      logger.info(`pushing peer ${pCount}: ${peerAddress}`)
      peerList.push(peerAddress)
    }
    // add invalid peer address (too short)
    peerList.push(createLibp2pAddress(generateRandomOnionAddress(50), (await createPeerId()).toString()))
    // all addresses are valid
    expect(peerList.length).toBe(filterValidAddresses(peerList).length + 1)
    // update level db store of identity to sim saga registration
    localDbService.setIdentity(userIdentity)

    expect(connectionsManagerService.communityState).toBe(undefined)
    localDbService.setCommunity({ ...community, peerList: peerList })
    localDbService.setCurrentCommunityId(community.id)
    await connectionsManagerService.init()
    await sleep(5000)

    expect(connectionsManagerService.communityState).toBe(ServiceState.LAUNCHED)
    // expect to dial all peers except self
    expect(spyOnDial).toHaveBeenCalledTimes(MANY_PEERS_DIALS)
    // Temporary fix for hanging test - websocketOverTor doesn't have abortController
    await sleep(5000)
  })
  it.skip('Bug reproduction - iOS app crashing because lack of data server', async () => {
    await connectionsManagerService.init()
    const spyOnDial = jest.spyOn(WebSockets.prototype, 'dial')

    const peerList: string[] = []
    const peersCount = 8
    for (let pCount = 0; pCount < peersCount; pCount++) {
      peerList.push(createLibp2pAddress(userIdentity.hiddenService.onionAddress, (await createPeerId()).toString()))
    }

    await connectionsManagerService.launchCommunity({ ...community, peerList: peerList })
    expect(spyOnDial).toHaveBeenCalledTimes(peersCount)
    await connectionsManagerService.closeAllServices()
    await sleep(5000)

    const launchSpy = jest.spyOn(connectionsManagerService, 'launch')
    await connectionsManagerService.init()
    expect(launchSpy).toBeCalledTimes(1)
    // Temporary fix for hanging test - websocketOverTor doesn't have abortController
    await sleep(5000)
  })
})
