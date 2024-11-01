import { Crypto } from '@peculiar/webcrypto'
import { createCommunity, clearInitializedCommunitiesAndRegistrars } from './appActions'
import { createApp, sleep, storePersistor } from '../utils'
import { AsyncReturnType } from '../types/AsyncReturnType.interface'
import {
  assertInitializedExistingCommunitiesAndRegistrars,
  assertStoreStatesAreEqual,
  assertInitializedCommunity,
} from './assertions'

const crypto = new Crypto()

global.crypto = crypto

describe('restart app without doing anything', () => {
  let owner: AsyncReturnType<typeof createApp>
  let store: typeof owner.store
  let oldState: Partial<ReturnType<typeof owner.store.getState>>
  let dataPath: string

  beforeAll(async () => {
    owner = await createApp()
  })

  afterAll(async () => {
    await owner.manager.closeAllServices()
  })

  test.skip('Owner creates community', async () => {})

  test.skip('Owner successfully closes app', async () => {
    store = owner.store
    await owner.manager.closeAllServices()
  })

  test.skip('Owner relaunch application with previous state', async () => {
    oldState = storePersistor(store.getState())
    dataPath = owner.appPath
    owner = await createApp(oldState, dataPath)
    store = owner.store
  })

  test.skip('Assert that owner store is correct', async () => {
    const currentState = store.getState()
    await assertStoreStatesAreEqual(oldState, currentState)
  })
})

describe('create community and restart app', () => {
  let owner: AsyncReturnType<typeof createApp>
  let store: typeof owner.store
  let oldState: Partial<ReturnType<typeof owner.store.getState>>
  let dataPath: string

  beforeAll(async () => {
    owner = await createApp()
  })

  afterAll(async () => {
    await owner.manager.closeAllServices()
  })

  test.skip('Owner creates community', async () => {
    await createCommunity({ userName: 'Owner', store: owner.store })
    await assertInitializedCommunity(owner.store)
    store = owner.store
  })

  test.skip('Owner successfully closes app', async () => {
    await owner.manager.closeAllServices()
  })

  test.skip('Owner relaunch application with previous state', async () => {
    oldState = storePersistor(store.getState())
    dataPath = owner.appPath
    owner = await createApp(oldState, dataPath)
    store = owner.store
    const currentState = store.getState()
    await assertStoreStatesAreEqual(oldState, currentState)
  })

  test.skip('Assert community and registrar are initialized', async () => {
    await assertInitializedExistingCommunitiesAndRegistrars(store)
  })
})
