import {
  App,
  Channel,
  CreateCommunityModal,
  JoinCommunityModal,
  JoiningLoadingPanel,
  RegisterUsernameModal,
} from '../selectors'
import getPort from 'get-port'
import { fork } from 'child_process'
import path from 'path'
import { createLogger } from '../logger'
import { sleep } from '../utils'

const logger = createLogger('oneClient')

jest.setTimeout(450000)
describe('One Client', () => {
  let app: App
  let dataDirPath: string
  let resourcesPath: string
  let generalChannel: Channel

  const generalChannelName = 'general'
  const ownerUserName = 'testuser'

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
    await sleep(200)
  })

  describe('User opens app for the first time', () => {
    it('Get opened app process data', () => {
      const processData = app.buildSetup.getProcessData()
      dataDirPath = processData.dataDirPath
      resourcesPath = processData.resourcesPath
    })

    it('User sees "join community" page and switches to "create community" view by clicking on the link', async () => {
      const joinModal = new JoinCommunityModal(app.driver)
      const isJoinModal = await joinModal.element.isDisplayed()
      expect(isJoinModal).toBeTruthy()

      if (!isJoinModal) {
        const generalChannel = new Channel(app.driver, generalChannelName)
        const isGeneralChannel = await generalChannel.element.isDisplayed()

        expect(isGeneralChannel).toBeTruthy()
      } else {
        await joinModal.switchToCreateCommunity()
      }
    })

    it('User is on "Create community" page, enters valid community name and presses the button', async () => {
      const createModal = new CreateCommunityModal(app.driver)
      const isCreateModal = await createModal.element.isDisplayed()
      expect(isCreateModal).toBeTruthy()
      await createModal.typeCommunityName('testcommunity')
      await createModal.submit()
    })

    it('User sees "register username" page, enters the valid name and submits by clicking on the button', async () => {
      const registerModal = new RegisterUsernameModal(app.driver)
      const isRegisterModal = await registerModal.element.isDisplayed()

      expect(isRegisterModal).toBeTruthy()
      logger.info('Registration - vefore typeUsername')
      await registerModal.typeUsername(ownerUserName)
      logger.info('Registration - before submit')
      await registerModal.submit()
      logger.info('Registration - after submit')
    })

    it.skip('User waits for the modal JoiningLoadingPanel to disappear', async () => {
      const loadingPanelCommunity = new JoiningLoadingPanel(app.driver)
      const isLoadingPanelCommunity = await loadingPanelCommunity.element.isDisplayed()
      expect(isLoadingPanelCommunity).toBeTruthy()
    })

    it('User sees general channel', async () => {
      generalChannel = new Channel(app.driver, generalChannelName)
      const isGeneralChannel = await generalChannel.element.isDisplayed()
      const generalChannelText = await generalChannel.element.getText()
      expect(isGeneralChannel).toBeTruthy()
      expect(generalChannelText).toEqual(`# ${generalChannelName}`)
    })

    it('User sends a message', async () => {
      const isMessageInput = await generalChannel.messageInput.isDisplayed()
      expect(isMessageInput).toBeTruthy()
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
        const isGeneralChannel = await generalChannel.element.isDisplayed()
        expect(isGeneralChannel).toBeTruthy()
      })
    })
  }
})
