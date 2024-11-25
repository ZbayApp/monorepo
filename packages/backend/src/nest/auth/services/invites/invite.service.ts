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

const logger = createLogger('auth:inviteService')

export const DEFAULT_MAX_USES = 1
export const DEFAULT_INVITATION_VALID_FOR_MS = 604_800_000 // 1 week

class InviteService extends ChainServiceBase {
  public static init(sigChain: SigChain): InviteService {
    return new InviteService(sigChain)
  }

  public createUserInvite(
    validForMs: number = DEFAULT_INVITATION_VALID_FOR_MS,
    maxUses: number = DEFAULT_MAX_USES,
    seed?: string
  ): InviteResult {
    const expiration = (Date.now() + validForMs) as UnixTimestamp
    const invitation: InviteResult = this.sigChain.team.inviteMember({
      seed,
      expiration,
      maxUses,
    })
    return invitation
  }

  public createDeviceInvite(validForMs: number = DEFAULT_INVITATION_VALID_FOR_MS, seed?: string): InviteResult {
    const expiration = (Date.now() + validForMs) as UnixTimestamp
    const invitation: InviteResult = this.sigChain.team.inviteDevice({
      expiration,
      seed,
    })
    return invitation
  }

  public revoke(id: string) {
    this.sigChain.team.revokeInvitation(id)
  }

  public getById(id: Base58): InvitationState {
    return this.sigChain.team.getInvitation(id)
  }

  public static generateProof(seed: string): ProofOfInvitation {
    return SigChain.lfa.invitation.generateProof(seed)
  }

  public validateProof(proof: ProofOfInvitation): boolean {
    const validationResult = this.sigChain.team.validateInvitation(proof) as ValidationResult
    if (!validationResult.isValid) {
      logger.warn(`Proof was invalid or was on an invalid invitation`, validationResult.error)
      return false
    }
    return true
  }

  public admitUser(proof: ProofOfInvitation, username: string, publicKeys: Keyset) {
    this.sigChain.team.admitMember(proof, publicKeys, username)
  }

  public admitMemberFromInvite(proof: ProofOfInvitation, username: string, userId: string, publicKeys: Keyset): string {
    this.sigChain.team.admitMember(proof, publicKeys, username)
    this.sigChain.roles.addMember(userId, RoleName.MEMBER)
    return username
  }

  public admitDeviceFromInvite(proof: ProofOfInvitation, firstUseDevice: FirstUseDevice): void {
    this.sigChain.team.admitDevice(proof, firstUseDevice)
  }

  public getAllInvites(): InvitationState[] {
    const inviteMap = this.sigChain.team.invitations()
    const invites: InvitationState[] = []
    for (const invite of Object.entries(inviteMap)) {
      invites.push(invite[1])
    }
    return invites
  }
}

export { InviteService }
