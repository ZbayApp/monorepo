import { jest } from '@jest/globals'
import { SigChain } from '../../sigchain'
import { SigChainService } from '../../sigchain.service'
import { createLogger } from '../../../common/logger'
import { device, InviteResult, LocalUserContext } from '@localfirst/auth'
import { RoleName } from '..//roles/roles'
import { UserService } from './user.service'
import { DeviceService } from '../members/device.service'

const logger = createLogger('auth:services:invite.spec')

describe('invites', () => {
  let adminSigChain: SigChain

  it('should initialize a new sigchain and be admin', () => {
    adminSigChain = SigChain.create('test', 'user')
    expect(adminSigChain).toBeDefined()
    expect(adminSigChain.context).toBeDefined()
    expect(adminSigChain.team.teamName).toBe('test')
    expect(adminSigChain.context.user.userName).toBe('user')
    expect(adminSigChain.roles.amIMemberOfRole(adminSigChain.context, RoleName.ADMIN)).toBe(true)
    expect(adminSigChain.roles.amIMemberOfRole(adminSigChain.context, RoleName.MEMBER)).toBe(true)
  })
  it('should get keys', () => {
    const keys = adminSigChain.users.getKeys()
    expect(keys).toBeDefined()
  })
  it('get all members', () => {
    const users = adminSigChain.users.getAllUsers()
    expect(users).toBeDefined()
  })
  it('get admin member by id', () => {
    const users = adminSigChain.users.getUsersById([adminSigChain.context.user.userId])
    expect(users.map(u => u.userId)).toContain(adminSigChain.context.user.userId)
  })
  it('get admin member by name', () => {
    const user = adminSigChain.users.getUserByName(adminSigChain.context.user.userName)
    expect(user!.userName).toEqual(adminSigChain.context.user.userName)
  })
  it('should redact user', () => {
    const redactedUser = UserService.redactUser(adminSigChain.context.user)
    expect(redactedUser).toBeDefined()
    expect(redactedUser.userId).toBe(adminSigChain.context.user.userId)
    expect(redactedUser.userName).toBe(adminSigChain.context.user.userName)
  })
})
