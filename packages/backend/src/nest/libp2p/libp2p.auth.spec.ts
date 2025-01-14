import { Test, TestingModule } from '@nestjs/testing'
import { TestModule } from '../common/test.module'
import { getLocalLibp2pInstanceParams } from '../common/utils'
import { Libp2pModule } from './libp2p.module'
import { SigChainModule } from '../auth/sigchain.service.module'
import { Libp2pService } from './libp2p.service'
import { SigChainService } from '../auth/sigchain.service'
import { Libp2pEvents, Libp2pNodeParams } from './libp2p.types'
import { createLogger } from '../common/logger'

const logger = createLogger('libp2p:libp2p.auth.spec')

describe('Libp2pAuth', () => {
  const teamName: string = 'team'
  const userA: string = 'instanceA'
  const userB: string = 'instanceB'
  let moduleA: TestingModule
  let moduleB: TestingModule
  let libp2pServiceA: Libp2pService
  let libp2pServiceB: Libp2pService
  let sigchainServiceA: SigChainService
  let sigchainServiceB: SigChainService
  let paramsA: Libp2pNodeParams
  let paramsB: Libp2pNodeParams

  beforeAll(async () => {
    moduleA = await Test.createTestingModule({
      imports: [TestModule, Libp2pModule, SigChainModule],
    }).compile()

    moduleB = await Test.createTestingModule({
      imports: [TestModule, Libp2pModule, SigChainModule],
    }).compile()
    sigchainServiceA = await moduleA.resolve(SigChainService)
    sigchainServiceB = await moduleB.resolve(SigChainService)
    libp2pServiceA = await moduleA.resolve(Libp2pService)
    libp2pServiceB = await moduleB.resolve(Libp2pService)

    const singlePSK = Libp2pService.generateLibp2pPSK().fullKey

    paramsA = {
      ...(await getLocalLibp2pInstanceParams()),
      psk: singlePSK,
    }

    paramsB = {
      ...(await getLocalLibp2pInstanceParams()),
      psk: singlePSK,
    }
  })

  afterAll(async () => {
    await libp2pServiceA.libp2pInstance?.stop()
    await libp2pServiceB.libp2pInstance?.stop()
    await moduleA.close()
    await moduleB.close()
  })

  it('creates sigchain for instance A', async () => {
    await sigchainServiceA.createChain(teamName, userA, true)
    expect(sigchainServiceA.activeChainTeamName).toBe(teamName)
    const inviteResult = await sigchainServiceA.getActiveChain().invites.createLongLivedUserInvite()
    await sigchainServiceB.createChainFromInvite(userB, teamName, inviteResult.seed, true)
    expect(sigchainServiceB.activeChainTeamName).toBe(teamName)
  })

  it('create two instances of libp2p', async () => {
    logger.info('Creating libp2p instances')
    logger.info('paramsA', paramsA)
    logger.info('paramsB', paramsB)
    expect(paramsA.psk).toEqual(paramsB.psk)
    await libp2pServiceA.createInstance(paramsA)
    await libp2pServiceB.createInstance(paramsB)
    expect(libp2pServiceA.libp2pInstance).not.toBeNull()
    expect(libp2pServiceA?.libp2pInstance?.peerId.toString()).toBe(paramsA.peerId.peerId.toString())
    expect(libp2pServiceB.libp2pInstance).not.toBeNull()
    expect(libp2pServiceB?.libp2pInstance?.peerId.toString()).toBe(paramsB.peerId.peerId.toString())
  })

  it(
    'dials each other',
    async () => {
      if (!libp2pServiceA.libp2pInstance || !libp2pServiceB.libp2pInstance) {
        throw new Error('libp2p instance is not created')
      }
      if (!libp2pServiceA.libp2pInstance.peerId || !libp2pServiceB.libp2pInstance.peerId) {
        throw new Error('libp2p peerId is not created')
      }
      libp2pServiceA.on(Libp2pEvents.PEER_CONNECTED, () => {
        logger.info('Peer connected')
        expect(sigchainServiceB.getActiveChain().team).not.toBeNull()
      })
      libp2pServiceB.dialPeer(paramsA.localAddress)
      await new Promise(resolve => setTimeout(resolve, 10000))
    },
    1000 * 60 * 5
  )
})
