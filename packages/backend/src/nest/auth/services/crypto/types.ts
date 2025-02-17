import { Base58, SignedEnvelope } from '@localfirst/auth'

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

export type EncryptionScopeDetail = EncryptionScope & {
  generation: number
}

export type EncryptedPayload = {
  contents: Uint8Array
  scope: EncryptionScopeDetail
}

export type EncryptedAndSignedPayload = {
  encrypted: EncryptedPayload
  signature: SignedEnvelope
  ts: number
  username: string
}

export type DecryptedPayload<T> = {
  contents: T
  isValid: boolean
}
