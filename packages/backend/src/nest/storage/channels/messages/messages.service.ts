import { Injectable } from '@nestjs/common'
import { stringToArrayBuffer } from 'pvutils'
import EventEmitter from 'events'
import { getCrypto, ICryptoEngine } from 'pkijs'

import { keyObjectFromString, verifySignature } from '@quiet/identity'
import { ChannelMessage, NoCryptoEngineError } from '@quiet/types'

import { createLogger } from '../../../common/logger'
import { EncryptedAndSignedPayload, EncryptedPayload } from '../../../auth/services/crypto/types'
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

  constructor() {
    super()
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
  public async encryptMessage(message: ChannelMessage): Promise<EncryptedAndSignedPayload> {
    throw new Error(`MessagesService.encryptMessage is not implemented!`)
  }

  // TODO: https://github.com/TryQuiet/quiet/issues/2632
  // NOTE: the signature here may not be correct
  public async decryptMessage(encrypted: EncryptedPayload, signature: SignedEnvelope): Promise<ChannelMessage> {
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
