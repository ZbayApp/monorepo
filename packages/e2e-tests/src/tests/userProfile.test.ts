import { By, until } from 'selenium-webdriver'

import {
  App,
  Channel,
  CreateCommunityModal,
  JoinCommunityModal,
  JoiningLoadingPanel,
  RegisterUsernameModal,
  Sidebar,
  UserProfileContextMenu,
} from '../selectors'
import { createLogger } from '../logger'
import { EXPECTED_IMG_SRC_GIF, EXPECTED_IMG_SRC_JPEG, EXPECTED_IMG_SRC_PNG } from '../profilePhoto.const'
import { PhotoExt, SettingsModalTabName, X_DATA_TESTID } from '../enums'
import { UserTestData } from '../types'

const logger = createLogger('userProfile')

jest.setTimeout(900000)

describe('User Profile Feature', () => {
  let generalChannelOwner: Channel
  let generalChannelUser1: Channel
  let invitationLink: string

  let users: Record<string, UserTestData>
  const communityName = 'testcommunity'

  beforeAll(async () => {
    users = {
      owner: {
        username: 'owner',
        messages: ['Hi', 'Hello', 'After guest left the app'],
        app: new App(),
      },
      user1: {
        username: 'user-joining-1',
        messages: [],
        app: new App(),
      },
    }
  })

  afterAll(async () => {
    for (const user of Object.values(users)) {
      await user.app.close()
      await user.app.cleanup()
    }
  })

  beforeEach(async () => {
    logger.info(`░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ${expect.getState().currentTestName}`)
  })

  it('Owner opens the app', async () => {
    await users.owner.app.open()
  })

  it('Owner sees "join community" modal and switches to "create community" modal', async () => {
    const joinModal = new JoinCommunityModal(users.owner.app.driver)
    expect(await joinModal.isReady()).toBeTruthy()
    await joinModal.switchToCreateCommunity()
  })

  it('Owner submits valid community name', async () => {
    const createModal = new CreateCommunityModal(users.owner.app.driver)
    expect(await createModal.isReady()).toBeTruthy()
    await createModal.typeCommunityName(communityName)
    await createModal.submit()
  })

  it('Owner sees "register username" modal and submits valid username', async () => {
    const registerModal = new RegisterUsernameModal(users.owner.app.driver)
    expect(await registerModal.isReady()).toBeTruthy()
    await registerModal.typeUsername(users.owner.username)
    await registerModal.submit()
  })

  it('Owner registers successfully and sees general channel', async () => {
    generalChannelOwner = new Channel(users.owner.app.driver, 'general')
    expect(await generalChannelOwner.isReady())

    const generalChannelText = await generalChannelOwner.element.getText()
    expect(generalChannelText).toEqual('# general')
  })

  it('Owner sends a message', async () => {
    expect(await generalChannelOwner.isMessageInputReady()).toBeTruthy()
    await generalChannelOwner.sendMessage(users.owner.messages[0], users.owner.username)
  })

  it('Owner updates their profile photo with JPEG', async () => {
    try {
      logger.info('JPEG')
      const menu = new UserProfileContextMenu(users.owner.app.driver)
      await menu.openMenu()
      await menu.openEditProfileMenu()
      await menu.uploadJPEGPhoto()

      const imgSrc = await menu.getProfilePhotoSrc(PhotoExt.JPEG)
      expect(imgSrc).toEqual(EXPECTED_IMG_SRC_JPEG)

      await menu.back(X_DATA_TESTID.EDIT_PROFILE)
      await menu.isMenuReady()
      await menu.back(X_DATA_TESTID.PROFILE)
      await generalChannelOwner.isMessageInputReady()
    } catch (e) {
      logger.error('Failed to set JPEG profile photo', e)
      throw e
    }
  })

  it('Owner updates their profile photo with GIF', async () => {
    try {
      logger.info('GIF')
      const menu = new UserProfileContextMenu(users.owner.app.driver)
      await menu.openMenu()
      await menu.openEditProfileMenu()
      await menu.uploadGIFPhoto()

      const imgSrc = await menu.getProfilePhotoSrc(PhotoExt.GIF)
      expect(imgSrc).toEqual(EXPECTED_IMG_SRC_GIF)

      await menu.back(X_DATA_TESTID.EDIT_PROFILE)
      await menu.isMenuReady()
      await menu.back(X_DATA_TESTID.PROFILE)
      await generalChannelOwner.isMessageInputReady()
    } catch (e) {
      logger.error('Failed to set GIF profile photo', e)
      throw e
    }
  })

  it('Owner updates their profile photo with PNG', async () => {
    try {
      logger.info('PNG')
      const menu = new UserProfileContextMenu(users.owner.app.driver)
      await menu.openMenu()
      await menu.openEditProfileMenu()
      await menu.uploadPNGPhoto()

      const imgSrc = await menu.getProfilePhotoSrc(PhotoExt.PNG)
      expect(imgSrc).toEqual(EXPECTED_IMG_SRC_PNG)

      await menu.back(X_DATA_TESTID.EDIT_PROFILE)
      await menu.isMenuReady()
      await menu.back(X_DATA_TESTID.PROFILE)
      await generalChannelOwner.isMessageInputReady()
    } catch (e) {
      logger.error('Failed to set PNG profile photo', e)
      throw e
    }
  })

  it('Owner opens the settings tab and gets an invitation link', async () => {
    const settingsModal = await new Sidebar(users.owner.app.driver).openSettings()
    expect(await settingsModal.isReady()).toBeTruthy()
    await settingsModal.switchTab(SettingsModalTabName.INVITE)
    const invitationLinkElement = await settingsModal.invitationLink()
    invitationLink = await invitationLinkElement.getText()
    expect(invitationLink).not.toBeUndefined()
    logger.info('Received invitation link:', invitationLink)
    await settingsModal.closeTabThenModal()
  })

  it('First user opens the app', async () => {
    await users.user1.app.open()
  })

  it('First user submits invitation link received from owner', async () => {
    const joinCommunityModal = new JoinCommunityModal(users.user1.app.driver)
    expect(await joinCommunityModal.isReady()).toBeTruthy()
    await joinCommunityModal.typeCommunityInviteLink(invitationLink)
    await joinCommunityModal.submit()
  })

  it('First user submits valid username', async () => {
    const registerModal = new RegisterUsernameModal(users.user1.app.driver)
    expect(await registerModal.isReady()).toBeTruthy()
    await registerModal.clearInput()
    await registerModal.typeUsername(users.user1.username)
    await registerModal.submit()
  })

  it('First user waits to join the community', async () => {
    const joinPanel = new JoiningLoadingPanel(users.user1.app.driver)
    await joinPanel.waitForJoinToComplete()
  })

  it('First user joins successfully sees general channel', async () => {
    generalChannelUser1 = new Channel(users.user1.app.driver, 'general')
    expect(await generalChannelUser1.isReady()).toBeTruthy()
    expect(await generalChannelUser1.isMessageInputReady()).toBeTruthy()
  })

  it("First user sees owner's message with profile photo", async () => {
    const messages = await generalChannelUser1.getAtleastNumUserMessages(users.owner.username, 2)
    const elem = messages?.[1]
    if (!elem) {
      fail('Failed to find at least 2 messages')
    }
    await users.user1.app.driver.wait(until.elementIsVisible(elem), 10_000)
    const text = await elem.getText()
    expect(text).toEqual(users.owner.messages[0])

    const fullMessages = await generalChannelUser1.getUserMessagesFull(users.owner.username)
    const img = await fullMessages[1].findElement(By.tagName('img'))
    await users.user1.app.driver.wait(until.elementIsVisible(img), 10_000)
    const imgSrc = await img.getAttribute('src')
    expect(imgSrc).toEqual(EXPECTED_IMG_SRC_PNG)
  })
})
