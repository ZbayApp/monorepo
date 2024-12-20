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
import getPort from 'get-port'
import { fork } from 'child_process'
import path from 'path'
import { createLogger } from '../logger'
import { SettingsModalTabName, UploadedFileType } from '../enums'
import { TEST_FILE_NAME, TEST_IMAGE_FILE_NAME, UPLOAD_FILE_DIR } from '../uploadFile.const'

const logger = createLogger('oneClient')

jest.setTimeout(450000)
describe('One Client', () => {
  let app: App
  let dataDirPath: string
  let resourcesPath: string
  let generalChannel: Channel

  const generalChannelName = 'general'
  const ownerUserName = 'testuser'

  const firstCommunityName = 'testcommunity'
  const secondCommunityName = 'testcommunity-redux'

  beforeAll(async () => {
    app = new App()
    await app.open()
  })

  afterAll(async () => {
    await app.close()
    await app.cleanup()
  })

  beforeEach(async () => {
    logger.info(`░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ${expect.getState().currentTestName}`)
  })

  describe('User opens app for the first time', () => {
    it('Get opened app process data', () => {
      const processData = app.buildSetup.getProcessData()
      dataDirPath = processData.dataDirPath
      resourcesPath = processData.resourcesPath
    })

    it('User sees "join community" page and switches to "create community" view by clicking on the link', async () => {
      const debugModal = new DebugModeModal(app.driver)
      await debugModal.close()

      const joinModal = new JoinCommunityModal(app.driver)
      expect(await joinModal.isReady()).toBeTruthy()

      await joinModal.switchToCreateCommunity()
    })

    it('User is on "Create community" page, enters valid community name and presses the button', async () => {
      const createModal = new CreateCommunityModal(app.driver)
      expect(await createModal.isReady()).toBeTruthy()

      await createModal.typeCommunityName(firstCommunityName)
      await createModal.submit()
    })

    it('User sees "register username" page, enters the valid name and submits by clicking on the button', async () => {
      const registerModal = new RegisterUsernameModal(app.driver)
      expect(await registerModal.isReady()).toBeTruthy()

      logger.info('Registration - before typeUsername')
      await registerModal.typeUsername(ownerUserName)
      logger.info('Registration - before submit')
      await registerModal.submit()
      logger.info('Registration - after submit')
    })

    it('User waits for the modal JoiningLoadingPanel to disappear', async () => {
      const loadingPanelCommunity = new JoiningLoadingPanel(app.driver)
      await loadingPanelCommunity.waitForJoinToComplete()
    })

    it('User sees general channel', async () => {
      generalChannel = new Channel(app.driver, generalChannelName)
      expect(await generalChannel.isReady()).toBeTruthy()

      const generalChannelText = await generalChannel.element.getText()
      expect(generalChannelText).toEqual(`# ${generalChannelName}`)
    })

    it('User sends a message', async () => {
      expect(await generalChannel.isMessageInputReady()).toBeTruthy()
      await generalChannel.sendMessage('this shows up as sent', ownerUserName)
    })
  })

  if (process.platform === 'linux') {
    // TODO: Fix test for win32 and macos
    describe('User can open the app despite hanging backend process', () => {
      it('User closes the app but leaves hanging backend', async () => {
        const forkArgvs = [
          '-d',
          `${await getPort()}`,
          '-a',
          `${dataDirPath}`,
          '-r',
          `${resourcesPath}`,
          '-p',
          'desktop',
        ]
        const backendBundlePath = path.normalize(require.resolve('backend-bundle'))
        logger.info('Spawning backend', backendBundlePath, 'with argvs:', forkArgvs)
        fork(backendBundlePath, forkArgvs)
        await app.close({ forceSaveState: true })
      })

      it('Opens app again', async () => {
        await app.open()
      })

      it('User sees "general channel" page', async () => {
        const generalChannel = new Channel(app.driver, 'general')
        expect(await generalChannel.isReady()).toBeTruthy()
      })
    })
  }

  describe('User leaves community and recreates it', () => {
    it('Leave community', async () => {
      const settingsModal = await new Sidebar(app.driver).openSettings()
      expect(await settingsModal.isReady()).toBeTruthy()

      await settingsModal.switchTab(SettingsModalTabName.LEAVE_COMMUNITY)
      await settingsModal.leaveCommunityButton()
    })

    it('User sees "join community" page and switches to "create community" view by clicking on the link', async () => {
      const debugModal = new DebugModeModal(app.driver)
      await debugModal.close()

      const joinModal = new JoinCommunityModal(app.driver)
      expect(await joinModal.isReady()).toBeTruthy()

      await joinModal.switchToCreateCommunity()
    })

    it('User is on "Create community" page, enters new valid community name and presses the button', async () => {
      const createModal = new CreateCommunityModal(app.driver)
      expect(await createModal.isReady()).toBeTruthy()
      await createModal.typeCommunityName(secondCommunityName)
      await createModal.submit()
    })

    it('User sees "register username" page, enters the valid name and submits by clicking on the button', async () => {
      const registerModal = new RegisterUsernameModal(app.driver)

      expect(await registerModal.isReady()).toBeTruthy()
      logger.info('Registration - before typeUsername')
      await registerModal.typeUsername(ownerUserName)
      logger.info('Registration - before submit')
      await registerModal.submit()
      logger.info('Registration - after submit')
    })

    it('User waits for the modal JoiningLoadingPanel to disappear', async () => {
      const loadingPanelCommunity = new JoiningLoadingPanel(app.driver)
      await loadingPanelCommunity.waitForJoinToComplete()
    })

    it('User sees general channel', async () => {
      generalChannel = new Channel(app.driver, generalChannelName)
      expect(await generalChannel.isReady())

      const generalChannelText = await generalChannel.element.getText()
      expect(generalChannelText).toEqual(`# ${generalChannelName}`)
    })

    it('User sends a message', async () => {
      expect(await generalChannel.isMessageInputReady()).toBeTruthy()
      await generalChannel.sendMessage('this shows up as sent again', ownerUserName)
    })
  })

  describe('Uploading files', () => {
    it('Owner uploads an image', async () => {
      const uploadFilePath = path.resolve(UPLOAD_FILE_DIR, TEST_IMAGE_FILE_NAME)
      await generalChannel.uploadFile(TEST_IMAGE_FILE_NAME, uploadFilePath, UploadedFileType.IMAGE, ownerUserName)
    })

    it('Owner uploads a non-image file', async () => {
      const uploadFilePath = path.resolve(UPLOAD_FILE_DIR, TEST_FILE_NAME)
      await generalChannel.uploadFile(TEST_FILE_NAME, uploadFilePath, UploadedFileType.FILE, ownerUserName)
    })
  })
})
