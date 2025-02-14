import { FileMetadata } from '@quiet/types'
import { EncryptedPayload, TruncatedSignedEnvelope } from '../../../auth/services/crypto/types'

export interface EncryptableMessageComponents {
  type: number
  message: string
  signature: string
  pubKey: string
  media?: FileMetadata
}

export interface EncryptedMessage {
  id: string
  contents: EncryptedPayload
  createdAt: number
  channelId: string
  encSignature: TruncatedSignedEnvelope
}
