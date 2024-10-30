/**
 * Handles DM/Group DM-related chain operations
 */

import { createHash } from 'crypto'
import { ChainServiceBase } from '../chainServiceBase'
import { Keyset } from '@localfirst/auth'
import { SigChain } from '../../sigchain'
import { createLogger } from '../../../common/logger'

const logger = createLogger('auth:dmService')
class DMService extends ChainServiceBase {
  private dmMap: Map<string, string[]> = new Map()

  public static init(sigChain: SigChain): DMService {
    return new DMService(sigChain)
  }

  public create(memberIds: string[]): string {
    // this is the ID that will be used for storage and mapping purposes
    const id = DMService.getDmId(memberIds)

    if (!this.dmMap.has(id)) {
      this.dmMap.set(id, memberIds)
    }

    return id
  }

  public getDmKeysById(id: string): Keyset[] {
    if (!this.dmMap.has(id)) {
      throw new Error(`No DM mapping was found for id ${id}`)
    }

    const memberIds = this.dmMap.get(id)!
    return this.sigChain.crypto.getPublicKeysForMembersById(memberIds, { includeRemoved: false, throwOnMissing: false })
  }

  private static getDmId(memberIds: string[]): string {
    const dmId = createHash('md5').update(memberIds.toString()).digest('hex')
    return `priv_dm_${dmId}`
  }
}

export { DMService }
