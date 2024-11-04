/**
 * Handles channel-related chain operations
 */

import { LocalUserContext, Role } from '@localfirst/auth'
import { SigChain } from '../../sigchain'
import { ChainServiceBase } from '../chainServiceBase'
import { Channel, QuietRole } from './roles'
import { createLogger } from '../../../common/logger'

const logger = createLogger('auth:channelService')

const CHANNEL_ROLE_KEY_PREFIX = 'priv_chan_'

class ChannelService extends ChainServiceBase {
  public static init(sigChain: SigChain): ChannelService {
    return new ChannelService(sigChain)
  }

  // TODO: figure out permissions
  public createPrivateChannel(channelName: string, context: LocalUserContext): Channel {
    logger.info(`Creating private channel role with name ${channelName}`)
    this.sigChain.roles.create(ChannelService.getPrivateChannelRoleName(channelName))
    this.addMemberToPrivateChannel(context.user.userId, channelName)

    return this.getChannel(channelName, context)
  }

  public addMemberToPrivateChannel(userId: string, channelName: string) {
    logger.info(`Adding member with ID ${userId} to private channel role with name ${channelName}`)
    this.sigChain.roles.addMember(userId, ChannelService.getPrivateChannelRoleName(channelName))
  }

  public revokePrivateChannelMembership(userId: string, channelName: string) {
    logger.info(`Removing member with ID ${userId} from private channel with name ${channelName}`)
    this.sigChain.roles.revokeMembership(userId, ChannelService.getPrivateChannelRoleName(channelName))
  }

  public deletePrivateChannel(channelName: string) {
    logger.info(`Deleting private channel with name ${channelName}`)
    this.sigChain.roles.delete(ChannelService.getPrivateChannelRoleName(channelName))
  }

  public leaveChannel(channelName: string, context: LocalUserContext) {
    logger.info(`Leaving private channel with name ${channelName}`)
    this.revokePrivateChannelMembership(context.user.userId, channelName)
  }

  public getChannel(channelName: string, context: LocalUserContext): Channel {
    const role = this.sigChain.roles.getRole(ChannelService.getPrivateChannelRoleName(channelName), context)
    return this.roleToChannel(role, channelName, context)
  }

  public getChannels(context: LocalUserContext, haveAccessOnly: boolean = false): Channel[] {
    const allRoles = this.sigChain.roles.getAllRoles(context, haveAccessOnly)
    const allChannels = allRoles
      .filter((role: QuietRole) => this.isRoleChannel(context, role.roleName))
      .map((role: QuietRole) =>
        this.roleToChannel(role, ChannelService.getPrivateChannelNameFromRoleName(role.roleName), context)
      )

    return allChannels
  }

  public memberInChannel(userId: string, channelName: string): boolean {
    const roleName = ChannelService.getPrivateChannelRoleName(channelName)
    return this.sigChain.roles.memberHasRole(userId, roleName)
  }

  public amIInChannel(context: LocalUserContext, channelName: string): boolean {
    return this.memberInChannel(context.user.userId, channelName)
  }

  public isRoleChannel(context: LocalUserContext, roleName: string): boolean
  public isRoleChannel(context: LocalUserContext, role: QuietRole | Role): boolean
  public isRoleChannel(context: LocalUserContext, roleNameOrRole: string | QuietRole | Role): boolean {
    let roleName: string
    if (typeof roleNameOrRole === 'string') {
      roleName = roleNameOrRole
    } else {
      roleName = roleNameOrRole.roleName
    }

    return roleName.startsWith(CHANNEL_ROLE_KEY_PREFIX)
  }

  private roleToChannel(role: QuietRole, channelName: string, context: LocalUserContext): Channel {
    return {
      ...role,
      channelName,
    } as Channel
  }

  public static getPrivateChannelRoleName(channelName: string): string {
    return `${CHANNEL_ROLE_KEY_PREFIX}${channelName}`
  }

  public static getPrivateChannelNameFromRoleName(roleName: string): string {
    return roleName.split(CHANNEL_ROLE_KEY_PREFIX)[1]
  }
}

export { ChannelService }
