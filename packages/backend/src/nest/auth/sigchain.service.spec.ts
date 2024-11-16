import { jest } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing'
import { SigChainService } from './sigchain.service'
import { createLogger } from '../common/logger'

const logger = createLogger('auth:sigchainManager.spec')

describe('SigChainManager', () => {
  let module: TestingModule
  let sigChainManager: SigChainService

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [SigChainService],
      exports: [SigChainService],
    }).compile()
    sigChainManager = await module.resolve(SigChainService)
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
})
