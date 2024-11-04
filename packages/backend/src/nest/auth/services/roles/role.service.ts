/**
 * Handles role-related chain operations
 */

import { SigChain } from '../../sigchain'
import { ChainServiceBase } from '../chainServiceBase'
import { Permissions } from './permissions'
import { QuietRole, RoleName } from './roles'
import { LocalUserContext, Member, PermissionsMap, Role } from '@localfirst/auth'
import { createLogger } from '../../../common/logger'
import { QuietLogger } from '@quiet/logger'

class RoleService extends ChainServiceBase {
  private readonly logger: QuietLogger

  constructor(sigChain: SigChain) {
    super(sigChain)
    this.logger = createLogger(`auth:roleService(${sigChain.team.teamName})`)
  }

  public static init(sigChain: SigChain): RoleService {
    return new RoleService(sigChain)
  }

  // TODO: figure out permissions
  public create(roleName: RoleName | string, permissions: PermissionsMap = {}, staticMembership: boolean = false) {
    this.logger.info(`Adding new role with name ${roleName}`)
    if (!staticMembership) {
      permissions[Permissions.MODIFIABLE_MEMBERSHIP] = true
    }

    const role: Role = {
      roleName,
      permissions,
    }

    this.sigChain.team.addRole(role)
  }

  // TODO: figure out permissions
  public createWithMembers(
    roleName: RoleName | string,
    memberIdsForRole: string[],
    permissions: PermissionsMap = {},
    staticMembership: boolean = false
  ) {
    this.create(roleName, permissions, staticMembership)
    for (const memberId of memberIdsForRole) {
      this.addMember(memberId, roleName)
    }
  }

  public addMember(memberId: string, roleName: string) {
    this.logger.info(`Adding member with ID ${memberId} to role ${roleName}`)
    this.sigChain.team.addMemberRole(memberId, roleName)
  }

  public revokeMembership(memberId: string, roleName: string) {
    this.logger.info(`Revoking role ${roleName} for member with ID ${memberId}`)
    this.sigChain.team.removeMemberRole(memberId, roleName)
  }

  public delete(roleName: string) {
    this.logger.info(`Removing role with name ${roleName}`)
    this.sigChain.team.removeRole(roleName)
  }

  public getRole(roleName: string, context: LocalUserContext): QuietRole {
    const role = this.sigChain.team.roles(roleName)
    if (!role) {
      throw new Error(`No role found with name ${roleName}`)
    }

    return this.roleToQuietRole(role, context)
  }

  public getAllRoles(context: LocalUserContext, haveAccessOnly: boolean = false): QuietRole[] {
    const allRoles = this.sigChain.team.roles().map(role => this.roleToQuietRole(role, context))
    if (haveAccessOnly) {
      return allRoles.filter((role: QuietRole) => role.hasRole === true)
    }

    return allRoles
  }

  public memberHasRole(memberId: string, roleName: string): boolean {
    return this.sigChain.team.memberHasRole(memberId, roleName)
  }

  public amIMemberOfRole(context: LocalUserContext, roleName: string): boolean {
    return this.memberHasRole(context.user.userId, roleName)
  }

  public getMembersForRole(roleName: string): Member[] {
    return this.sigChain.team.membersInRole(roleName)
  }

  private roleToQuietRole(role: Role, context: LocalUserContext): QuietRole {
    const members = this.sigChain.roles.getMembersForRole(role.roleName)
    const hasRole = this.sigChain.roles.amIMemberOfRole(context, role.roleName)
    return {
      ...role,
      members,
      hasRole,
    }
  }
}

export { RoleService }
