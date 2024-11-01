import { Crypto } from '@peculiar/webcrypto'
import {
  assertReceivedCertificates,
  assertReceivedChannelsAndSubscribe,
  assertReceivedMessages,
  assertReceivedMessagesAreValid,
} from './assertions'
import { createCommunity, joinCommunity, getCommunityOwnerData, sendMessage } from './appActions'
import { createApp, createAppWithoutTor, sleep, storePersistor } from '../utils'
import { AsyncReturnType } from '../types/AsyncReturnType.interface'

const crypto = new Crypto()

global.crypto = crypto

describe('send message - users go offline and online', () => {
  let owner: AsyncReturnType<typeof createApp>
  let userOne: AsyncReturnType<typeof createApp>
  let userTwo: AsyncReturnType<typeof createApp>
  let userOneOldState: Partial<ReturnType<typeof owner.store.getState>>
  let userTwoOldState: Partial<ReturnType<typeof owner.store.getState>>
  let userOneDataPath: string
  let userTwoDataPath: string
  let allMessages = []
  const ownerMessagesData = []
  const userOneMessagesData = []
  const userTwoMessagesData = []

  beforeAll(async () => {
    owner = await createApp()
    userOne = await createApp()
    userTwo = await createApp()
  })

  afterAll(async () => {
    await owner.manager.closeAllServices()
    await userOne.manager.closeAllServices()
    await userTwo.manager.closeAllServices()
  })

  test.skip('Owner creates community', async () => {
    await createCommunity({ userName: 'Owner', store: owner.store })
  })

  test.skip('Two users join community', async () => {
    const ownerData = getCommunityOwnerData(owner.store)

    await joinCommunity({
      ...ownerData,
      store: userOne.store,
      userName: 'username1',
      expectedPeersCount: 2,
    })

    await joinCommunity({
      ...ownerData,
      store: userTwo.store,
      userName: 'username2',
      expectedPeersCount: 3,
    })
  })

  test.skip('Owner and users received certificates', async () => {
    await assertReceivedCertificates('owner', 3, 120_000, owner.store)
    await assertReceivedCertificates('userOne', 3, 120_000, userOne.store)
    await assertReceivedCertificates('userTwo', 3, 120_000, userTwo.store)
  })

  test.skip('Users replicated channel and subscribed to it', async () => {
    await assertReceivedChannelsAndSubscribe('owner', 1, 120_000, owner.store)
    await assertReceivedChannelsAndSubscribe('userTwo', 1, 120_000, userOne.store)
    await assertReceivedChannelsAndSubscribe('userTwo', 1, 120_000, userTwo.store)
  })

  test.skip('Every user sends one message to general channel', async () => {
    const ownerMessage = await sendMessage({ message: 'owner says hi', store: owner.store })
    await sleep(40_000)
    const userOneMessage = await sendMessage({ message: 'userOne says hi', store: userOne.store })
    await sleep(40_000)
    const userTwoMessage = await sendMessage({ message: 'userTwo says hi', store: userTwo.store })

    ownerMessagesData.push(ownerMessage)
    userOneMessagesData.push(userOneMessage)
    userTwoMessagesData.push(userTwoMessage)

    // Wait 10 seconds before closing the app, so writing to databases can be finished
    await sleep(10_000)
  })

  test.skip('User one and two go offline', async () => {
    userOneOldState = storePersistor(userOne.store.getState())
    userTwoOldState = storePersistor(userTwo.store.getState())
    userOneDataPath = userOne.appPath
    userTwoDataPath = userTwo.appPath
    await userOne.manager.closeAllServices()
    await userTwo.manager.closeAllServices()
  })

  test.skip('Owner sends messages, while users are offline', async () => {
    const ownerMessage = await sendMessage({
      message: 'Hi folks, how u doin? Does Wacek still has covid?',
      store: owner.store,
    })
    ownerMessagesData.push(ownerMessage)
  })

  test.skip('users come back online', async () => {
    userOne = await createApp(userOneOldState, userOneDataPath)
    userTwo = await createApp(userTwoOldState, userTwoDataPath)
  })

  test.skip('Owner replicated all messages', async () => {
    allMessages = [...ownerMessagesData, ...userOneMessagesData, ...userTwoMessagesData]

    await assertReceivedMessages('owner', allMessages.length, 360_000, owner.store)
  })

  test.skip('userOne replicated all messages', async () => {
    await assertReceivedMessages('userOne', allMessages.length, 360_000, userOne.store)
  })

  test.skip('userTwo replicated all messages', async () => {
    await assertReceivedMessages('userTwo', allMessages.length, 360_000, userTwo.store)
  })

  test.skip('Replicated messages are valid', async () => {
    await assertReceivedMessagesAreValid('owner', allMessages, 20000, owner.store)
    await assertReceivedMessagesAreValid('userOne', allMessages, 20000, owner.store)
    await assertReceivedMessagesAreValid('userTwo', allMessages, 20000, owner.store)
  })
})

