import { WebElement } from 'selenium-webdriver'
import {
  App,
  Channel,
  CreateCommunityModal,
  DebugModeModal,
  JoinCommunityModal,
  JoiningLoadingPanel,
  RegisterUsernameModal,
  Sidebar,
} from '../selectors'
import { MessageIds } from '../types'
import { BACKWARD_COMPATIBILITY_BASE_VERSION, BuildSetup, copyInstallerFile, downloadInstaller } from '../utils'
import { createLogger } from '../logger'

const logger = createLogger('backwardsCompatibility')

// this test is only for linux so we need to skip it for other platforms
const itif = (condition: boolean) => (condition ? it : it.skip)

jest.setTimeout(1200000)
describe('Backwards Compatibility', () => {
  let ownerAppOldVersion: App
  let ownerAppNewVersion: App
  let generalChannel: Channel
  let secondChannel: Channel
  let messagesToCompare: WebElement[]
  let sidebar: Sidebar
  let generalChannelMessageIds: MessageIds
  let secondChannelMessageIds: MessageIds

  const dataDir = `e2e_${(Math.random() * 10 ** 18).toString(36)}`
  const communityName = 'testcommunity'
  const ownerUsername = 'bob'
  const ownerMessages = ['Hi', 'Hello', 'After guest leave app']
  const loopMessages = 'ąbc'.split('')
  const newChannelName = 'mid-night-club'

  const isAlpha = BuildSetup.getEnvFileName()?.toString().includes('alpha')

  beforeAll(async () => {
    // download the old version of the app
    const appFilename = downloadInstaller()
    const copiedFilename = copyInstallerFile(appFilename)
    ownerAppOldVersion = new App({ dataDir, fileName: copiedFilename })
  })

  beforeEach(async () => {
    logger.info(`░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ${expect.getState().currentTestName}`)
  })

  afterAll(async () => {
    await ownerAppNewVersion?.close()
    await ownerAppNewVersion?.cleanup()
    await ownerAppOldVersion?.close()
    await ownerAppOldVersion?.cleanup()
  })

  describe('User opens app for the first time', () => {
    itif(process.platform == 'linux')('Owner opens the app', async () => {
      await ownerAppOldVersion.open()
    })

    itif(process.platform == 'linux')('Owner closes "update available" modal if present', async () => {
      ownerAppOldVersion
        .closeUpdateModalIfPresent()
        .then(async () => {
          console.log('Closed update modal')
        })
        .catch(err => {
          console.log('Could not close update modal', err)
        })
    })

    itif(process.platform == 'linux')(
      'Owner sees "join community" modal and switches to "create community" modal',
      async () => {
        const joinModal = new JoinCommunityModal(ownerAppOldVersion.driver)
        expect(await joinModal.isReady()).toBeTruthy()
        await joinModal.switchToCreateCommunity()
      }
    )

    itif(process.platform == 'linux')('Owner submits valid community name', async () => {
      const createModal = new CreateCommunityModal(ownerAppOldVersion.driver)
      expect(await createModal.isReady()).toBeTruthy()
      await createModal.typeCommunityName(communityName)
      await createModal.submit()
    })

    itif(process.platform == 'linux')('Owner sees "register username" modal and submits valid username', async () => {
      const registerModal = new RegisterUsernameModal(ownerAppOldVersion.driver)
      expect(await registerModal.isReady()).toBeTruthy()
      await registerModal.typeUsername(ownerUsername)
      await registerModal.submit()
    })

    itif(process.platform == 'linux')('Owner waits for join to complete', async () => {
      const joinPanel = new JoiningLoadingPanel(ownerAppOldVersion.driver)
      await joinPanel.waitForJoinToComplete()
    })

    itif(process.platform == 'linux')('Owner registers successfully and sees general channel', async () => {
      generalChannel = new Channel(ownerAppOldVersion.driver, 'general')
      expect(await generalChannel.isReady()).toBeTruthy()

      const generalChannelText = await generalChannel.element.getText()
      expect(generalChannelText).toEqual('# general')
    })

    itif(process.platform == 'linux')(`Verify version - ${BACKWARD_COMPATIBILITY_BASE_VERSION}`, async () => {
      const settingsModal = await new Sidebar(ownerAppOldVersion.driver).openSettings()
      expect(await settingsModal.isReady()).toBeTruthy()
      const settingVersion = await settingsModal.getVersion()
      expect(settingVersion).toEqual(BACKWARD_COMPATIBILITY_BASE_VERSION)
      await settingsModal.close()
    })

    itif(process.platform == 'linux')('Owner sends a message in the general channel', async () => {
      expect(await generalChannel.isMessageInputReady()).toBeTruthy()
      generalChannelMessageIds = await generalChannel.sendMessage(ownerMessages[0], ownerUsername)
    })

    itif(process.platform == 'linux')('Sent message is visible on general channel', async () => {
      const messages = await generalChannel.getUserMessages(ownerUsername)
      const text = await messages[1].getText()
      expect(text).toEqual(ownerMessages[0])
    })

    itif(process.platform == 'linux')('Owner creates second channel', async () => {
      sidebar = new Sidebar(ownerAppOldVersion.driver)
      await sidebar.addNewChannel(newChannelName)
      await sidebar.switchChannel(newChannelName)
      const channels = await sidebar.getChannelList()
      expect(channels.length).toEqual(2)
    })

    itif(process.platform == 'linux')('Owner sends a message in second channel', async () => {
      secondChannel = new Channel(ownerAppOldVersion.driver, newChannelName)
      expect(await secondChannel.isMessageInputReady()).toBeTruthy()
      secondChannelMessageIds = await secondChannel.sendMessage(ownerMessages[1], ownerUsername)
    })

    itif(process.platform == 'linux')('Message is visible in second channel', async () => {
      const messages = await secondChannel.getUserMessages(ownerUsername)
      const text = await messages[1].getText()
      expect(text).toEqual(ownerMessages[1])
    })

    itif(process.platform == 'linux')(
      `User sends another ${loopMessages.length} messages to second channel`,
      async () => {
        for (const message of loopMessages) {
          await secondChannel.sendMessage(message, ownerUsername)
        }

        messagesToCompare = await secondChannel.getUserMessages(ownerUsername)
      }
    )
    itif(process.platform == 'linux')('User closes the old app', async () => {
      await ownerAppOldVersion.close()
    })

    // ________________________________

    itif(process.platform == 'linux')('Owner opens the app in new version', async () => {
      logger.info('New version', 1)
      ownerAppNewVersion = new App({ dataDir })
      await ownerAppNewVersion.open()
    })

    if (isAlpha) {
      itif(process.platform == 'linux')('Owner closes debug modal if opened', async () => {
        logger.info('New version', 2)
        const debugModal = new DebugModeModal(ownerAppNewVersion.driver)
        await debugModal.close()
      })
    }

    itif(process.platform == 'linux')('Owener sees general channel', async () => {
      logger.info('New version', 3)
      generalChannel = new Channel(ownerAppNewVersion.driver, 'general')
      expect(await generalChannel.isReady()).toBeTruthy()

      const generalChannelText = await generalChannel.element.getText()
      expect(generalChannelText).toEqual('# general')
    })

    itif(process.platform == 'linux')('Confirm that the opened app is the latest version', async () => {
      logger.info('New version', 4)
      const settingsModal = await new Sidebar(ownerAppNewVersion.driver).openSettings()
      expect(await settingsModal.isReady()).toBeTruthy()
      const settingVersion = await settingsModal.getVersion()
      const envVersion = ownerAppNewVersion.buildSetup.getVersionFromEnv()
      expect(settingVersion).toEqual(envVersion)
      await settingsModal.close()
    })

    itif(process.platform == 'linux')('Check number of messages on second channel', async () => {
      logger.info('New version', 5)
      sidebar = new Sidebar(ownerAppNewVersion.driver)
      await sidebar.switchChannel(newChannelName)
      secondChannel = new Channel(ownerAppNewVersion.driver, newChannelName)
      expect(await secondChannel.isReady()).toBeTruthy()

      const currentMessages = await secondChannel.getUserMessages(ownerUsername)
      expect(currentMessages.length).toEqual(messagesToCompare.length)
    })
  })
})
