/**
 * Handles invite-related chain operations
 */

import { ChainServiceBase } from '../chainServiceBase'
import { ValidationResult } from '@localfirst/crdx'
import {
  Base58,
  FirstUseDevice,
  InvitationState,
  InviteResult,
  Keyset,
  ProofOfInvitation,
  UnixTimestamp,
} from '@localfirst/auth'
import { SigChain } from '../../sigchain'
import { RoleName } from '../roles/roles'
import { createLogger } from '../../../common/logger'
import { PermissionsError } from '@quiet/types'

const logger = createLogger('auth:inviteService')

export const DEFAULT_MAX_USES = 1
export const DEFAULT_INVITATION_VALID_FOR_MS = 604_800_000 // 1 week
export const DEFAULT_LONG_LIVED_MAX_USES = 0 // no limit
export const DEFAULT_LONG_LIVED_VALID_FOR_MS = 0 // no limit

class InviteService extends ChainServiceBase {
  public static init(sigChain: SigChain): InviteService {
    return new InviteService(sigChain)
  }

  public createUserInvite(
    validForMs: number = DEFAULT_INVITATION_VALID_FOR_MS,
    maxUses: number = DEFAULT_MAX_USES,
    seed?: string
  ): InviteResult {
    let expiration: UnixTimestamp = 0 as UnixTimestamp
    if (validForMs > 0) {
      expiration = (Date.now() + validForMs) as UnixTimestamp
    }
    if (!this.sigChain.team) {
      throw new Error('SigChain is not initialized')
    }
    if (!this.sigChain.team!.memberIsAdmin(this.sigChain.localUserContext.user.userId)) {
      throw new PermissionsError('Only the admin can create invites')
    }
    const invitation: InviteResult = this.sigChain.team!.inviteMember({
      seed,
      expiration,
      maxUses,
    })
    return invitation
  }

  public createLongLivedUserInvite(): InviteResult {
    return this.createUserInvite(DEFAULT_LONG_LIVED_VALID_FOR_MS, DEFAULT_LONG_LIVED_MAX_USES)
  }

  public createDeviceInvite(validForMs: number = DEFAULT_INVITATION_VALID_FOR_MS, seed?: string): InviteResult {
    const expiration = (Date.now() + validForMs) as UnixTimestamp
    const invitation: InviteResult = this.sigChain.team!.inviteDevice({
      expiration,
      seed,
    })
    return invitation
  }

  public isValidLongLivedUserInvite(id: Base58): boolean {
    logger.info(`Validating LFA invite with ID ${id}`)
    const invites = this.getAllInvites()
    for (const invite of invites) {
      if (
        invite.id === id && // is correct invite
        !invite.revoked && // is not revoked
        invite.maxUses == 0 && // is an unlimited invite
        invite.expiration == 0 // is an unlimited invite
      ) {
        return true
      }
    }

    return false
  }

  public revoke(id: string) {
    if (!this.sigChain.team!.memberIsAdmin(this.sigChain.localUserContext.user.userId)) {
      throw new PermissionsError('Only the admin can revoke invites')
    }
    this.sigChain.team!.revokeInvitation(id)
  }

  public getById(id: Base58): InvitationState {
    return this.sigChain.team!.getInvitation(id)
  }

  public static generateProof(seed: string): ProofOfInvitation {
    return SigChain.lfa.invitation.generateProof(seed)
  }

  public validateProof(proof: ProofOfInvitation): boolean {
    const validationResult = this.sigChain.team!.validateInvitation(proof) as ValidationResult
    if (!validationResult.isValid) {
      logger.warn(`Proof was invalid or was on an invalid invitation`, validationResult.error)
      return false
    }
    return true
  }

  public admitUser(proof: ProofOfInvitation, username: string, publicKeys: Keyset) {
    this.sigChain.team!.admitMember(proof, publicKeys, username)
  }

  public admitMemberFromInvite(proof: ProofOfInvitation, username: string, userId: string, publicKeys: Keyset): string {
    this.sigChain.team!.admitMember(proof, publicKeys, username)
    this.sigChain.roles.addMember(userId, RoleName.MEMBER)
    return username
  }

  public admitDeviceFromInvite(proof: ProofOfInvitation, firstUseDevice: FirstUseDevice): void {
    this.sigChain.team!.admitDevice(proof, firstUseDevice)
  }

  public getAllInvites(): InvitationState[] {
    const inviteMap = this.sigChain.team!.invitations()
    const invites: InvitationState[] = []
    for (const invite of Object.entries(inviteMap)) {
      invites.push(invite[1])
    }
    return invites
  }
}

export { InviteService }
