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

export type EncryptedPayload = {
  contents: Base58
  scope: EncryptionScope & {
    generation: number
  }
}

export type EncryptedAndSignedPayload = {
  encrypted: EncryptedPayload
  signature: SignedEnvelope
  ts: number
  username: string
}
