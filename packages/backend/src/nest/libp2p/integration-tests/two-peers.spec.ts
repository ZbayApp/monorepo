import { TestingModule } from '@nestjs/testing'
import { Libp2pService } from '../libp2p.service'
import { SigChainService } from '../../auth/sigchain.service'
import { Libp2pEvents } from '../libp2p.types'
import { createLogger } from '../../common/logger'
import { headsAreEqual } from '@localfirst/crdx'
import { spawnLibp2pInstances, spawnTestModules, attachEventListeners, timelinesInclude } from './test-utils'

const logger = createLogger('libp2p:libp2p.auth.spec')

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
  afterEach(() => {
    eventTimeline.length = 0
    eventTimelineA.length = 0
    eventTimelineB.length = 0
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
    logger.info('Created libp2p instances')
    expect(libp2pServiceA.libp2pInstance).toBeDefined()
    expect(libp2pServiceB.libp2pInstance).toBeDefined()
  })

  it('joins with an invitation', async () => {
    logger.info('Initializes chains when peers connect')
    // Wait for chain init event on B
    await new Promise<void>(resolve => {
      libp2pServiceB.once(Libp2pEvents.AUTH_JOINED, () => {
        logger.info('libp2pServiceB initialized chain')
        expect(eventTimeline).toMatchSnapshot('event timeline after joining')
        expect(eventTimelineA).toMatchSnapshot('instanceA event timeline after join')
        expect(eventTimelineB).toMatchSnapshot('instanceB event timeline after join')
        resolve()
      })
      libp2pServiceB.dialPeer(libp2pServiceA.localAddress)
    })

    expect(sigchainServiceA.getActiveChain().team).toBeDefined()
    expect(sigchainServiceB.getActiveChain().team).toBeDefined()
    expect(sigchainServiceA.getActiveChain() !== sigchainServiceB.getActiveChain()).toBeTruthy()
    // at this point B should have added themselves to the chain, but not yet synced that with A
    expect(
      headsAreEqual(
        sigchainServiceA.getActiveChain().team?.graph.head,
        sigchainServiceB.getActiveChain().team?.graph.head
      )
    ).toBeFalsy()
  })
  it('emits connected after syncing', async () => {
    logger.info('Emits connected after syncing')
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('PEER_DISCONNECTED events did not occur within expected time.'))
      }, 70_000)
      const resolveIfMet = async () => {
        if (timelinesInclude([eventTimelineA, eventTimelineB], Libp2pEvents.AUTH_CONNECTED)) {
          logger.info('timelines include expected events!')
          expect(eventTimelineA).toMatchSnapshot('instanceA event timeline after connected')
          expect(eventTimelineB).toMatchSnapshot('instanceB event timeline after connected')
          clearTimeout(timeout)
          resolve()
        }
      }
      libp2pServiceA.on(Libp2pEvents.AUTH_CONNECTED, async () => {
        logger.info('test listener heard libp2pServiceA connected')
        await resolveIfMet()
      })
      libp2pServiceB.on(Libp2pEvents.AUTH_CONNECTED, async () => {
        logger.info('test listener heard libp2pServiceB connected')
        await resolveIfMet()
      })
    })
    // at this point the sync should be complete and the heads should be equal
    expect(
      headsAreEqual(
        sigchainServiceA.getActiveChain().team?.graph.head,
        sigchainServiceB.getActiveChain().team?.graph.head
      )
    ).toBeTruthy()
  })
  it('gracefully disconnects', async () => {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('PEER_DISCONNECTED events did not occur within expected time.'))
      }, 70_000)
      const resolveIfMet = async () => {
        if (
          eventTimelineA.includes(Libp2pEvents.PEER_DISCONNECTED) &&
          eventTimelineB.includes(Libp2pEvents.PEER_DISCONNECTED)
        ) {
          expect(eventTimelineA).toMatchSnapshot('disconnectEventsA')
          expect(eventTimelineB).toMatchSnapshot('disconnectEventsB')
          expect(eventTimeline).toMatchSnapshot('eventTimeline after disconnection')
          clearTimeout(timeout)
          resolve()
        }
      }
      libp2pServiceA.once(Libp2pEvents.PEER_DISCONNECTED, () => {
        logger.info('test listener heard libp2pServiceA disconnected')
        resolveIfMet()
      })
      libp2pServiceB.once(Libp2pEvents.PEER_DISCONNECTED, () => {
        logger.info('test listener heard libp2pServiceB disconnected')
        resolveIfMet()
      })
      libp2pServiceB.hangUpPeers()
    })
  })
})
