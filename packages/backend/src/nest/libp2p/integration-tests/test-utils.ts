import { Test, TestingModule } from '@nestjs/testing'
import { TestModule } from '../../common/test.module'
import { getLocalLibp2pInstanceParams } from '../../common/utils'
import { Libp2pModule } from '../libp2p.module'
import { SigChainModule } from '../../auth/sigchain.service.module'
import { Libp2pEvents, Libp2pNodeParams } from '../libp2p.types'
import { createLogger } from '../../common/logger'
import { Libp2pService } from '../libp2p.service'

const logger = createLogger('libp2p:test-utils')

export const attachEventListeners = (libp2pService: Libp2pService, timeline: string[], instanceName: string) => {
  // loop over all enum Libp2pEvents and attach event listeners
  for (const event of Object.values(Libp2pEvents)) {
    if (event === Libp2pEvents.AUTH_STATE_CHANGED) {
      libp2pService.on(event, (state: any) => {
        timeline.push(`${event}:${state}`)
      })
    } else {
      libp2pService.on(event, () => {
        timeline.push(`${event}`)
      })
    }
  }
}

export const spawnTestModules = async (number: number) => {
  const modules = []
  for (let i = 0; i < number; i++) {
    const module = await Test.createTestingModule({
      imports: [TestModule, Libp2pModule, SigChainModule],
    }).compile()
    modules.push(module)
  }
  logger.info(`created ${modules.length} test modules`)
  return modules
}

export const spawnLibp2pInstances = async (
  modules: TestingModule[],
  customLibp2pInstanceParams?: Libp2pNodeParams,
  sharePsk: boolean = true
) => {
  logger.info(`creating ${modules.length} libp2p instances`)
  const singlePSK = Libp2pService.generateLibp2pPSK().fullKey
  const libp2pServices = []
  for (let i = 0; i < modules.length; i++) {
    logger.info(`creating libp2p instance ${i}`)
    const libp2pService = await modules[i].resolve(Libp2pService)
    const params = {
      ...(await getLocalLibp2pInstanceParams()),
      ...customLibp2pInstanceParams,
      instanceName: `instance${i}`,
    }
    if (sharePsk) {
      params.psk = singlePSK
    }
    logger.info(`creating libp2p instance with params:`, params)
    await libp2pService.createInstance(params)
    libp2pServices.push(libp2pService)
  }
  logger.info(`created ${libp2pServices.length} libp2p instances`)
  return libp2pServices
}

export const timelinesInclude = (timelines: string[][], event: string): boolean => {
  if (timelines.every(timeline => timeline.includes(event))) {
    return true
  }
  return false
}
