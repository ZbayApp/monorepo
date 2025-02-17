import { Injectable } from '@nestjs/common'
import EventEmitter from 'events'

import { ChannelMessage, CompoundError, ConsumedChannelMessage } from '@quiet/types'

import { createLogger } from '../../../common/logger'
import { EncryptionScopeType } from '../../../auth/services/crypto/types'
import { SigChainService } from '../../../auth/sigchain.service'
import { EncryptableMessageComponents, EncryptedMessage } from './messages.types'
import { RoleName } from '../../../auth/services/roles/roles'

@Injectable()
export class MessagesService extends EventEmitter {
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
  public async onConsume(message: EncryptedMessage): Promise<ConsumedChannelMessage | undefined> {
    try {
      return this._decryptPublicChannelMessage(message)
    } catch (e) {
      this.logger.error(`Failed to process message on consume`, e)
      return undefined
    }
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
      return chain.crypto.verifyMessage({
        ...message.encSignature,
        contents: message.contents.contents,
      })
    } catch (e) {
      throw new CompoundError(`Failed to verify message signature`, e)
    }
  }

  private _encryptPublicChannelMessage(rawMessage: ChannelMessage): EncryptedMessage {
    try {
      const chain = this.sigChainService.getActiveChain()
      const encryptable: EncryptableMessageComponents = {
        type: rawMessage.type,
        message: rawMessage.message,
        signature: rawMessage.signature,
        pubKey: rawMessage.pubKey,
        media: rawMessage.media,
      }
      const encryptedMessage = chain.crypto.encryptAndSign(
        encryptable,
        { type: EncryptionScopeType.ROLE, name: RoleName.MEMBER },
        chain.localUserContext
      )
      return {
        id: rawMessage.id,
        channelId: rawMessage.channelId,
        createdAt: rawMessage.createdAt,
        encSignature: encryptedMessage.signature,
        contents: encryptedMessage.encrypted,
      }
      // disregard
    } catch (e) {
      throw new CompoundError(`Failed to encrypt message with error`, e)
    }
  }

  private _decryptPublicChannelMessage(encryptedMessage: EncryptedMessage): ConsumedChannelMessage {
    try {
      const chain = this.sigChainService.getActiveChain()
      const decryptedMessage = chain.crypto.decryptAndVerify<EncryptableMessageComponents>(
        encryptedMessage.contents,
        encryptedMessage.encSignature,
        chain.localUserContext,
        false
      )
      return {
        ...decryptedMessage.contents,
        id: encryptedMessage.id,
        channelId: encryptedMessage.channelId,
        createdAt: encryptedMessage.createdAt,
        encSignature: encryptedMessage.encSignature,
        verified: decryptedMessage.isValid,
      }
    } catch (e) {
      throw new CompoundError(`Failed to decrypt message with error`, e)
    }
  }
}
