/**
 * Handles role-related chain operations
 */

import { SigChain } from '../../chain.js'
import { BaseChainService } from '../baseService.js'
import { Permissions } from './permissions.js'
import { QuietRole, RoleName } from './roles.js'
import { LocalUserContext, Member, PermissionsMap, Role } from '@localfirst/auth'

class RoleService extends BaseChainService {
  public static init(sigChain: SigChain): RoleService {
    return new RoleService(sigChain)
  }

  // TODO: figure out permissions
  public create(roleName: RoleName | string, permissions: PermissionsMap = {}, staticMembership: boolean = false) {
    console.log(`Adding new role with name ${roleName}`)
    if (!staticMembership) {
      permissions[Permissions.MODIFIABLE_MEMBERSHIP] = true
    }

    const role: Role = {
      roleName,
      permissions,
    }

    this.sigChain.team.addRole(role)
    // this.activeSigChain.persist()
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
    // this.activeSigChain.persist()
  }

  public addMember(memberId: string, roleName: string) {
    console.log(`Adding member with ID ${memberId} to role ${roleName}`)
    this.sigChain.team.addMemberRole(memberId, roleName)
    // this.activeSigChain.persist()
  }

  public revokeMembership(memberId: string, roleName: string) {
    console.log(`Revoking role ${roleName} for member with ID ${memberId}`)
    this.sigChain.team.removeMemberRole(memberId, roleName)
    // this.activeSigChain.persist()
  }

  public delete(roleName: string) {
    console.log(`Removing role with name ${roleName}`)
    this.sigChain.team.removeRole(roleName)
    // this.activeSigChain.persist()
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
