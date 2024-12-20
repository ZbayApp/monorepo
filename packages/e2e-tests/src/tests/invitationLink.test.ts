import {
  Channel,
  CreateCommunityModal,
  DebugModeModal,
  JoinCommunityModal,
  RegisterUsernameModal,
  App,
  Sidebar,
  WarningModal,
  JoiningLoadingPanel,
} from '../selectors'
import { composeInvitationDeepUrl, parseInvitationLink, userJoinedMessage } from '@quiet/common'
import { execSync } from 'child_process'
import { type SupportedPlatformDesktop } from '@quiet/types'
import { createLogger } from '../logger'
import { SettingsModalTabName } from '../enums'

const logger = createLogger('invitationLink')

jest.setTimeout(1900000)
it.todo('New user joins using invitation link while having app closed')
describe('New user joins using invitation link while having app opened', () => {
  // Note: this test requires no DATA_DIR env so ran on local machine may interfere with 'Quiet' data directory
  const communityName = 'testcommunity'
  const ownerUsername = 'bob'
  const joiningUserUsername = 'alice-joining'
  let invitationLink: string
  let ownerApp: App
  let guestApp: App

  beforeAll(async () => {
    ownerApp = new App()
    guestApp = new App({ defaultDataDir: true })
    if (process.platform === 'win32') {
      await guestApp.cleanup(true)
    }
  })

  beforeEach(async () => {
    logger.info(`░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ${expect.getState().currentTestName}`)
  })

  afterAll(async () => {
    await ownerApp?.close()
    await ownerApp?.cleanup()
    await guestApp?.close()
    await guestApp?.cleanup()
  })

  describe('Stages:', () => {
    it('Owner opens the app', async () => {
      logger.info('Invitation Link', 1)
      await ownerApp.open()
    })

    it('JoinCommunityModal - owner switches to create community', async () => {
      logger.info('Invitation Link', 4)
      const joinModal = new JoinCommunityModal(ownerApp.driver)
      expect(await joinModal.isReady()).toBeTruthy()
      await joinModal.switchToCreateCommunity()
    })

    it('CreateCommunityModal - owner creates his community', async () => {
      logger.info('Invitation Link', 5)
      const createModal = new CreateCommunityModal(ownerApp.driver)
      expect(await createModal.isReady()).toBeTruthy()
      await createModal.typeCommunityName(communityName)
      await createModal.submit()
    })

    it('RegisterUsernameModal - owner has registered', async () => {
      logger.info('Invitation Link', 6)
      const registerModal = new RegisterUsernameModal(ownerApp.driver)
      expect(await registerModal.isReady()).toBeTruthy()
      await registerModal.typeUsername(ownerUsername)
      await registerModal.submit()
    })

    it('Owner sees general channel', async () => {
      logger.info('Invitation Link', 8)
      const generalChannel = new Channel(ownerApp.driver, 'general')
      expect(await generalChannel.isReady())

      const generalChannelText = await generalChannel.element.getText()
      expect(generalChannelText).toEqual('# general')
    })

    it('Owner opens the settings tab and gets an invitation code', async () => {
      logger.info('Invitation Link', 9)
      const settingsModal = await new Sidebar(ownerApp.driver).openSettings()
      expect(await settingsModal.isReady()).toBeTruthy()
      await settingsModal.switchTab(SettingsModalTabName.INVITE)
      const invitationLinkElement = await settingsModal.invitationLink()
      invitationLink = await invitationLinkElement.getText()
      logger.info('Received invitation link:', invitationLink)
      await settingsModal.closeTabThenModal()
    })

    if (process.platform === 'darwin') {
      // MacOS tries to open link in first app (owner's app) so the workaround is to temporarly close owner
      // while clicking on the invitation link to have just one instance of app opened
      it('Owner closes the app', async () => {
        logger.info('Invitation Link', 10)
        await ownerApp.close({ forceSaveState: true })
      })
    }

    it('Guest opens the app', async () => {
      logger.info('Invitation Link', 11)
      logger.info('Guest opens app')
      await guestApp.open()
    })

    it.skip('Guest clicks invitation link with invalid invitation code', async () => {
      // Fix when modals ordering is fixed (joining modal hides warning modal)
      logger.info('opening invalid code')
      execSync(
        `xdg-open ${composeInvitationDeepUrl({
          pairs: [{ peerId: 'invalid', onionAddress: 'alsoInvalid' }],
          psk: '1234',
          ownerOrbitDbIdentity: 'ownerId',
        })}`
      )
    })

    it.skip('Guest sees modal with warning about invalid code, closes it', async () => {
      // Fix when modals ordering is fixed (joining modal hiddes warning modal)
      const warningModal = new WarningModal(guestApp.driver)
      expect(await warningModal.isReady()).toBeTruthy()

      const titleElement = await warningModal.titleElement
      expect(titleElement.getText()).toEqual('Invalid link')
      await warningModal.close()
    })

    it('Guest clicks invitation link with valid code', async () => {
      logger.info('Invitation Link', 14)
      // Extract code from copied invitation url

      const url = new URL(invitationLink)
      const command = {
        linux: 'xdg-open',
        darwin: 'open',
        win32: 'start',
      }

      const copiedCode = url.hash.substring(1)
      expect(() => parseInvitationLink(copiedCode)).not.toThrow()
      const data = parseInvitationLink(copiedCode)
      const commandFull = `${command[process.platform as SupportedPlatformDesktop]} ${process.platform === 'win32' ? '""' : ''} "${composeInvitationDeepUrl(data)}"`
      logger.info(`Calling ${commandFull}`)
      execSync(commandFull)
      logger.info('Guest opened invitation link')
    })

    it('Guest is redirected to UsernameModal and submits username', async () => {
      logger.info('Invitation Link', 16)
      logger.info('Guest submits username')
      const registerModal = new RegisterUsernameModal(guestApp.driver)
      expect(await registerModal.isReady()).toBeTruthy()

      await registerModal.typeUsername(joiningUserUsername)
      await registerModal.submit()
    })

    if (process.platform === 'darwin') {
      // Open the owner's app again so guest would be able to register
      it('Owner opens the app again', async () => {
        logger.info('Invitation Link', 17)
        logger.info('Owner opens the app again')
        await ownerApp.open()
        const debugModal = new DebugModeModal(ownerApp.driver)
        await debugModal.close()
      })
    }

    it('Guest waits to join the community', async () => {
      const joinPanel = new JoiningLoadingPanel(guestApp.driver)
      await joinPanel.waitForJoinToComplete()
    })

    it('Guest joined a community and sees general channel', async () => {
      logger.info('Invitation Link', 20)
      logger.info('guest sees general channel')

      const generalChannel = new Channel(guestApp.driver, 'general')
      expect(await generalChannel.isReady()).toBeTruthy()
    })

    it('Owner sees that guest joined community', async () => {
      logger.info('Invitation Link', 21)
      const generalChannel = new Channel(ownerApp.driver, 'general')
      expect(await generalChannel.isReady()).toBeTruthy()

      const messageIds = await generalChannel.getMessageIdsByText(
        `@${joiningUserUsername} has joined and will be registered soon. 🎉 Learn more`,
        joiningUserUsername
      )
    })
  })
})
