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
  let sigChain2: SigChain

  it('should initialize a new sigchain and be admin', () => {
    sigChain = SigChain.create('test', 'user')
    expect(sigChain).toBeDefined()
    expect(sigChain.context).toBeDefined()
    expect(sigChain.team.teamName).toBe('test')
    expect(sigChain.context.user.userName).toBe('user')
    expect(sigChain.roles.amIMemberOfRole(sigChain.context, RoleName.ADMIN)).toBe(true)
    expect(sigChain.roles.amIMemberOfRole(sigChain.context, RoleName.MEMBER)).toBe(true)
  })
  it('admin should not have a role that does not exist', () => {
    expect(sigChain.roles.amIMemberOfRole(sigChain.context, 'nonexistent')).toBe(false)
  })
  it('should serialize the sigchain and load it', () => {
    const serializedChain = sigChain.save()
    sigChain2 = SigChain.load(serializedChain, sigChain.context, sigChain.team.teamKeyring())
    expect(sigChain2).toBeDefined()
    expect(sigChain2.team.teamName).toBe('test')
    expect(sigChain2.roles.amIMemberOfRole(sigChain2.context, RoleName.ADMIN)).toBe(true)
    expect(sigChain2.roles.amIMemberOfRole(sigChain2.context, RoleName.MEMBER)).toBe(true)
  })
})
