import { Test, TestingModule } from '@nestjs/testing'
import { TestModule } from '../../common/test.module'
import { getLocalLibp2pInstanceParams } from '../../common/utils'
import { Libp2pModule } from '../libp2p.module'
import { SigChainModule } from '../../auth/sigchain.service.module'
import { Libp2pService } from '../libp2p.service'
import { SigChainService } from '../../auth/sigchain.service'
import { Libp2pEvents, Libp2pNodeParams } from '../libp2p.types'
import { createLogger } from '../../common/logger'

const attachEventListeners = (libp2pService: Libp2pService, timeline: string[], instanceName: string) => {
  // loop over all enum Libp2pEvents and attach event listeners
  for (const event of Object.values(Libp2pEvents)) {
    libp2pService.on(event, () => {
      timeline.push(`${event}`)
    })
  }
}

const spawnTestModules = async (number: number) => {
  const modules = []
  for (let i = 0; i < number; i++) {
    const module = await Test.createTestingModule({
      imports: [TestModule, Libp2pModule, SigChainModule],
    }).compile()
    modules.push(module)
  }
  return modules
}

const spawnLibp2pInstances = async (
  modules: TestingModule[],
  customLibp2pInstanceParams?: Libp2pNodeParams,
  sharePsk: boolean = true
) => {
  const singlePSK = Libp2pService.generateLibp2pPSK().fullKey
  let i = 0
  const libp2pServices = []
  for (const module of modules) {
    const libp2pService = await module.resolve(Libp2pService)
    const params = {
      ...(await getLocalLibp2pInstanceParams()),
      ...customLibp2pInstanceParams,
      instanceName: `instance${i}`,
    }
    if (sharePsk) {
      params.psk = singlePSK
    }
    await libp2pService.createInstance(params)
    libp2pServices.push(libp2pService)
    i++
  }
  return libp2pServices
}
const timelinesInclude = (timelines: string[][], event: string): boolean => {
  if (timelines.every(timeline => timeline.includes(event))) {
    return true
  }
  return false
}

const logger = createLogger('libp2p:libp2p.auth.spec')
describe('Libp2pAuth with 3 peers', () => {
  const teamName: string = 'team'
  const eventTimeline: string[] = []
  const eventTimelines: Array<string[]> = []
  const modules: TestingModule[] = []

  beforeAll(async () => {
    modules.push(...(await spawnTestModules(3)))
    const sigchainServiceA = await modules[0].resolve(SigChainService)

    // Create chain for instance A
    await sigchainServiceA.createChain(teamName, 'user0', true)
    const inviteResult = sigchainServiceA.getActiveChain().invites.createLongLivedUserInvite()

    for (let i = 1; i < modules.length; i++) {
      // Create invitation from A -> B
      const sigchainService = await modules[i].resolve(SigChainService)
      await sigchainService.createChainFromInvite(`user${i}`, teamName, inviteResult.seed, true)
    }
    await spawnLibp2pInstances(modules)
  })

  beforeEach(async () => {
    // Attach event listeners to all instances
    let i = 0
    for (const module of modules) {
      eventTimelines[i] = []
      attachEventListeners(await module.get(Libp2pService), eventTimeline, `${i}`)
      attachEventListeners(await module.get(Libp2pService), eventTimelines[i], `${i}`)
      i++
    }
  })

  afterEach(async () => {
    // Clear event timelines
    eventTimeline.length = 0
    eventTimelines.length = 0
  })

  afterAll(async () => {
    // stop all instances and close modules
    for (const module of modules) {
      const libp2pService = await module.resolve(Libp2pService)
      if (libp2pService.libp2pInstance?.status !== 'stopped') {
        await libp2pService.libp2pInstance?.stop()
      }
      await module.close()
    }
  })

  it(
    'intializes chains when peers connect',
    async () => {
      // Wait for chain init event on B
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('PEER_DISCONNECTED events did not occur within expected time.'))
        }, 70_000)
        const allConnected = async () => {
          if (timelinesInclude(eventTimelines.slice(1), Libp2pEvents.AUTH_JOINED)) {
            clearTimeout(timeout)
            resolve()
          }
        }
        for (const libp2pService of modules.map(module => module.get(Libp2pService))) {
          libp2pService.once(Libp2pEvents.AUTH_JOINED, () => {
            allConnected()
          })
        }
        const libp2pService = modules[0].get(Libp2pService)
        for (let i = 1; i < modules.length; i++) {
          modules[i].get(Libp2pService).dialPeer(libp2pService.localAddress)
        }
      })
      for (let i = 0; i < eventTimelines.length; i++) {
        expect(eventTimelines[i]).toMatchSnapshot(`eventTimeline${i} after disconnection`)
      }
    },
    1000 * 60 * 5
  )
  it('gracefully disconnects', async () => {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('PEER_DISCONNECTED events did not occur within expected time.'))
      }, 70_000)
      const allDisconnected = async () => {
        if (timelinesInclude(eventTimelines, Libp2pEvents.PEER_DISCONNECTED)) {
          clearTimeout(timeout)
          resolve()
        }
      }
      for (const libp2pService of modules.map(module => module.get(Libp2pService))) {
        libp2pService.once(Libp2pEvents.AUTH_DISCONNECTED, () => {
          allDisconnected()
        })
      }
      modules[0].get(Libp2pService).hangUpPeers()
    })
    for (let i = 0; i < eventTimelines.length; i++) {
      expect(eventTimelines[i]).toMatchSnapshot(`eventTimeline${i} after disconnection`)
    }
  })
})
