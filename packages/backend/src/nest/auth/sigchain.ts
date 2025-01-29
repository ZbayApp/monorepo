/**
 * Handles generating the chain and aggregating all chain operations
 */

import * as auth from '@localfirst/auth'
import { UserService } from './services/members/user.service'
import { RoleService } from './services/roles/role.service'
import { ChannelService } from './services/roles/channel.service'
import { DeviceService } from './services/members/device.service'
import { InviteService } from './services/invites/invite.service'
import { CryptoService } from './services/crypto/crypto.service'
import { RoleName } from './services/roles/roles'
import { createLogger } from '../common/logger'

const logger = createLogger('auth:sigchain')

class SigChain {
  public localUserContext: auth.LocalUserContext
  public context: auth.Context
  public team: auth.Team | null = null
  private _users: UserService | null = null
  private _devices: DeviceService | null = null
  private _roles: RoleService | null = null
  private _channels: ChannelService | null = null
  private _invites: InviteService | null = null
  private _crypto: CryptoService | null = null

  private constructor(localUserContext: auth.LocalUserContext, team?: auth.Team) {
    this.localUserContext = localUserContext
    if (team) this.team = team
  }

  /**
   * Create a brand new SigChain with a given name and also generate the initial user with a given name
   *
   * @param teamName Name of the team we are creating
   * @param username Username of the initial user we are generating
   * @returns LoadedSigChain instance with the new SigChain and user context
   */
  public static create(teamName: string, username: string): SigChain {
    const context = UserService.create(username)
    const team: auth.Team = this.lfa.createTeam(teamName, context)
    const sigChain = this.init(context, team)
    sigChain.context = {
      user: context.user,
      device: context.device,
      team: team,
    } as auth.MemberContext

    // sigChain.roles.createWithMembers(RoleName.ADMIN, [context.user.userId])
    sigChain.roles.createWithMembers(RoleName.MEMBER, [context.user.userId])

    return sigChain
  }

  public static createFromTeam(team: auth.Team, context: auth.LocalUserContext): SigChain {
    const sigChain = this.init(context, team)
    sigChain.context = {
      user: context.user,
      device: context.device,
      team: team,
    } as auth.MemberContext
    return sigChain
  }

  public static load(serializedTeam: Uint8Array, context: auth.LocalUserContext, teamKeyRing: auth.Keyring): SigChain {
    const team: auth.Team = this.lfa.loadTeam(serializedTeam, context, teamKeyRing)
    const sigChain = this.init(context, team)
    sigChain.context = {
      user: context.user,
      device: context.device,
      team: team,
    } as auth.MemberContext

    return sigChain
  }

  public static createFromInvite(username: string, seed: string): SigChain {
    const prospectiveUser = UserService.createFromInviteSeed(username, seed)
    const sigChain = this.init(prospectiveUser.context)
    sigChain.context = {
      user: prospectiveUser.context.user,
      device: prospectiveUser.context.device,
      invitationSeed: seed,
    } as auth.InviteeContext

    return sigChain
  }

  // TODO: Is this the right signature for this method?
  public static join(context: auth.LocalUserContext, serializedTeam: Uint8Array, teamKeyRing: auth.Keyring): SigChain {
    const team: auth.Team = this.lfa.loadTeam(serializedTeam, context, teamKeyRing)
    team.join(teamKeyRing)

    const sigChain = this.init(context)

    return sigChain
  }

  public static init(context: auth.LocalUserContext, team?: auth.Team): SigChain {
    const sigChain = new SigChain(context, team)
    sigChain.initServices()

    return sigChain
  }

  private initServices() {
    this._users = UserService.init(this)
    this._devices = DeviceService.init(this)
    this._roles = RoleService.init(this)
    this._channels = ChannelService.init(this)
    this._invites = InviteService.init(this)
    this._crypto = CryptoService.init(this)
  }

  public save(): Uint8Array {
    if (!this.team) {
      return new Uint8Array()
    }
    return this.team!.save() // this doesn't actually do anything but create the new state to save
  }

  get users(): UserService {
    return this._users!
  }

  get roles(): RoleService {
    return this._roles!
  }

  get channels(): ChannelService {
    return this._channels!
  }

  get devices(): DeviceService {
    return this._devices!
  }

  get invites(): InviteService {
    return this._invites!
  }

  get crypto(): CryptoService {
    return this._crypto!
  }

  static get lfa(): typeof auth {
    return auth
  }
}

export { SigChain }
