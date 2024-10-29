import { LocalUserContext } from '@localfirst/auth'
import { SigChain } from './chain'

export type LoadedSigChain = {
  sigChain: SigChain
  context: LocalUserContext
}
