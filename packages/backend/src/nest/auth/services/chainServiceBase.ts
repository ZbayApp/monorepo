import { SigChain } from '../sigchain'
import { createLogger } from '../../common/logger'

const logger = createLogger('auth:baseChainService')

class ChainServiceBase {
  protected constructor(protected sigChain: SigChain) {}

  public static init(sigChain: SigChain, ...params: any[]): ChainServiceBase {
    throw new Error('init not implemented')
  }
}

export { ChainServiceBase }
