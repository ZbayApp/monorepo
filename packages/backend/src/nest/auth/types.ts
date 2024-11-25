import { Keyring, LocalUserContext } from '@localfirst/auth'

export type SigChainBlob = {
  serializedTeam: Uint8Array
  context: LocalUserContext
  teamKeyRing: Keyring
}
