import { jest } from '@jest/globals'
import { TestingModule } from '@nestjs/testing'
import { Libp2pService } from '../libp2p.service'
import { SigChainService } from '../../auth/sigchain.service'
import { Libp2pEvents } from '../libp2p.types'
import { createLogger } from '../../common/logger'
import { spawnLibp2pInstances, spawnTestModules, attachEventListeners, timelinesInclude } from './test-utils'
import { headsAreEqual, Hash } from '@localfirst/crdx'

const logger = createLogger('libp2p:multiple-peers.spec')

const N_PEERS = 3
jest.setTimeout(120_000)
describe(`Libp2pAuth with ${N_PEERS} peers`, () => {
  const teamName: string = 'team'
  const eventTimeline: string[] = []
  const eventTimelines: Array<string[]> = []
  const modules: TestingModule[] = []

  beforeAll(async () => {
    modules.push(...(await spawnTestModules(N_PEERS)))
    const sigchainServiceA = await modules[0].resolve(SigChainService)

    // Create sigChain that all other peers will join
    await sigchainServiceA.createChain(teamName, 'user0', true)
    const inviteResult = sigchainServiceA.getActiveChain().invites.createLongLivedUserInvite()

    // Initialize other chains with invite seed
    for (let i = 1; i < modules.length; i++) {
      // Create invitation from A -> B
      const sigchainService = await modules[i].resolve(SigChainService)
      await sigchainService.createChainFromInvite(`user${i}`, teamName, inviteResult.seed, true)
    }

    // Create libp2p instances
    await spawnLibp2pInstances(modules)

    // Attach event listeners to all libp2p service instances
    for (let i = 0; i < modules.length; i++) {
      eventTimelines[i] = []
      attachEventListeners(await modules[i].get(Libp2pService), eventTimeline, `${i}`)
      attachEventListeners(await modules[i].get(Libp2pService), eventTimelines[i], `${i}`)
    }
  })

  afterEach(async () => {
    // Clear event timelines
    eventTimeline.length = 0
    for (let i = 0; i < eventTimelines.length; i++) {
      eventTimelines[i].length = 0
    }
  })

  afterAll(async () => {
    // Stop all instances and close modules
    for (const module of modules) {
      const libp2pService = await module.resolve(Libp2pService)
      if (libp2pService.libp2pInstance?.status !== 'stopped') {
        await libp2pService.libp2pInstance?.stop()
      }
      await module.close()
    }
  })

  it('joins with an invitation', async () => {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('PEER_DISCONNECTED events did not occur within expected time.'))
      }, 70_000)

      const resolveIfMet = async () => {
        if (timelinesInclude(eventTimelines.slice(1), Libp2pEvents.AUTH_JOINED)) {
          for (let i = 0; i < eventTimelines.length; i++) {
            expect(eventTimelines[i]).toMatchSnapshot(`eventTimeline${i} after disconnection`)
          }
          clearTimeout(timeout)
          resolve()
        }
      }

      for (const libp2pService of modules.slice(1).map(module => module.get(Libp2pService))) {
        libp2pService.once(Libp2pEvents.AUTH_JOINED, () => {
          resolveIfMet()
        })
      }
      const libp2pService = modules[0].get(Libp2pService)
      for (let i = 1; i < modules.length; i++) {
        modules[i].get(Libp2pService).dialPeer(libp2pService.localAddress)
      }
    })
  }, 120_000)
  it('emits connected after syncing', async () => {
    logger.info('emits connected after syncing')
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('PEER_DISCONNECTED events did not occur within expected time.'))
      }, 70_000)
      const resolveIfMet = async () => {
        if (timelinesInclude(eventTimelines.slice(1), Libp2pEvents.AUTH_JOINED)) {
          for (let i = 0; i < eventTimelines.length; i++) {
            expect(eventTimelines[i]).toMatchSnapshot(`eventTimeline${i} after disconnection`)
          }
          clearTimeout(timeout)
          resolve()
        }
      }
      for (const libp2pService of modules.slice(1).map(module => module.get(Libp2pService))) {
        libp2pService.once(Libp2pEvents.AUTH_CONNECTED, () => {
          resolveIfMet()
        })
      }
    })
  }, 120_000)
  it('merges graphs between all peers', async () => {
    logger.info('merges graphs between all peers')
    await new Promise<void>(resolve => {
      const resolveIfMet = async () => {
        // all peers should have the same graph head
        const heads: Hash[][] = []
        for (const module of modules) {
          const sigchainService = await module.resolve(SigChainService)
          const head = sigchainService.getActiveChain().team?.graph.head
          if (head !== undefined) {
            heads.push(head)
          }
        }
        if (heads.every(head => headsAreEqual(heads[0], head))) {
          resolve()
        }
      }
      for (const libp2pService of modules.map(module => module.get(Libp2pService))) {
        libp2pService.on(Libp2pEvents.AUTH_UPDATED, () => {
          resolveIfMet()
        })
      }
    })
  }, 120_000)
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
  }, 120_000)
})
