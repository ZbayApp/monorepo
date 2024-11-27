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

  it('should throw an error when trying to get an active chain without setting one', async () => {
    expect(() => sigChainManager.getActiveChain()).toThrowError()
  })
  it('should throw an error when trying to set an active chain that does not exist', async () => {
    expect(() => sigChainManager.setActiveChain('nonexistent')).toThrowError()
  })
  it('should add a new chain and it not be active if not set to be', async () => {
    const sigChain = await sigChainManager.createChain('test', 'user', false)
    expect(() => sigChainManager.getActiveChain()).toThrowError()
    sigChainManager.setActiveChain('test')
    expect(sigChainManager.getActiveChain()).toBe(sigChain)
  })
  it('should add a new chain and it be active if set to be', async () => {
    const sigChain = await sigChainManager.createChain('test2', 'user2', true)
    expect(sigChainManager.getActiveChain()).toBe(sigChain)
    const prevSigChain = sigChainManager.getChain('test')
    expect(prevSigChain).toBeDefined()
    expect(prevSigChain).not.toBe(sigChain)
  })
  it('should delete nonactive chain without changing active chain', async () => {
    sigChainManager.setActiveChain('test2')
    await sigChainManager.deleteChain('test', false)
    expect(() => sigChainManager.getChain('test')).toThrowError()
    expect(sigChainManager.getActiveChain()).toBeDefined()
  })
  it('should delete active chain and set active chain to undefined', async () => {
    await sigChainManager.deleteChain('test2', false)
    expect(sigChainManager.getActiveChain).toThrowError()
  })
  it('should save and load sigchain using nestjs service', async () => {
    const TEAM_NAME = 'test3'
    const sigChain = await sigChainManager.createChain(TEAM_NAME, 'user', true)
    await sigChainManager.saveChain(TEAM_NAME)
    await sigChainManager.deleteChain(TEAM_NAME, false)
    const loadedSigChain = await sigChainManager.loadChain(TEAM_NAME, true)
    expect(loadedSigChain).toBeDefined()
    expect(sigChainManager.getActiveChain()).toBe(loadedSigChain)
  })
  it('should delete sigchains from disk', async () => {
    await sigChainManager.deleteChain('test3', true)
    expect(() => sigChainManager.getChain('test3')).toThrowError()
    await expect(sigChainManager.loadChain('test3', true)).rejects.toThrowError()
  })
  it('should not allow duplicate chains to be added', async () => {
    await sigChainManager.createChain('test4', 'user4', false)
    await expect(sigChainManager.createChain('test4', 'user4', false)).rejects.toThrowError()
  })
  it('should handle concurrent chain operations correctly', async () => {
    const TEAM_NAME1 = 'test6'
    const TEAM_NAME2 = 'test7'
    await Promise.all([
      sigChainManager.createChain(TEAM_NAME1, 'user1', true),
      sigChainManager.createChain(TEAM_NAME2, 'user2', false),
    ])
    expect(sigChainManager.getChain(TEAM_NAME1)).toBeDefined()
    expect(sigChainManager.getChain(TEAM_NAME2)).toBeDefined()
  })
})
