import { jest } from '@jest/globals'
import { SigChain } from './sigchain'
import { SigChainManager } from './sigchainManager'
import { createLogger } from '../common/logger'

const logger = createLogger('auth:sigchainManager.spec')

describe('SigChainManager', () => {
  let sigChainManager: SigChainManager

  it('should initialize a new SigChainManager', () => {
    sigChainManager = SigChainManager.init()
    expect(sigChainManager).toBeDefined()
  })
  it('should throw an error when trying to get an active chain without setting one', () => {
    expect(() => sigChainManager.getActiveChain()).toThrowError()
  })
  it('should throw an error when trying to set an active chain that does not exist', () => {
    expect(() => sigChainManager.setActiveChain('nonexistent')).toThrowError()
  })
  it('should add a new chain and it not be active if not set to be', () => {
    const { context, sigChain } = sigChainManager.createChain('test', 'user', false)
    expect(sigChainManager.activeChainTeamName).toBeUndefined()
    expect(() => sigChainManager.getActiveChain()).toThrowError()
    sigChainManager.setActiveChain('test')
    expect(sigChainManager.getActiveChain()).toBe(sigChain)
  })
  it('should add a new chain and it be active if set to be', () => {
    const { context, sigChain } = sigChainManager.createChain('test2', 'user2', true)
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
    expect(sigChainManager.activeChainTeamName).toBeUndefined()
  })
})
