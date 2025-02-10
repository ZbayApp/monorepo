import { SignedEnvelope } from '3rd-party/auth/packages/auth/dist'
import { EncryptedPayload } from '../../../auth/services/crypto/types'

import { FileMetadata } from '@quiet/types'

export interface EncryptedMessage {
  id: string
  type: number
  message: EncryptedPayload
  createdAt: number
  channelId: string
  encSignature: SignedEnvelope
  signature: string
  pubKey: string
  media?: FileMetadata
}
