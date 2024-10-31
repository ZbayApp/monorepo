/**
 * Handles user-related chain operations
 */

//import { KeyMap } from '../../../../../../packages/auth/dist/team/selectors/keyMap'
import { ChainServiceBase } from '../chainServiceBase'
import { ProspectiveUser, MemberSearchOptions, DEFAULT_SEARCH_OPTIONS } from './types'
import { DeviceWithSecrets, LocalUserContext, Member, User, UserWithSecrets } from '@localfirst/auth'
import { SigChain } from '../../sigchain'
import { DeviceService } from './device.service'
import { InviteService } from '../invites/invite.service'
import { KeyMap } from '@localfirst/auth/team/selectors/keyMap'
import { createLogger } from '../../../common/logger'

const logger = createLogger('auth:userService')

class UserService extends ChainServiceBase {
  public static init(sigChain: SigChain): UserService {
    return new UserService(sigChain)
  }

  /**
   * Generates a brand new QuietUser instance with an initial device from a given username
   *
   * @param name The username
   * @param id Optionally specify the user's ID (otherwise autogenerate)
   * @returns New QuietUser instance with an initial device
   */
  public static create(name: string, id?: string): LocalUserContext {
    const user: UserWithSecrets = SigChain.lfa.createUser(name, id)
    const device: DeviceWithSecrets = DeviceService.generateDeviceForUser(user.userId)

    return {
      user,
      device,
    }
  }

  /**
   * Generates a new prospective user from an invite seed
   *
   * @param name The username
   * @param seed The invite seed
   * @returns ProspectiveUser instance
   */
  public static createFromInviteSeed(name: string, seed: string): ProspectiveUser {
    const context = this.create(name)
    const inviteProof = InviteService.generateProof(seed)
    const publicKeys = UserService.redactUser(context.user).keys

    return {
      context,
      inviteProof,
      publicKeys,
    }
  }

  /**
   * Get
   */
  public getKeys(): KeyMap {
    return this.sigChain.team.allKeys()
  }

  public getAllUsers(): Member[] {
    return this.sigChain.team.members()
  }

  public getUsersById(memberIds: string[], options: MemberSearchOptions = DEFAULT_SEARCH_OPTIONS): Member[] {
    if (memberIds.length === 0) {
      return []
    }

    return this.sigChain.team.members(memberIds, options)
  }

  public getUserByName(memberName: string): Member | undefined {
    return this.getAllUsers().find(member => member.userName === memberName)
  }

  public static redactUser(user: UserWithSecrets): User {
    return SigChain.lfa.redactUser(user)
  }
}

export { UserService }
