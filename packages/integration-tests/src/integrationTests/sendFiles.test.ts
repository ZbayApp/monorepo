import { Crypto } from '@peculiar/webcrypto'
import {
  assertDownloadedImage,
  assertReceivedCertificates,
  assertReceivedChannelsAndSubscribe,
  assertReceivedImages,
} from './assertions'
import { createCommunity, joinCommunity, getCommunityOwnerData, sendImage, SendImage } from './appActions'
import { createApp, storePersistor } from '../utils'
import { AsyncReturnType } from '../types/AsyncReturnType.interface'
import { FileContent } from '@quiet/state-manager'
import { createLogger } from '../logger'

const logger = createLogger('files')

const crypto = new Crypto()

global.crypto = crypto

describe('send message - users are online', () => {
  let owner: AsyncReturnType<typeof createApp>
  let userOne: AsyncReturnType<typeof createApp>

  const timeout = 240_000

  const image: FileContent = {
    path: `${__dirname}/assets/test-image.jpeg`,
    name: 'test-image',
    ext: '.jpeg',
  }

  beforeAll(async () => {
    owner = await createApp()
    userOne = await createApp()
  })

  afterAll(async () => {
    await owner.manager.closeAllServices()
    await userOne.manager.closeAllServices()
  })

  test.skip('Owner creates community', async () => {
    await createCommunity({ userName: 'Owner', store: owner.store })
  })

  test.skip('Users joins community', async () => {
    const ownerData = getCommunityOwnerData(owner.store)

    await joinCommunity({
      ...ownerData,
      store: userOne.store,
      userName: 'username1',
      expectedPeersCount: 2,
    })
  })

  test.skip('Owner and user received certificates', async () => {
    await assertReceivedCertificates('owner', 2, timeout, owner.store)
    await assertReceivedCertificates('userOne', 2, timeout, userOne.store)
  })

  test.skip('User replicated channel and subscribed to it', async () => {
    await assertReceivedChannelsAndSubscribe('owner', 1, timeout, owner.store)
    await assertReceivedChannelsAndSubscribe('userOne', 1, timeout, userOne.store)
  })

  test.skip('user sends image to general channel', async () => {
    logger.info(`Image ${JSON.stringify(image)}`)
    const payload: SendImage = {
      file: image,
      store: owner.store,
    }
    await sendImage(payload)
  })

  test.skip('userOne replicated image', async () => {
    await assertReceivedImages('userOne', 1, timeout, userOne.store)
  })

  test.skip('userOne downloaded image', async () => {
    await assertDownloadedImage('userOne', image.name + image.ext, timeout, userOne.store)
  })
})

describe('send files - image is being redistributed (users going offline)', () => {
  let owner: AsyncReturnType<typeof createApp>
  let userOne: AsyncReturnType<typeof createApp>
  let userTwo: AsyncReturnType<typeof createApp>

  let userTwoOldState: Partial<ReturnType<typeof owner.store.getState>>

  let userTwoDataPath: string

  const timeout = 240_000

  const image: FileContent = {
    path: `${__dirname}/assets/test-image.jpeg`,
    name: 'test-image',
    ext: '.jpeg',
  }

  beforeAll(async () => {
    owner = await createApp()
    userOne = await createApp()
    userTwo = await createApp()
  })

  afterAll(async () => {
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
    await assertReceivedChannelsAndSubscribe('userOne', 1, timeout, userOne.store)
    await assertReceivedChannelsAndSubscribe('userTwo', 1, timeout, userTwo.store)
  })

  test.skip('UserTwo goes offline', async () => {
    userTwoOldState = storePersistor(userTwo.store.getState())
    userTwoDataPath = userTwo.appPath
    await userTwo.manager.closeAllServices()
  })

  test.skip('Owner sends image, while UserTwo is offline', async () => {
    await sendImage({
      file: image,
      store: owner.store,
    })
  })

  test.skip('UserOne replicated and downloaded the image', async () => {
    await assertReceivedImages('userOne', 1, 360_000, userOne.store)
    await assertDownloadedImage('userOne', image.name + image.ext, 360_000, userOne.store)
  })

  test.skip('Owner goes offline', async () => {
    await owner.manager.closeAllServices()
  })

  test.skip('UserTwo comes back online', async () => {
    userTwo = await createApp(userTwoOldState, userTwoDataPath)
  })

  test.skip('UserTwo replicated and downloaded the image', async () => {
    await assertReceivedImages('userTwo', 1, 360_000, userTwo.store)
    await assertDownloadedImage('userTwo', image.name + image.ext, 360_000, userTwo.store)
  })
})
