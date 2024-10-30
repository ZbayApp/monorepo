import { SigChain } from '../sigchain'
import { createLogger } from '../../common/logger'

const logger = createLogger('auth:baseChainService')

class BaseChainService {
  protected constructor(protected sigChain: SigChain) {}

  public static init(sigChain: SigChain, ...params: any[]): BaseChainService {
    throw new Error('init not implemented')
  }
}

export { BaseChainService }
