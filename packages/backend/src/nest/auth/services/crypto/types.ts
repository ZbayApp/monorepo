import { KeyMetadata } from '3rd-party/auth/packages/crdx/dist'
import { Base58 } from '@localfirst/auth'

export enum EncryptionScopeType {
  ROLE = 'ROLE',
  CHANNEL = 'CHANNEL',
  USER = 'USER',
  TEAM = 'TEAM',
}

export type EncryptionScope = {
  type: EncryptionScopeType
  name?: string
}

export type EncryptedPayload = {
  contents: Base58
  scope: EncryptionScope & {
    generation: number
  }
}

export type EncryptedAndSignedPayload = {
  encrypted: EncryptedPayload
  signature: Signature
  ts: number
  username: string
}

export type DecryptedPayload<T> = {
  contents: T
  isValid: boolean
}

export type Signature = {
  signature: Base58
  author: KeyMetadata
}
