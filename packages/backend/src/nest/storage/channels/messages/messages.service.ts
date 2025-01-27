import { Injectable } from '@nestjs/common'
import { stringToArrayBuffer } from 'pvutils'
import EventEmitter from 'events'
import { getCrypto, ICryptoEngine } from 'pkijs'

import { keyObjectFromString, verifySignature } from '@quiet/identity'
import { ChannelMessage, ConsumedChannelMessage, NoCryptoEngineError } from '@quiet/types'

import { createLogger } from '../../../common/logger'
import { EncryptedAndSignedPayload, EncryptedPayload } from '../../../auth/services/crypto/types'
import { SignedEnvelope } from '3rd-party/auth/packages/auth/dist'
import { SigChainService } from '../../../auth/sigchain.service'

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
   * NOTE: This will call the encryption method below (https://github.com/TryQuiet/quiet/issues/2631)
   *
   * @param message Message to send
   * @returns Processed message
   */
  public async onSend(message: ChannelMessage): Promise<ChannelMessage> {
    return message
  }

  /**
   * Handle processing of message consumed from OrbitDB
   *
   * NOTE: This will call the decryption method below (https://github.com/TryQuiet/quiet/issues/2632)
   *
   * @param message Message consumed from OrbitDB
   * @returns Processed message
   */
  public async onConsume(message: ChannelMessage, verify: boolean = true): Promise<ConsumedChannelMessage> {
    const verified = verify ? await this.verifyMessage(message) : true
    return {
      ...message,
      verified,
    }
  }

  /**
   * Verify signature on message
   *
   * @param message Message to verify
   * @returns True if message is valid
   */
  public async verifyMessage(message: ChannelMessage): Promise<boolean> {
    const crypto = this.getCrypto()
    const signature = stringToArrayBuffer(message.signature)
    let cryptoKey = this.publicKeysMap.get(message.pubKey)

    if (!cryptoKey) {
      cryptoKey = await keyObjectFromString(message.pubKey, crypto)
      this.publicKeysMap.set(message.pubKey, cryptoKey)
    }

    return await verifySignature(signature, message.message, cryptoKey)
  }

  // TODO: https://github.com/TryQuiet/quiet/issues/2631
  // NOTE: the signature here may not be correct
  private async encryptMessage(message: ChannelMessage): Promise<EncryptedAndSignedPayload> {
    throw new Error(`MessagesService.encryptMessage is not implemented!`)
  }

  // TODO: https://github.com/TryQuiet/quiet/issues/2632
  // NOTE: the signature here may not be correct
  private async decryptMessage(encrypted: EncryptedPayload, signature: SignedEnvelope): Promise<ChannelMessage> {
    throw new Error(`MessagesService.decryptMessage is not implemented!`)
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
