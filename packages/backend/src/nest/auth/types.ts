import { Keyring, LocalUserContext } from '@localfirst/auth'

export type SigChainSaveData = {
  serializedTeam: string
  context: LocalUserContext
  teamKeyRing: Keyring
}

export type SerializedSigChain = {
  serializedTeam: Uint8Array
  context: LocalUserContext
  teamKeyRing: Keyring
}