describe.only('send message - users are online', () => {
  let owner: AsyncReturnType<typeof createApp>
  let userOne: AsyncReturnType<typeof createApp>
  let userTwo: AsyncReturnType<typeof createApp>

  const timeout = 240_000

  beforeAll(async () => {
    owner = await createApp()
    userOne = await createApp()
    userTwo = await createApp()
  })

  afterAll(async () => {
    await owner.manager.closeAllServices()
    await userOne.manager.closeAllServices()
    await userTwo.manager.closeAllServices()
  })

  test.skip('Owner creates community', async () => {
    await createCommunity({ userName: 'Owner', store: owner.store })
  })

  test.skip('Two users join community', async () => {
    const ownerData = getCommunityOwnerData(owner.store)

    await joinCommunity({
      ...ownerData,
      store: userOne.store,
      userName: 'username1',
      expectedPeersCount: 2,
    })

    await joinCommunity({
      ...ownerData,
      store: userTwo.store,
      userName: 'username2',
      expectedPeersCount: 3,
    })
  })

  test.skip('Owner and users received certificates', async () => {
    await assertReceivedCertificates('owner', 3, timeout, owner.store)
    await assertReceivedCertificates('userOne', 3, timeout, userOne.store)
    await assertReceivedCertificates('userTwo', 3, timeout, userTwo.store)
  })

  test.skip('Users replicated channel and subscribed to it', async () => {
    await assertReceivedChannelsAndSubscribe('owner', 1, timeout, owner.store)
    await assertReceivedChannelsAndSubscribe('userTwo', 1, timeout, userOne.store)
    await assertReceivedChannelsAndSubscribe('userTwo', 1, timeout, userTwo.store)
  })

  let ownerMessageData
  let userOneMessageData
  let userTwoMessageData

  test.skip('each user sends one message to general channel', async () => {
    ownerMessageData = await sendMessage({ message: 'owner says hi', store: owner.store })
    userOneMessageData = await sendMessage({ message: 'userOne says hi', store: userOne.store })
    userTwoMessageData = await sendMessage({ message: 'userTwo says hi', store: userTwo.store })
  })

  test.skip('Owner replicated all messages', async () => {
    await assertReceivedMessages('owner', 4, timeout, owner.store)
  })

  test.skip('userOne replicated all messages', async () => {
    await assertReceivedMessages('userOne', 4, timeout, userOne.store)
  })

  test.skip('userTwo replicated all messages', async () => {
    await assertReceivedMessages('userTwo', 4, timeout, userTwo.store)
  })

  test.skip('Replicated messages are valid', async () => {
    await assertReceivedMessagesAreValid(
      'owner',
      [ownerMessageData, userOneMessageData, userTwoMessageData],
      2000,
      owner.store
    )
    await assertReceivedMessagesAreValid(
      'userOne',
      [ownerMessageData, userOneMessageData, userTwoMessageData],
      2000,
      userOne.store
    )
    await assertReceivedMessagesAreValid(
      'userTwo',
      [ownerMessageData, userOneMessageData, userTwoMessageData],
      2000,
      userTwo.store
    )
  })
})

xdescribe('send message - without tor', () => {
  let owner: AsyncReturnType<typeof createAppWithoutTor>
  let userOne: AsyncReturnType<typeof createAppWithoutTor>
  let userTwo: AsyncReturnType<typeof createAppWithoutTor>

  beforeAll(async () => {
    owner = await createAppWithoutTor()
    userOne = await createAppWithoutTor()
    userTwo = await createAppWithoutTor()
  })

  afterAll(async () => {
    await owner.manager.closeAllServices()
    await userOne.manager.closeAllServices()
    await userTwo.manager.closeAllServices()
  })

  test.skip('Owner creates community', async () => {
    await createCommunity({ userName: 'Owner', store: owner.store })
  })

  test.skip('Two users join community', async () => {
    const ownerData = getCommunityOwnerData(owner.store)

    await joinCommunity({
      ...ownerData,
      store: userOne.store,
      userName: 'username1',
      expectedPeersCount: 2,
    })

    await joinCommunity({
      ...ownerData,
      store: userTwo.store,
      userName: 'username2',
      expectedPeersCount: 3,
    })
  })

  test.skip('Owner and users received certificates', async () => {
    await assertReceivedCertificates('owner', 3, 120_000, owner.store)
    await assertReceivedCertificates('userOne', 3, 120_000, userOne.store)
    await assertReceivedCertificates('userTwo', 3, 120_000, userTwo.store)
  })

  test.skip('Users replicated channel and subscribed to it', async () => {
    await assertReceivedChannelsAndSubscribe('owner', 1, 120_000, owner.store)
    await assertReceivedChannelsAndSubscribe('userTwo', 1, 120_000, userOne.store)
    await assertReceivedChannelsAndSubscribe('userTwo', 1, 120_000, userTwo.store)
  })

  let ownerMessageData
  let userOneMessageData
  let userTwoMessageData

  test.skip('Every user sends one message to general channel', async () => {
    ownerMessageData = await sendMessage({ message: 'owner says hi', store: owner.store })
    userOneMessageData = await sendMessage({ message: 'userOne says hi', store: userOne.store })
    userTwoMessageData = await sendMessage({ message: 'userTwo says hi', store: userTwo.store })
  })

  test.skip('Every user replicated all messages', async () => {
    await assertReceivedMessages('owner', 3, 120_000, owner.store)
    await assertReceivedMessages('userOne', 3, 120_000, userOne.store)
    await assertReceivedMessages('userTwo', 3, 120_000, userTwo.store)
  })

  test.skip('Replicated messages are valid', async () => {
    await assertReceivedMessagesAreValid(
      'owner',
      [ownerMessageData, userOneMessageData, userTwoMessageData],
      20000,
      owner.store
    )
    await assertReceivedMessagesAreValid(
      'userOne',
      [ownerMessageData, userOneMessageData, userTwoMessageData],
      20000,
      owner.store
    )
    await assertReceivedMessagesAreValid(
      'userTwo',
      [ownerMessageData, userOneMessageData, userTwoMessageData],
      20000,
      owner.store
    )
  })
})
