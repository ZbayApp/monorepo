import { LocalUserContext } from '@localfirst/auth'
import { SigChain } from './chain.js'

export type LoadedSigChain = {
  sigChain: SigChain
  context: LocalUserContext
}
