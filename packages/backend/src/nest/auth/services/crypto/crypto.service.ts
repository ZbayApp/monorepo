/**
 * Handles invite-related chain operations
 */
import * as bs58 from 'bs58'

import {
  DecryptedPayload,
  EncryptedAndSignedPayload,
  EncryptedPayload,
  EncryptionScope,
  EncryptionScopeType,
} from './types'
import { ChainServiceBase } from '../chainServiceBase'
import { SigChain } from '../../sigchain'
import {
  asymmetric,
  Base58,
  Keyset,
  LocalUserContext,
  Member,
  SignedEnvelope,
  EncryptStreamTeamPayload,
} from '@localfirst/auth'
import { DEFAULT_SEARCH_OPTIONS, MemberSearchOptions } from '../members/types'
import { createLogger } from '../../../common/logger'
import { KeyMetadata } from '3rd-party/auth/packages/crdx/dist'

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

    const signature = this.sigChain.team!.sign(encryptedPayload.contents)

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

    const envelope = this.sigChain.team!.encrypt(message, scope.name)
    return {
      contents: envelope.contents,
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

    const encryptedContents = asymmetric.encryptBytes({
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

  public decryptAndVerify<T>(
    encrypted: EncryptedPayload,
    signature: SignedEnvelope,
    context: LocalUserContext,
    failOnInvalid = true
  ): DecryptedPayload<T> {
    const isValid = this.verifyMessage(signature)
    if (!isValid && failOnInvalid) {
      throw new Error(`Couldn't verify signature on message`)
    }

    let contents: T
    switch (encrypted.scope.type) {
      // Symmetrical Encryption Types
      case EncryptionScopeType.CHANNEL:
      case EncryptionScopeType.ROLE:
      case EncryptionScopeType.TEAM:
        contents = this.symDecrypt<T>(encrypted)
        break
      // Asymmetrical Encryption Types
      case EncryptionScopeType.USER:
        contents = this.asymUserDecrypt<T>(encrypted, signature, context)
        break
      // Unknown Type
      default:
        throw new Error(`Unknown encryption scope type ${encrypted.scope.type}`)
    }

    return {
      contents,
      isValid,
    }
  }

  public verifyMessage(signature: SignedEnvelope): boolean {
    return this.sigChain.team!.verify(signature)
  }

  private symDecrypt<T>(encrypted: EncryptedPayload): T {
    if (encrypted.scope.type !== EncryptionScopeType.TEAM && encrypted.scope.name == null) {
      throw new Error(`Must provide a scope name when encryption scope is set to ${encrypted.scope.type}`)
    }

    return this.sigChain.team!.decrypt({
      contents: encrypted.contents,
      recipient: {
        ...encrypted.scope,
        // you don't need a name on the scope when encrypting but you need one for decrypting because of how LFA searches for keys in lockboxes
        name: encrypted.scope.type === EncryptionScopeType.TEAM ? EncryptionScopeType.TEAM : encrypted.scope.name!,
      },
    }) as T
  }

  private asymUserDecrypt<T>(encrypted: EncryptedPayload, signature: SignedEnvelope, context: LocalUserContext): T {
    if (encrypted.scope.name == null) {
      throw new Error(`Must provide a user ID when encryption scope is set to ${encrypted.scope.type}`)
    }

    const senderKeys = this.sigChain.crypto.getPublicKeysForMembersById([signature.author.name])
    const recipientKey = context.user.keys.encryption.secretKey
    const senderKey = senderKeys[0].encryption

    return asymmetric.decryptBytes({
      cipher: encrypted.contents,
      senderPublicKey: senderKey,
      recipientSecretKey: recipientKey,
    }) as T
  }

  public encryptStream(stream: AsyncIterable<Uint8Array>, scope: EncryptionScope): EncryptStreamTeamPayload {
    let payload: EncryptStreamTeamPayload
    switch (scope.type) {
      // Symmetrical Encryption Types
      case EncryptionScopeType.CHANNEL:
      case EncryptionScopeType.ROLE:
      case EncryptionScopeType.TEAM:
        payload = this.symEncryptStream(stream, scope)
        break
      // Asymmetrical Encryption Types
      case EncryptionScopeType.USER:
        throw new Error(`Stream encryption for scope type ${scope.type} is not currently supported!`)
      // Unknown Type
      default:
        throw new Error(`Unknown encryption type ${scope.type} provided!`)
    }

    return payload
  }

  private symEncryptStream(stream: AsyncIterable<Uint8Array>, scope: EncryptionScope): EncryptStreamTeamPayload {
    if (scope.type != EncryptionScopeType.TEAM && scope.name == null) {
      throw new Error(`Must provide a scope name when encryption scope is set to ${scope.type}`)
    }

    return this.sigChain.team!.encryptStream(stream, scope.name)
  }

  public decryptStream(
    encryptedStream: AsyncIterable<Uint8Array>,
    header: Uint8Array,
    scope: KeyMetadata
  ): AsyncGenerator<Uint8Array> {
    let decryptedStream: AsyncGenerator<Uint8Array>
    switch (scope.type) {
      // Symmetrical Encryption Types
      case EncryptionScopeType.CHANNEL:
      case EncryptionScopeType.ROLE:
      case EncryptionScopeType.TEAM:
        decryptedStream = this.symDecryptStream(encryptedStream, header, scope)
        break
      // Asymmetrical Encryption Types
      case EncryptionScopeType.USER:
        throw new Error(`Stream encryption for scope type ${scope.type} is not currently supported!`)
      // Unknown Type
      default:
        throw new Error(`Unknown encryption scope type ${scope.type}`)
    }

    return decryptedStream
  }

  private symDecryptStream(
    encryptedStream: AsyncIterable<Uint8Array>,
    header: Uint8Array,
    scope: KeyMetadata
  ): AsyncGenerator<Uint8Array> {
    if (scope.type !== EncryptionScopeType.TEAM && scope.name == null) {
      throw new Error(`Must provide a scope name when encryption scope is set to ${scope.type}`)
    }

    return this.sigChain.team!.decryptStream(encryptedStream, header, scope)
  }
}

export { CryptoService }
