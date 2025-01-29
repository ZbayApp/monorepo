import { Injectable } from '@nestjs/common'
import { stringToArrayBuffer } from 'pvutils'
import EventEmitter from 'events'
import { getCrypto, ICryptoEngine } from 'pkijs'

import { keyObjectFromString, verifySignature } from '@quiet/identity'
import {
  ChannelMessage,
  CompoundError,
  ConsumedChannelMessage,
  EncryptionSignature,
  NoCryptoEngineError,
} from '@quiet/types'

import { createLogger } from '../../../common/logger'
import { EncryptionScopeType } from '../../../auth/services/crypto/types'
import { SigChainService } from '../../../auth/sigchain.service'
import { EncryptedMessage } from './messages.types'
import { SignedEnvelope } from '3rd-party/auth/packages/auth/dist'

@Injectable()
export class MessagesService extends EventEmitter {
  /**
   * Map of signing keys used on messages
   *
   * Maps public key string -> CryptoKey
   */
  private publicKeysMap: Map<string, CryptoKey> = new Map()

  private readonly logger = createLogger(`storage:channels:messagesService`)

  constructor(private readonly sigChainService: SigChainService) {
    super()
  }

  /**
   * Handle processing of message to be added to OrbitDB and sent to peers
   *
   * @param message Message to send
   * @returns Processed message
   */
  public async onSend(message: ChannelMessage): Promise<EncryptedMessage> {
    return this._encryptPublicChannelMessage(message)
  }

  /**
   * Handle processing of message consumed from OrbitDB
   *
   * @param message Message consumed from OrbitDB
   * @returns Processed message
   */
  public async onConsume(message: EncryptedMessage): Promise<ConsumedChannelMessage> {
    return this._decryptPublicChannelMessage(message)
  }

  /**
   * Verify encryption signature on message
   *
   * @param message Message to verify
   * @returns True if message is valid
   */
  public verifyMessage(message: EncryptedMessage): boolean {
    try {
      const chain = this.sigChainService.getActiveChain()
      return chain.crypto.verifyMessage(message.encSignature)
    } catch (e) {
      throw new CompoundError(`Failed to verify message signature`, e)
    }
  }

  private _encryptPublicChannelMessage(rawMessage: ChannelMessage): EncryptedMessage {
    try {
      const chain = this.sigChainService.getActiveChain()
      const encryptedMessage = chain.crypto.encryptAndSign(
        rawMessage.message,
        { type: EncryptionScopeType.TEAM },
        chain.localUserContext
      )
      return {
        ...rawMessage,
        encSignature: encryptedMessage.signature,
        message: encryptedMessage.encrypted,
      }
    } catch (e) {
      throw new CompoundError(`Failed to encrypt message with error`, e)
    }
  }

  private _decryptPublicChannelMessage(encryptedMessage: EncryptedMessage): ConsumedChannelMessage {
    try {
      const chain = this.sigChainService.getActiveChain()
      const decryptedMessage = chain.crypto.decryptAndVerify<string>(
        encryptedMessage.message,
        encryptedMessage.encSignature,
        chain.localUserContext,
        false
      )
      return {
        ...encryptedMessage,
        message: decryptedMessage.contents,
        verified: decryptedMessage.isValid,
      }
    } catch (e) {
      throw new CompoundError(`Failed to decrypt message with error`, e)
    }
  }

  /**
   * Get crypto engine that was initialized previously
   *
   * @returns Crypto engine
   * @throws NoCryptoEngineError
   */
  private getCrypto(): ICryptoEngine {
    const crypto = getCrypto()
    if (crypto == null) {
      throw new NoCryptoEngineError()
    }

    return crypto
  }

  /**
   * Clean service
   *
   * NOTE: Does NOT affect data stored in IPFS
   */
  public async clean(): Promise<void> {
    this.publicKeysMap = new Map()
  }
}
