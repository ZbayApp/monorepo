import { jest } from '@jest/globals'
import { SigChain } from '../../sigchain'
import { SigChainService } from '../../sigchain.service'
import { createLogger } from '../../../common/logger'
import { device, InviteResult, LocalUserContext } from '@localfirst/auth'
import { RoleName } from '..//roles/roles'
import { UserService } from '../members/user.service'
import { InviteService } from './invite.service'
import { DeviceService } from '../members/device.service'

const logger = createLogger('auth:services:invite.spec')

describe('invites', () => {
  let adminSigChain: SigChain
  let newMemberSigChain: SigChain
  it('should initialize a new sigchain and be admin', () => {
    adminSigChain = SigChain.create('test', 'user')
    expect(adminSigChain).toBeDefined()
    expect(adminSigChain.localUserContext).toBeDefined()
    expect(adminSigChain.team!.teamName).toBe('test')
    expect(adminSigChain.localUserContext.user.userName).toBe('user')
    expect(adminSigChain.roles.amIMemberOfRole(adminSigChain.localUserContext, RoleName.ADMIN)).toBe(true)
    expect(adminSigChain.roles.amIMemberOfRole(adminSigChain.localUserContext, RoleName.MEMBER)).toBe(true)
  })
  it('admin should generate an invite and it be added to team graph', () => {
    const newInvite = adminSigChain.invites.createUserInvite()
    expect(newInvite).toBeDefined()
    expect(adminSigChain.invites.getAllInvites().length).toBe(1)
    expect(adminSigChain.invites.getById(newInvite.id)).toBeDefined()
  })
  it('admin should generate an invite seed and create a new user from it', () => {
    const invite = adminSigChain.invites.createUserInvite()
    expect(invite).toBeDefined()
    const prospectiveMember = UserService.createFromInviteSeed('user2', invite.seed)
    const inviteProof = InviteService.generateProof(invite.seed)
    expect(inviteProof).toBeDefined()
    expect(adminSigChain.invites.validateProof(inviteProof)).toBe(true)
    expect(prospectiveMember).toBeDefined()
    newMemberSigChain = SigChain.join(
      prospectiveMember.context,
      adminSigChain.team!.save(),
      adminSigChain.team!.teamKeyring()
    )
    expect(newMemberSigChain).toBeDefined()
    expect(newMemberSigChain.localUserContext).toBeDefined()
    expect(newMemberSigChain.localUserContext.user.userName).toBe('user2')
    expect(newMemberSigChain.localUserContext.user.userId).not.toBe(adminSigChain.localUserContext.user.userId)
    expect(newMemberSigChain.roles.amIMemberOfRole(newMemberSigChain.localUserContext, RoleName.MEMBER)).toBe(false)
    expect(newMemberSigChain.roles.amIMemberOfRole(newMemberSigChain.localUserContext, RoleName.ADMIN)).toBe(false)
    expect(
      adminSigChain.invites.admitMemberFromInvite(
        inviteProof,
        newMemberSigChain.localUserContext.user.userName,
        newMemberSigChain.localUserContext.user.userId,
        newMemberSigChain.localUserContext.user.keys
      )
    ).toBeDefined()
    expect(adminSigChain.roles.amIMemberOfRole(newMemberSigChain.localUserContext, RoleName.MEMBER)).toBe(true)
  })
  it('admin should be able to revoke an invite', () => {
    const inviteToRevoke = adminSigChain.invites.createUserInvite()
    expect(inviteToRevoke).toBeDefined()
    adminSigChain.invites.revoke(inviteToRevoke.id)
    const InvalidInviteProof = InviteService.generateProof(inviteToRevoke.seed)
    expect(InvalidInviteProof).toBeDefined()
    expect(adminSigChain.invites.validateProof(InvalidInviteProof)).toBe(false)
  })
  it('admitting a new member with an invalid invite should fail', () => {
    const invalidInviteProof = InviteService.generateProof('invalidseed')
    expect(invalidInviteProof).toBeDefined()
    expect(adminSigChain.invites.validateProof(invalidInviteProof)).toBe(false)
    const prospectiveMember = UserService.createFromInviteSeed('user3', 'invalidseed')
    expect(prospectiveMember).toBeDefined()
    const newSigchain = SigChain.join(
      prospectiveMember.context,
      adminSigChain.team!.save(),
      adminSigChain.team!.teamKeyring()
    )
    expect(() => {
      adminSigChain.invites.admitMemberFromInvite(
        invalidInviteProof,
        prospectiveMember.context.user.userName,
        prospectiveMember.context.user.userId,
        prospectiveMember.publicKeys
      )
    }).toThrowError()
  })
  it('should invite device', () => {
    const newDevice = DeviceService.generateDeviceForUser(adminSigChain.localUserContext.user.userId)
    const deviceInvite = adminSigChain.invites.createDeviceInvite()
    const inviteProof = InviteService.generateProof(deviceInvite.seed)
    expect(inviteProof).toBeDefined()
    expect(adminSigChain.invites.validateProof(inviteProof)).toBe(true)
    adminSigChain.invites.admitDeviceFromInvite(inviteProof, DeviceService.redactDevice(newDevice))
    expect(adminSigChain.team!.hasDevice(newDevice.deviceId)).toBe(true)
  })
})
