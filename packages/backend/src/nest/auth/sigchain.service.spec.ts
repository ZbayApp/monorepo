import { jest } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing'
import { SigChainService } from './sigchain.service'
import { createLogger } from '../common/logger'
import { LocalDbService } from '../local-db/local-db.service'
import { LocalDbModule } from '../local-db/local-db.module'
import { TestModule } from '../common/test.module'
import { SigChainModule } from './sigchain.service.module'

const logger = createLogger('auth:sigchainManager.spec')

describe('SigChainManager', () => {
  let module: TestingModule
  let sigChainManager: SigChainService
  let localDbService: LocalDbService

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [TestModule, SigChainModule, LocalDbModule],
    }).compile()
    sigChainManager = await module.resolve(SigChainService)
    localDbService = await module.resolve(LocalDbService)
  })

  beforeEach(async () => {
    if (localDbService.getStatus() === 'closed') {
      await localDbService.open()
    }
  })

  afterAll(async () => {
    await localDbService.close()
    await module.close()
  })

  it('should throw an error when trying to get an active chain without setting one', () => {
    expect(() => sigChainManager.getActiveChain()).toThrowError()
  })
  it('should throw an error when trying to set an active chain that does not exist', () => {
    expect(() => sigChainManager.setActiveChain('nonexistent')).toThrowError()
  })
  it('should add a new chain and it not be active if not set to be', () => {
    const sigChain = sigChainManager.createChain('test', 'user', false)
    expect(() => sigChainManager.getActiveChain()).toThrowError()
    sigChainManager.setActiveChain('test')
    expect(sigChainManager.getActiveChain()).toBe(sigChain)
  })
  it('should add a new chain and it be active if set to be', () => {
    const sigChain = sigChainManager.createChain('test2', 'user2', true)
    expect(sigChainManager.getActiveChain()).toBe(sigChain)
    const prevSigChain = sigChainManager.getChainByTeamName('test')
    expect(prevSigChain).toBeDefined()
    expect(prevSigChain).not.toBe(sigChain)
  })
  it('should delete nonactive chain without changing active chain', () => {
    sigChainManager.deleteChain('test')
    expect(() => sigChainManager.getChainByTeamName('test')).toThrowError()
  })
  it('should delete active chain and set active chain to undefined', () => {
    sigChainManager.deleteChain('test2')
    expect(sigChainManager.getActiveChain).toThrowError()
  })
  it('should save and load a chain', async () => {
    const sigChain = sigChainManager.createChain('test', 'user', true)
    await localDbService.setSigChain(sigChain)
    const serializedChain = sigChain.save()
    const retrievedChain = await localDbService.getSigChain('test')
    expect(retrievedChain).toBeDefined()
    expect(retrievedChain?.context.user.userName).toBe('user')
    sigChainManager.deleteChain('test')
    const loadedSigChain = sigChainManager.rehydrateSigChain(
      retrievedChain!.serializedTeam,
      retrievedChain!.context,
      retrievedChain!.teamKeyRing,
      false
    )
    expect(loadedSigChain).toBeDefined()
    expect(loadedSigChain.context.user.userName).toBe('user')
    expect(loadedSigChain.team.teamName).toBe('test')
  })
  it('should save and load sigchain using nestjs service', async () => {
    const sigChain = sigChainManager.createChain('test3', 'user', true)
    sigChainManager.saveChain(sigChain.team.teamName)
    sigChainManager.deleteChain(sigChain.team.teamName)
    const loadedSigChain = await sigChainManager.loadChain('test3', false)
    expect(loadedSigChain).toBeDefined()
    expect(sigChainManager.getActiveChain()).toBe(loadedSigChain)
  })
})
