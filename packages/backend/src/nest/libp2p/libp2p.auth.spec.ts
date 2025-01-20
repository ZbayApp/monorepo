import { Test, TestingModule } from '@nestjs/testing'
import { TestModule } from '../common/test.module'
import { getLocalLibp2pInstanceParams } from '../common/utils'
import { Libp2pModule } from './libp2p.module'
import { SigChainModule } from '../auth/sigchain.service.module'
import { Libp2pService } from './libp2p.service'
import { SigChainService } from '../auth/sigchain.service'
import { Libp2pEvents, Libp2pNodeParams } from './libp2p.types'
import { createLogger } from '../common/logger'
import { Libp2pAuth } from './libp2p.auth'

const logger = createLogger('libp2p:libp2p.auth.spec')

const attachEventListeners = (libp2pService: Libp2pService, timeline: string[], instanceName: string) => {
  // loop over all enum Libp2pEvents and attach event listeners
  for (const event of Object.values(Libp2pEvents)) {
    libp2pService.on(event, () => {
      timeline.push(`${instanceName}: ${event}`)
    })
  }
}

describe('Libp2pAuth', () => {
  const teamName: string = 'team'
  const userA: string = 'instanceA'
  const userB: string = 'instanceB'
  const eventTimeline: string[] = []
  const eventTimelineA: string[] = []
  const eventTimelineB: string[] = []
  let moduleA: TestingModule
  let moduleB: TestingModule
  let libp2pServiceA: Libp2pService
  let libp2pServiceB: Libp2pService
  let sigchainServiceA: SigChainService
  let sigchainServiceB: SigChainService
  let paramsA: Libp2pNodeParams
  let paramsB: Libp2pNodeParams

  beforeAll(async () => {
    moduleA = await Test.createTestingModule({
      imports: [TestModule, Libp2pModule, SigChainModule],
    }).compile()

    moduleB = await Test.createTestingModule({
      imports: [TestModule, Libp2pModule, SigChainModule],
    }).compile()
    sigchainServiceA = await moduleA.resolve(SigChainService)
    sigchainServiceB = await moduleB.resolve(SigChainService)
    libp2pServiceA = await moduleA.resolve(Libp2pService)
    libp2pServiceB = await moduleB.resolve(Libp2pService)

    attachEventListeners(libp2pServiceA, eventTimeline, 'A')
    attachEventListeners(libp2pServiceB, eventTimeline, 'B')
    attachEventListeners(libp2pServiceA, eventTimelineA, 'A')
    attachEventListeners(libp2pServiceB, eventTimelineB, 'B')

    const singlePSK = Libp2pService.generateLibp2pPSK().fullKey

    paramsA = {
      ...(await getLocalLibp2pInstanceParams()),
      psk: singlePSK,
      instanceName: userA,
    }

    paramsB = {
      ...(await getLocalLibp2pInstanceParams()),
      psk: singlePSK,
      instanceName: userB,
    }

    // Create chain for instance A
    await sigchainServiceA.createChain(teamName, userA, true)
    expect(sigchainServiceA.activeChainTeamName).toBe(teamName)

    // Create invitation from A -> B
    const inviteResult = await sigchainServiceA.getActiveChain().invites.createLongLivedUserInvite()
    await sigchainServiceB.createChainFromInvite(userB, teamName, inviteResult.seed, true)
    expect(sigchainServiceB.activeChainTeamName).toBe(teamName)
  })

  afterAll(async () => {
    await libp2pServiceA.libp2pInstance?.stop()
    await libp2pServiceB.libp2pInstance?.stop()
    await moduleA.close()
    await moduleB.close()
  })

  it('create two instances of libp2p', async () => {
    logger.info('Creating libp2p instances')

    logger.info('paramsA', paramsA)
    await libp2pServiceA.createInstance(paramsA)
    expect(libp2pServiceA.libp2pInstance).not.toBeNull()
    expect(libp2pServiceA?.libp2pInstance?.peerId.toString()).toBe(paramsA.peerId.peerId.toString())

    logger.info('paramsB', paramsB)
    expect(paramsA.psk).toEqual(paramsB.psk)
    await libp2pServiceB.createInstance(paramsB)
    expect(libp2pServiceB.libp2pInstance).not.toBeNull()
    expect(libp2pServiceB?.libp2pInstance?.peerId.toString()).toBe(paramsB.peerId.peerId.toString())
  })

  it(
    'dials each other',
    async () => {
      // Wait for chain init event on B
      const waitForChainInitializedB = new Promise<void>(resolve => {
        libp2pServiceB.once(Libp2pEvents.AUTH_JOINED, () => {
          logger.info('libp2pServiceB initialized chain')
          resolve()
        })
      })
      await libp2pServiceB.dialPeer(paramsA.localAddress)
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

      libp2pServiceA.once(Libp2pEvents.PEER_DISCONNECTED, () => {
        logger.info('test listener heard libp2pServiceA disconnected')
        clearTimeout(timeout)
        resolve()
      })
      libp2pServiceB.once(Libp2pEvents.PEER_DISCONNECTED, () => {
        logger.info('test listener heard libp2pServiceB disconnected')
        clearTimeout(timeout)
        resolve()
      })
      libp2pServiceB.libp2pInstance?.stop()
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
