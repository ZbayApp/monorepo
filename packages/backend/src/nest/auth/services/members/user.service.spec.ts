import { jest } from '@jest/globals'
import { SigChain } from '../../sigchain'
import { SigChainManager } from '../../sigchainManager'
import { createLogger } from '../../../common/logger'
import { device, InviteResult, LocalUserContext } from '@localfirst/auth'
import { RoleName } from '..//roles/roles'
import { UserService } from './user.service'
import { DeviceService } from '../members/device.service'

const logger = createLogger('auth:services:invite.spec')

describe('invites', () => {
  let adminSigChain: SigChain
  let adminContext: LocalUserContext
  it('should initialize a new sigchain and be admin', () => {
    ;({ sigChain: adminSigChain, context: adminContext } = SigChain.create('test', 'user'))
    expect(adminSigChain).toBeDefined()
    expect(adminContext).toBeDefined()
    expect(adminSigChain.team.teamName).toBe('test')
    expect(adminContext.user.userName).toBe('user')
    expect(adminSigChain.roles.amIMemberOfRole(adminContext, RoleName.ADMIN)).toBe(true)
    expect(adminSigChain.roles.amIMemberOfRole(adminContext, RoleName.MEMBER)).toBe(true)
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
    const users = adminSigChain.users.getUsersById([adminContext.user.userId])
    expect(users.map(u => u.userId)).toContain(adminContext.user.userId)
  })
  it('get admin member by name', () => {
    const user = adminSigChain.users.getUserByName(adminContext.user.userName)
    expect(user!.userName).toEqual(adminContext.user.userName)
  })
  it('should redact user', () => {
    const redactedUser = UserService.redactUser(adminContext.user)
    expect(redactedUser).toBeDefined()
    expect(redactedUser.userId).toBe(adminContext.user.userId)
    expect(redactedUser.userName).toBe(adminContext.user.userName)
  })
})
