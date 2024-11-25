import { LocalUserContext } from '@localfirst/auth'
import { SigChain } from './sigchain'

export type LoadedSigChain = {
  sigChain: SigChain
  context: LocalUserContext
}
