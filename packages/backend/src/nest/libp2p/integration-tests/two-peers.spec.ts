import { Test, TestingModule } from '@nestjs/testing'
import { TestModule } from '../../common/test.module'
import { getLocalLibp2pInstanceParams } from '../../common/utils'
import { Libp2pModule } from '../libp2p.module'
import { SigChainModule } from '../../auth/sigchain.service.module'
import { Libp2pService } from '../libp2p.service'
import { SigChainService } from '../../auth/sigchain.service'
import { Libp2pEvents, Libp2pNodeParams } from '../libp2p.types'
import { createLogger } from '../../common/logger'

const logger = createLogger('libp2p:libp2p.auth.spec')

const attachEventListeners = (libp2pService: Libp2pService, timeline: string[], instanceName: string) => {
  // loop over all enum Libp2pEvents and attach event listeners
  for (const event of Object.values(Libp2pEvents)) {
    libp2pService.on(event, () => {
      timeline.push(`${instanceName} ${event}`)
    })
  }
}

const spawnTestModules = async (number: number) => {
  const singlePSK = Libp2pService.generateLibp2pPSK().fullKey

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
describe('Libp2pAuth', () => {
  const teamName: string = 'team'
  const userA: string = 'instance0'
  const userB: string = 'instance1'
  const eventTimeline: string[] = []
  const eventTimelineA: string[] = []
  const eventTimelineB: string[] = []
  const modules: TestingModule[] = []
  let sigchainServiceA: SigChainService
  let sigchainServiceB: SigChainService
  let libp2pServiceA: Libp2pService
  let libp2pServiceB: Libp2pService

  beforeAll(async () => {
    modules.push(...(await spawnTestModules(2)))
    sigchainServiceA = await modules[0].resolve(SigChainService)
    sigchainServiceB = await modules[1].resolve(SigChainService)
    libp2pServiceA = await modules[0].resolve(Libp2pService)
    libp2pServiceB = await modules[1].resolve(Libp2pService)

    attachEventListeners(libp2pServiceA, eventTimeline, 'A')
    attachEventListeners(libp2pServiceB, eventTimeline, 'B')
    attachEventListeners(libp2pServiceA, eventTimelineA, 'A')
    attachEventListeners(libp2pServiceB, eventTimelineB, 'B')

    // Create chain for instance A
    await sigchainServiceA.createChain(teamName, userA, true)
    expect(sigchainServiceA.activeChainTeamName).toBe(teamName)

    // Create invitation from A -> B
    const inviteResult = await sigchainServiceA.getActiveChain().invites.createLongLivedUserInvite()
    await sigchainServiceB.createChainFromInvite(userB, teamName, inviteResult.seed, true)
  })

  afterAll(async () => {
    for (const module of modules) {
      const libp2pService = await module.resolve(Libp2pService)
      if (libp2pService.libp2pInstance?.status !== 'stopped') {
        await libp2pService.libp2pInstance?.stop()
      }
      await module.close()
    }
  })

  it('create two instances of libp2p', async () => {
    logger.info('Creating libp2p instances')
    await spawnLibp2pInstances(modules)
  })

  it(
    'intializes chains when peers connect',
    async () => {
      // Wait for chain init event on B
      const waitForChainInitializedB = new Promise<void>(resolve => {
        libp2pServiceB.once(Libp2pEvents.AUTH_JOINED, () => {
          logger.info('libp2pServiceB initialized chain')
          resolve()
        })
      })
      await libp2pServiceB.dialPeer(libp2pServiceA.localAddress)
      await waitForChainInitializedB

      expect(eventTimeline).toMatchSnapshot('event timeline after dialing')
      expect(eventTimelineA).toMatchSnapshot('instanceA event timeline after join')
      expect(eventTimelineB).toMatchSnapshot('instanceB event timeline after join')
    },
    1000 * 60 * 5
  )
  it('gracefully disconnects', async () => {
    const disconnectEventsA: string[] = []
    const disconnectEventsB: string[] = []
    attachEventListeners(libp2pServiceA, disconnectEventsA, 'A')
    attachEventListeners(libp2pServiceB, disconnectEventsB, 'B')

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('PEER_DISCONNECTED events did not occur within expected time.'))
      }, 70_000)
      const bothDisconnected = async () => {
        if (
          disconnectEventsA.includes(Libp2pEvents.PEER_DISCONNECTED) &&
          disconnectEventsB.includes(Libp2pEvents.PEER_DISCONNECTED)
        ) {
          clearTimeout(timeout)
          resolve()
        }
      }
      libp2pServiceA.once(Libp2pEvents.PEER_DISCONNECTED, () => {
        logger.info('test listener heard libp2pServiceA disconnected')
        bothDisconnected()
      })
      libp2pServiceB.once(Libp2pEvents.PEER_DISCONNECTED, () => {
        logger.info('test listener heard libp2pServiceB disconnected')
        bothDisconnected()
      })
      libp2pServiceB.hangUpPeers()
    })

    expect(disconnectEventsA).toMatchSnapshot('disconnectEventsA')
    expect(disconnectEventsB).toMatchSnapshot('disconnectEventsB')
    expect(eventTimeline).toMatchSnapshot('eventTimeline after disconnection')
  })
  // it(
  //   'removes user from chain and disconnects',
  //   async () => {
  //     const removeEventsA: string[] = []
  //     const removeEventsB: string[] = []
  //     attachEventListeners(libp2pServiceA, removeEventsA, 'A')
  //     attachEventListeners(libp2pServiceB, removeEventsB, 'B')

  //     await new Promise<void>((resolve, reject) => {
  //       const timeout = setTimeout(() => {
  //         reject(new Error('PEER_DISCONNECTED or chain removal events did not occur within expected time.'))
  //       }, 70_000)

  //       libp2pServiceB.once(Libp2pEvents.PEER_DISCONNECTED, () => {
  //         logger.info('test listener heard libp2pServiceB disconnected')
  //         clearTimeout(timeout)
  //         resolve()
  //       })
  //       sigchainServiceA.getActiveChain().team?.remove(sigchainServiceB.getActiveChain().localUserContext.user.userId)
  //     })

  //     expect(removeEventsA).toMatchSnapshot('removeEventsA')
  //     expect(removeEventsB).toMatchSnapshot('removeEventsB')
  //     expect(eventTimeline).toMatchSnapshot('eventTimeline after removal')
  //   },
  //   1000 * 60 * 5
  // )
})
