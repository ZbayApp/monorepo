import { Keyring, LocalUserContext, Context } from '@localfirst/auth'

export type SigChainSaveData = {
  serializedTeam: string | undefined
  localUserContext: LocalUserContext
  context: Context
  teamKeyRing: Keyring | undefined
}

export type SerializedSigChain = {
  serializedTeam: Uint8Array | undefined
  localUserContext: LocalUserContext
  context: Context
  teamKeyRing: Keyring | undefined
}
