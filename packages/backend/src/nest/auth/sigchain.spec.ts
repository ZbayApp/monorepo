import { jest } from '@jest/globals'
import { SigChain } from './sigchain'
import { SigChainService } from './sigchain.service'
import { createLogger } from '../common/logger'
import { LocalUserContext } from '3rd-party/auth/packages/auth/dist'
import exp from 'constants'
import { RoleName } from './services/roles/roles'
import { UserService } from './services/members/user.service'

const logger = createLogger('auth:sigchainManager.spec')

describe('SigChain', () => {
  let sigChain: SigChain

  it('should initialize a new sigchain and be admin', () => {
    sigChain = SigChain.create('test', 'user')
    expect(sigChain).toBeDefined()
    expect(sigChain.localUserContext).toBeDefined()
    expect(sigChain.team!.teamName).toBe('test')
    expect(sigChain.localUserContext.user.userName).toBe('user')
    expect(sigChain.roles.amIMemberOfRole(sigChain.localUserContext, RoleName.ADMIN)).toBe(true)
    expect(sigChain.roles.amIMemberOfRole(sigChain.localUserContext, RoleName.MEMBER)).toBe(true)
  })
  it('admin should not have a role that does not exist', () => {
    expect(sigChain.roles.amIMemberOfRole(sigChain.localUserContext, 'nonexistent')).toBe(false)
  })
  it('should serialize the sigchain and load it', () => {
    const serializedChain = sigChain.save()
    const sigChain2 = SigChain.load(serializedChain, sigChain.localUserContext, sigChain.team!.teamKeyring())
    expect(sigChain2).toBeDefined()
    expect(sigChain2.team!.teamName).toBe('test')
    expect(sigChain2.roles.amIMemberOfRole(sigChain2.localUserContext, RoleName.ADMIN)).toBe(true)
    expect(sigChain2.roles.amIMemberOfRole(sigChain2.localUserContext, RoleName.MEMBER)).toBe(true)
  })
})
