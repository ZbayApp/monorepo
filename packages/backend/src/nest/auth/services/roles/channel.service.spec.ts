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
  let adminContext: LocalUserContext
  let newMemberSigChain: SigChain
  let newMemberContext: LocalUserContext

  it('should initialize a new sigchain and be admin', () => {
    ;({ sigChain: adminSigChain, context: adminContext } = SigChain.create('test', 'user'))
    expect(adminSigChain).toBeDefined()
    expect(adminContext).toBeDefined()
    expect(adminSigChain.team.teamName).toBe('test')
    expect(adminContext.user.userName).toBe('user')
    expect(adminSigChain.roles.amIMemberOfRole(adminContext, RoleName.ADMIN)).toBe(true)
    expect(adminSigChain.roles.amIMemberOfRole(adminContext, RoleName.MEMBER)).toBe(true)
  })
  it('should create a private channel', () => {
    const privateChannel = adminSigChain.channels.createPrivateChannel(privateChannelName, adminContext)
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
    ;({ sigChain: newMemberSigChain, context: newMemberContext } = SigChain.join(
      prospectiveMember.context,
      adminSigChain.team.save(),
      adminSigChain.team.teamKeyring()
    ))
    expect(newMemberSigChain).toBeDefined()
    expect(newMemberContext).toBeDefined()
    expect(newMemberContext.user.userName).toBe('user2')
    expect(newMemberContext.user.userId).not.toBe(adminContext.user.userId)
    expect(newMemberSigChain.roles.amIMemberOfRole(newMemberContext, RoleName.MEMBER)).toBe(false)
    expect(newMemberSigChain.roles.amIMemberOfRole(newMemberContext, RoleName.ADMIN)).toBe(false)
    expect(
      adminSigChain.invites.admitMemberFromInvite(
        inviteProof,
        newMemberContext.user.userName,
        newMemberContext.user.userId,
        newMemberContext.user.keys
      )
    ).toBeDefined()
    expect(adminSigChain.roles.amIMemberOfRole(newMemberContext, RoleName.MEMBER)).toBe(true)
  })
  it('should add the new member to the private channel', () => {
    const privateChannel = adminSigChain.channels.getChannel(privateChannelName, adminContext)
    adminSigChain.channels.addMemberToPrivateChannel(newMemberContext.user.userId, privateChannel.channelName)
    expect(adminSigChain.channels.memberInChannel(newMemberContext.user.userId, privateChannel.channelName)).toBe(true)
  })
  it('should remove the new member from the private channel', () => {
    const privateChannel = adminSigChain.channels.getChannel(privateChannelName, adminContext)
    adminSigChain.channels.revokePrivateChannelMembership(newMemberContext.user.userId, privateChannel.channelName)
    expect(adminSigChain.channels.getChannels(newMemberContext, true).length).toBe(0)
    expect(adminSigChain.channels.memberInChannel(newMemberContext.user.userId, privateChannel.channelName)).toBe(false)
  })
  it('should delete channel', () => {
    const privateChannel = adminSigChain.channels.getChannel(privateChannelName, adminContext)
    adminSigChain.channels.deletePrivateChannel(privateChannel.channelName)
    expect(adminSigChain.channels.getChannels(adminContext).length).toBe(0)
  })
  it('should create new channel and then leave it', () => {
    const channel = adminSigChain.channels.createPrivateChannel(privateChannelName, adminContext)
    expect(channel).toBeDefined()
    adminSigChain.channels.leaveChannel(channel.channelName, adminContext)
    expect(adminSigChain.channels.memberInChannel(adminContext.user.userId, channel.channelName)).toBe(false)
    expect(adminSigChain.channels.getChannels(adminContext).length).toBe(1)
    expect(adminSigChain.channels.getChannels(adminContext, true).length).toBe(0)
  })
})
