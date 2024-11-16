import { Keyring, LocalUserContext } from '@localfirst/auth'
import { SigChain } from './sigchain'

export type SigChainBlob = {
  serializedTeam: Uint8Array
  context: LocalUserContext
  teamKeyRing: Keyring
}
