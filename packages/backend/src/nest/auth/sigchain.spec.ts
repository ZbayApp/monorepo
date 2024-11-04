import { jest } from '@jest/globals'
import { SigChain } from './sigchain'
import { SigChainManager } from './sigchainManager'
import { createLogger } from '../common/logger'
import { LocalUserContext } from '3rd-party/auth/packages/auth/dist'
import exp from 'constants'
import { RoleName } from './services/roles/roles'
import { UserService } from './services/members/user.service'

const logger = createLogger('auth:sigchainManager.spec')

describe('SigChain', () => {
  let sigChain: SigChain
  let sigChain2: SigChain
  let context: LocalUserContext
  let context2: LocalUserContext

  it('should initialize a new sigchain and be admin', () => {
    ;({ sigChain, context } = SigChain.create('test', 'user'))
    expect(sigChain).toBeDefined()
    expect(context).toBeDefined()
    expect(sigChain.team.teamName).toBe('test')
    expect(context.user.userName).toBe('user')
    expect(sigChain.roles.amIMemberOfRole(context, RoleName.ADMIN)).toBe(true)
    expect(sigChain.roles.amIMemberOfRole(context, RoleName.MEMBER)).toBe(true)
  })
  it('admin should not have a role that does not exist', () => {
    expect(sigChain.roles.amIMemberOfRole(context, 'nonexistent')).toBe(false)
  })
})
