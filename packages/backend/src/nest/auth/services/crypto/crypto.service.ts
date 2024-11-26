/**
 * Handles invite-related chain operations
 */
import * as bs58 from 'bs58'

import { EncryptedAndSignedPayload, EncryptedPayload, EncryptionScope, EncryptionScopeType } from './types'
import { ChainServiceBase } from '../chainServiceBase'
import { SigChain } from '../../sigchain'
import { asymmetric, Base58, Keyset, LocalUserContext, Member, SignedEnvelope } from '@localfirst/auth'
import { DEFAULT_SEARCH_OPTIONS, MemberSearchOptions } from '../members/types'
import { createLogger } from '../../../common/logger'

const logger = createLogger('auth:cryptoService')

class CryptoService extends ChainServiceBase {
  public static init(sigChain: SigChain): CryptoService {
    return new CryptoService(sigChain)
  }

  // TODO: Can we get other members' keys by generation?
  public getPublicKeysForMembersById(
    memberIds: string[],
    searchOptions: MemberSearchOptions = DEFAULT_SEARCH_OPTIONS
  ): Keyset[] {
    const members = this.sigChain.users.getUsersById(memberIds, searchOptions)
    return members.map((member: Member) => {
      return member.keys
    })
  }

  public encryptAndSign(message: any, scope: EncryptionScope, context: LocalUserContext): EncryptedAndSignedPayload {
    let encryptedPayload: EncryptedPayload
    switch (scope.type) {
      // Symmetrical Encryption Types
      case EncryptionScopeType.CHANNEL:
      case EncryptionScopeType.ROLE:
      case EncryptionScopeType.TEAM:
        encryptedPayload = this.symEncrypt(message, scope)
        break
      // Asymmetrical Encryption Types
      case EncryptionScopeType.USER:
        encryptedPayload = this.asymUserEncrypt(message, scope, context)
        break
      // Unknown Type
      default:
        throw new Error(`Unknown encryption type ${scope.type} provided!`)
    }

    const signature = this.sigChain.team.sign(encryptedPayload.contents)

    return {
      encrypted: encryptedPayload,
      signature,
      ts: Date.now(),
      username: context.user.userName,
    }
  }

  private symEncrypt(message: any, scope: EncryptionScope): EncryptedPayload {
    if (scope.type != EncryptionScopeType.TEAM && scope.name == null) {
      throw new Error(`Must provide a scope name when encryption scope is set to ${scope.type}`)
    }

    const envelope = this.sigChain.team.encrypt(message, scope.name)
    return {
      contents: bs58.default.encode(envelope.contents) as Base58,
      scope: {
        ...scope,
        generation: envelope.recipient.generation,
      },
    }
  }

  private asymUserEncrypt(message: any, scope: EncryptionScope, context: LocalUserContext): EncryptedPayload {
    if (scope.name == null) {
      throw new Error(`Must provide a user ID when encryption scope is set to ${scope.type}`)
    }

    const recipientKeys = this.getPublicKeysForMembersById([scope.name])
    const recipientKey = recipientKeys[0].encryption
    const senderKey = context.user.keys.encryption.secretKey
    const generation = recipientKeys[0].generation

    const encryptedContents = asymmetric.encrypt({
      secret: message,
      senderSecretKey: senderKey,
      recipientPublicKey: recipientKey,
    })

    return {
      contents: encryptedContents,
      scope: {
        ...scope,
        generation,
      },
    }
  }

  public decryptAndVerify(encrypted: EncryptedPayload, signature: SignedEnvelope, context: LocalUserContext): any {
    const isValid = this.sigChain.team.verify(signature)
    if (!isValid) {
      throw new Error(`Couldn't verify signature on message`)
    }

    switch (encrypted.scope.type) {
      // Symmetrical Encryption Types
      case EncryptionScopeType.CHANNEL:
      case EncryptionScopeType.ROLE:
      case EncryptionScopeType.TEAM:
        return this.symDecrypt(encrypted)
      // Asymmetrical Encryption Types
      case EncryptionScopeType.USER:
        return this.asymUserDecrypt(encrypted, signature, context)
      // Unknown Type
      default:
        throw new Error(`Unknown encryption scope type ${encrypted.scope.type}`)
    }
  }

  private symDecrypt(encrypted: EncryptedPayload): any {
    if (encrypted.scope.type !== EncryptionScopeType.TEAM && encrypted.scope.name == null) {
      throw new Error(`Must provide a scope name when encryption scope is set to ${encrypted.scope.type}`)
    }

    return this.sigChain.team.decrypt({
      contents: bs58.default.decode(encrypted.contents),
      recipient: {
        ...encrypted.scope,
        // you don't need a name on the scope when encrypting but you need one for decrypting because of how LFA searches for keys in lockboxes
        name: encrypted.scope.type === EncryptionScopeType.TEAM ? EncryptionScopeType.TEAM : encrypted.scope.name!,
      },
    })
  }

  private asymUserDecrypt(encrypted: EncryptedPayload, signature: SignedEnvelope, context: LocalUserContext): any {
    if (encrypted.scope.name == null) {
      throw new Error(`Must provide a user ID when encryption scope is set to ${encrypted.scope.type}`)
    }

    const senderKeys = this.sigChain.crypto.getPublicKeysForMembersById([signature.author.name])
    const recipientKey = context.user.keys.encryption.secretKey
    const senderKey = senderKeys[0].encryption

    return asymmetric.decrypt({
      cipher: encrypted.contents,
      senderPublicKey: senderKey,
      recipientSecretKey: recipientKey,
    })
  }
}

export { CryptoService }
