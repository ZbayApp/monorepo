import { SigChain } from '../../sigchain'
import { createLogger } from '../../../common/logger'
import { LocalUserContext } from '@localfirst/auth'
import { RoleName, Channel } from './roles'
import { UserService } from '../members/user.service'
import { InviteService } from '../invites/invite.service'

const logger = createLogger('auth:services:invite.spec')

const privateChannelName = 'testChannel'

describe('invites', () => {
  let adminSigChain: SigChain
  let newMemberSigChain: SigChain

  it('should initialize a new sigchain and be admin', () => {
    adminSigChain = SigChain.create('test', 'user')
    expect(adminSigChain).toBeDefined()
    expect(adminSigChain.context).toBeDefined()
    expect(adminSigChain.team.teamName).toBe('test')
    expect(adminSigChain.context.user.userName).toBe('user')
    expect(adminSigChain.roles.amIMemberOfRole(adminSigChain.context, RoleName.ADMIN)).toBe(true)
    expect(adminSigChain.roles.amIMemberOfRole(adminSigChain.context, RoleName.MEMBER)).toBe(true)
  })
  it('should create a private channel', () => {
    const privateChannel = adminSigChain.channels.createPrivateChannel(privateChannelName, adminSigChain.context)
    expect(privateChannel).toBeDefined()
  })
  it('admin should generate an invite seed and admit a new user from it', () => {
    const invite = adminSigChain.invites.createUserInvite()
    expect(invite).toBeDefined()
    const prospectiveMember = UserService.createFromInviteSeed('user2', invite.seed)
    const inviteProof = InviteService.generateProof(invite.seed)
    expect(inviteProof).toBeDefined()
    expect(adminSigChain.invites.validateProof(inviteProof)).toBe(true)
    expect(prospectiveMember).toBeDefined()
    newMemberSigChain = SigChain.join(
      prospectiveMember.context,
      adminSigChain.team.save(),
      adminSigChain.team.teamKeyring()
    )
    expect(newMemberSigChain).toBeDefined()
    expect(newMemberSigChain.context).toBeDefined()
    expect(newMemberSigChain.context.user.userName).toBe('user2')
    expect(newMemberSigChain.context.user.userId).not.toBe(adminSigChain.context.user.userId)
    expect(newMemberSigChain.roles.amIMemberOfRole(newMemberSigChain.context, RoleName.MEMBER)).toBe(false)
    expect(newMemberSigChain.roles.amIMemberOfRole(newMemberSigChain.context, RoleName.ADMIN)).toBe(false)
    expect(
      adminSigChain.invites.admitMemberFromInvite(
        inviteProof,
        newMemberSigChain.context.user.userName,
        newMemberSigChain.context.user.userId,
        newMemberSigChain.context.user.keys
      )
    ).toBeDefined()
    expect(adminSigChain.roles.amIMemberOfRole(newMemberSigChain.context, RoleName.MEMBER)).toBe(true)
  })
  it('should add the new member to the private channel', () => {
    const privateChannel = adminSigChain.channels.getChannel(privateChannelName, adminSigChain.context)
    adminSigChain.channels.addMemberToPrivateChannel(newMemberSigChain.context.user.userId, privateChannel.channelName)
    expect(
      adminSigChain.channels.memberInChannel(newMemberSigChain.context.user.userId, privateChannel.channelName)
    ).toBe(true)
  })
  it('should remove the new member from the private channel', () => {
    const privateChannel = adminSigChain.channels.getChannel(privateChannelName, adminSigChain.context)
    adminSigChain.channels.revokePrivateChannelMembership(
      newMemberSigChain.context.user.userId,
      privateChannel.channelName
    )
    expect(adminSigChain.channels.getChannels(newMemberSigChain.context, true).length).toBe(0)
    expect(
      adminSigChain.channels.memberInChannel(newMemberSigChain.context.user.userId, privateChannel.channelName)
    ).toBe(false)
  })
  it('should delete channel', () => {
    const privateChannel = adminSigChain.channels.getChannel(privateChannelName, adminSigChain.context)
    adminSigChain.channels.deletePrivateChannel(privateChannel.channelName)
    expect(adminSigChain.channels.getChannels(adminSigChain.context).length).toBe(0)
  })
  it('should create new channel and then leave it', () => {
    const channel = adminSigChain.channels.createPrivateChannel(privateChannelName, adminSigChain.context)
    expect(channel).toBeDefined()
    adminSigChain.channels.leaveChannel(channel.channelName, adminSigChain.context)
    expect(adminSigChain.channels.memberInChannel(adminSigChain.context.user.userId, channel.channelName)).toBe(false)
    expect(adminSigChain.channels.getChannels(adminSigChain.context).length).toBe(1)
    expect(adminSigChain.channels.getChannels(adminSigChain.context, true).length).toBe(0)
  })
})
