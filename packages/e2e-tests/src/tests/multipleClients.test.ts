import { jest } from '@jest/globals'

import {
  App,
  Channel,
  ChannelContextMenu,
  CreateCommunityModal,
  DebugModeModal,
  JoinCommunityModal,
  JoiningLoadingPanel,
  RegisterUsernameModal,
  Sidebar,
} from '../selectors'
import { promiseWithRetries, sleep, createArbitraryFile } from '../utils'
import { MessageIds, UserTestData } from '../types'
import { createLogger } from '../logger'
import * as path from 'path'
import { SettingsModalTabName, UploadedFileType } from '../enums'
import {
  BIG_FILE_SIZE,
  TEST_BIG_FILE_NAME,
  TEST_FILE_NAME,
  TEST_IMAGE_FILE_NAME,
  UPLOAD_FILE_DIR,
} from '../uploadFile.const'

const logger = createLogger('multipleClients')

jest.setTimeout(1200000) // 20 minutes
describe('Multiple Clients', () => {
  let generalChannelOwner: Channel
  let generalChannelUser1: Channel
  let generalChannelUser3: Channel

  let secondChannelOwner: Channel
  let secondChannelUser1: Channel
  let secondChannelUser3: Channel

  let thirdChannelOwner: Channel

  let channelContextMenuOwner: ChannelContextMenu

  let invitationLink: string

  let sidebarOwner: Sidebar
  let sidebarUser1: Sidebar
  let sidebarUser3: Sidebar

  let users: Record<string, UserTestData>

  const communityName = 'testcommunity'
  const displayedCommunityName = 'Testcommunity'
  const newChannelName = 'mid-night-club'
  const generalChannelName = 'general'
  const thirdChannelName = 'delete-this'

  beforeAll(async () => {
    const commonApp = new App()
    users = {
      owner: {
        username: 'owner',
        messages: ['Hi', 'Hello', 'After guest left the app'],
        app: new App(),
      },
      user1: {
        username: 'user-joining-1',
        messages: ['Nice to meet you all', 'This is a message'],
        app: commonApp,
      },
      user2: {
        username: 'user-joining-1-1',
        messages: ['Nice to meet you again'],
        app: commonApp,
      },
      user3: {
        username: 'user-joining-2',
        messages: ['Hi everyone'],
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

  describe('Stages:', () => {
    describe('Owner Opens App', () => {
      it('Owner opens the app', async () => {
        await users.owner.app.openWithRetries()
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

      it('Owner waits to join', async () => {
        const joinPanel = new JoiningLoadingPanel(users.owner.app.driver)
        await joinPanel.waitForJoinToComplete()
      })

      it('Owner registers successfully and sees general channel', async () => {
        generalChannelOwner = new Channel(users.owner.app.driver, generalChannelName)
        expect(await generalChannelOwner.isReady()).toBeTruthy()
        expect(await generalChannelOwner.isOpen()).toBeTruthy()

        const generalChannelText = await generalChannelOwner.element.getText()
        expect(generalChannelText).toEqual('# general')
      })

      it('Owner sends a message', async () => {
        expect(await generalChannelOwner.isMessageInputReady()).toBeTruthy()
        await generalChannelOwner.sendMessage(users.owner.messages[0], users.owner.username)
      })

      it("Owner's message is visible on channel", async () => {
        const messages = await generalChannelOwner.getUserMessages(users.owner.username)
        const text = await messages[1].getText()
        expect(text).toEqual(users.owner.messages[0])
      })

      it('Owner opens the settings tab and gets an invitation link', async () => {
        const settingsModal = await new Sidebar(users.owner.app.driver).openSettings()
        expect(await settingsModal.isReady()).toBeTruthy()
        await settingsModal.switchTab(SettingsModalTabName.INVITE)
        const invitationLinkElement = await settingsModal.invitationLink()
        invitationLink = await invitationLinkElement.getText()
        expect(invitationLink).not.toBeUndefined()
        logger.info('Received invitation link:', invitationLink)
        logger.warn('closing invite tab')
        await settingsModal.closeTabThenModal()
      })
    })

    describe('First User Joins Community', () => {
      it('First user opens the app', async () => {
        logger.info('Second client')
        await users.user1.app.openWithRetries()
      })

      it('First user submits invitation code received from owner', async () => {
        logger.info('new user - 3')
        const joinCommunityModal = new JoinCommunityModal(users.user1.app.driver)
        expect(await joinCommunityModal.isReady()).toBeTruthy()
        logger.info({ invitationLink })
        await joinCommunityModal.typeCommunityInviteLink(invitationLink)
        await joinCommunityModal.submit()
      })

      it('First user submits valid username', async () => {
        const app = users.user1.app
        logger.info('new user - 5')
        const registerModal = new RegisterUsernameModal(app.driver)
        expect(await registerModal.isReady()).toBeTruthy()
        await registerModal.clearInput()
        await registerModal.typeUsername(users.user1.username)
        await registerModal.submit()
        logger.time(`[${app.name}] '${users.user1.username}' joining community time`)
      })

      it('First user waits to join', async () => {
        const joinPanel = new JoiningLoadingPanel(users.user1.app.driver)
        await joinPanel.waitForJoinToComplete()
      })

      it('First user joins successfully sees general channel and sends a message', async () => {
        logger.info('new user - 7')
        const app = users.user1.app
        const loadNewUser = async () => {
          generalChannelUser1 = new Channel(app.driver, generalChannelName)
          expect(await generalChannelUser1.isReady()).toBeTruthy()
          expect(await generalChannelUser1.isOpen()).toBeTruthy()
          expect(await generalChannelUser1.isMessageInputReady()).toBeTruthy()
          logger.timeEnd(`[${app.name}] '${users.user1.username}' joining community time`)
        }

        const retryConfig = app.retryConfig
        const failureReason = `Failed to load app for new user ${users.user1.username} within ${retryConfig.timeoutMs}ms`
        const onTimeout = async () => {
          await app.close()
          await app.open()
        }
        await promiseWithRetries(loadNewUser(), failureReason, retryConfig, onTimeout)
        await generalChannelUser1.sendMessage(users.user1.messages[0], users.user1.username)
      })

      it("First user's message is visible in a channel", async () => {
        await generalChannelUser1.getUserMessages(users.owner.username)
        await generalChannelUser1.getMessageIdsByText(users.user1.messages[0], users.user1.username)
      })

      it("First user's message is visible in a channel to the owner", async () => {
        await generalChannelUser1.getUserMessages(users.user1.username)
        await generalChannelOwner.getMessageIdsByText(users.user1.messages[0], users.user1.username)
      })

      // NOTE: we used to get the second invite link with the other user but LFA treats invite generation as an admin-only
      // action and the only admin currently is the owner
      it('Owner opens the settings tab and gets an updated invitation link', async () => {
        const settingsModal = await new Sidebar(users.owner.app.driver).openSettings()
        expect(await settingsModal.isReady()).toBeTruthy()
        await settingsModal.switchTab(SettingsModalTabName.INVITE)
        const invitationLinkElement = await settingsModal.invitationLink()
        invitationLink = await invitationLinkElement.getText()
        expect(invitationLink).not.toBeUndefined()
        logger.info('Received updated invitation link:', invitationLink)
        logger.warn('closing invite tab')
        await settingsModal.closeTabThenModal()
      })
    })

    describe('Owner Leaves', () => {
      it('Owner goes offline', async () => {
        await users.owner.app.close()
      })

      it(`First user sends a message`, async () => {
        await generalChannelUser1.sendMessage(users.user1.messages[1], users.user1.username)
      })

      it("First user's message is visible in a channel", async () => {
        await generalChannelUser1.getMessageIdsByText(users.user1.messages[1], users.user1.username)
      })
    })

    describe('Second User Joins', () => {
      it('Second user opens the app', async () => {
        logger.info('Third client')
        await users.user3.app.openWithRetries()
        const debugModal = new DebugModeModal(users.user3.app.driver)
        await debugModal.close()
      })

      it('Second user starts to join when owner is offline', async () => {
        const app = users.user3.app
        const joinCommunityModal = new JoinCommunityModal(app.driver)
        expect(await joinCommunityModal.isReady()).toBeTruthy()
        logger.info({ invitationLink })
        await joinCommunityModal.typeCommunityInviteLink(invitationLink)
        await joinCommunityModal.submit()
      })

      it('Second user submits non-valid, duplicated username', async () => {
        logger.info('duplicated user - 1')
        const registerModal = new RegisterUsernameModal(users.user3.app.driver)
        expect(await registerModal.isReady()).toBeTruthy()
        await registerModal.clearInput()
        await registerModal.typeUsername(users.user1.username)
        await registerModal.submit()
        logger.time(`[${users.user3.app.name}] '${users.user1.username}' duplicated joining community time`)
      })

      it('Second user waits to join', async () => {
        const joinPanel = new JoiningLoadingPanel(users.user3.app.driver)
        await joinPanel.waitForJoinToComplete()
      })

      it('Second user submits valid username', async () => {
        logger.info('duplicated user - 2')
        const registerModal = new RegisterUsernameModal(users.user3.app.driver)
        expect(await registerModal.isUsernameTakenReady()).toBeTruthy()
        await registerModal.clearInput()
        await registerModal.typeUsername(users.user3.username)
        await registerModal.submitUsernameTaken()
        logger.time(`[${users.user3.app.name}] '${users.user3.username}' joining community time`)
      })

      it('Second user sees general channel', async () => {
        logger.info('new user - 7')
        const app = users.user3.app
        const loadNewUser = async () => {
          generalChannelUser3 = new Channel(app.driver, generalChannelName)
          expect(await generalChannelUser3.isReady()).toBeTruthy()
          expect(await generalChannelUser3.isOpen()).toBeTruthy()
          expect(await generalChannelUser3.isMessageInputReady()).toBeTruthy()
          logger.timeEnd(`[${app.name}] '${users.user3.username}' joining community time`)
        }

        const retryConfig = app.retryConfig
        const failureReason = `Failed to load app for new user ${users.user3.username} within ${retryConfig.timeoutMs}ms`
        const onTimeout = async () => {
          await app.close()
          await app.open()
        }
        await promiseWithRetries(loadNewUser(), failureReason, retryConfig, onTimeout)
      })

      it('Second user can send a message, they see their message tagged as "unregistered"', async () => {
        await generalChannelUser3.sendMessage(users.user3.messages[0], users.user3.username)
        generalChannelUser3 = new Channel(users.user3.app.driver, generalChannelName)
        await generalChannelUser3.waitForLabel(users.user3.username, 'Unregistered')
      })

      it('First user sees that unregistered user\'s messages are marked as "unregistered"', async () => {
        await generalChannelUser1.getMessageIdsByText(users.user3.messages[0], users.user3.username)
        await generalChannelUser1.waitForLabel(users.user3.username, 'Unregistered')
      })
    })

    describe('Second User Registers', () => {
      // TODO: add check for number of messages
      it('Owner goes back online', async () => {
        await users.owner.app.openWithRetries()
        const debugModal = new DebugModeModal(users.owner.app.driver)
        await debugModal.close()
        await sleep(30000)
      })

      // @isla - TODO: Uncomment and validate this test when we fix the issues causing it
      // related to : https://github.com/TryQuiet/quiet/issues/1838, https://github.com/TryQuiet/quiet/issues/2321
      xit('Second user receives certificate, they can see confirmation that they registered', async () => {
        await generalChannelUser3.getMessageIdsByText(
          `@${users.user3.username} has joined and will be registered soon. 🎉 Learn more`,
          users.user3.username
        )
      })

      it('"Unregistered" label is removed from second user\'s messages', async () => {
        generalChannelOwner = new Channel(users.owner.app.driver, generalChannelName)
        await generalChannelOwner.waitForLabelsNotPresent(users.user3.username)
      })
    })

    describe('Owner Creates New Channel', () => {
      it('Owner creates second channel', async () => {
        sidebarOwner = new Sidebar(users.owner.app.driver)
        await sidebarOwner.addNewChannel(newChannelName)
        await sidebarOwner.switchChannel(newChannelName)
        const channels = await sidebarOwner.getChannelList()
        expect(channels.length).toEqual(2)
      })

      it('Owner sends message in second channel', async () => {
        secondChannelOwner = new Channel(users.owner.app.driver, newChannelName)
        expect(await secondChannelOwner.isReady()).toBeTruthy()
        expect(await secondChannelOwner.isMessageInputReady()).toBeTruthy()
        await secondChannelOwner.sendMessage(users.owner.messages[1], users.owner.username)
      })

      it('User sees the second channel', async () => {
        sidebarUser1 = new Sidebar(users.user1.app.driver)
        secondChannelUser1 = new Channel(users.user1.app.driver, newChannelName)
        expect(await secondChannelUser1.isReady(30_000)).toBeTruthy()
        const channels = await sidebarUser1.getChannelList()
        expect(channels.length).toEqual(2)
      })

      it('Second user sees the second channel', async () => {
        sidebarUser3 = new Sidebar(users.user3.app.driver)
        secondChannelUser3 = new Channel(users.user3.app.driver, newChannelName)
        expect(await secondChannelUser3.isReady(30_000)).toBeTruthy()
        const channels = await sidebarUser3.getChannelList()
        expect(channels.length).toEqual(2)
      })

      it('User reads message in second channel', async () => {
        await sidebarUser1.switchChannel(newChannelName)
        secondChannelUser1 = new Channel(users.user1.app.driver, newChannelName)
        await secondChannelUser1.getAtleastNumUserMessages(users.owner.username, 1)
        await secondChannelUser1.getMessageIdsByText(users.owner.messages[1], users.owner.username)
      })

      it('Second user reads message in second channel', async () => {
        await sidebarUser3.switchChannel(newChannelName)
        secondChannelUser3 = new Channel(users.user3.app.driver, newChannelName)
        await secondChannelUser3.getAtleastNumUserMessages(users.owner.username, 1)
        await secondChannelUser3.getMessageIdsByText(users.owner.messages[1], users.owner.username)
      })
    })

    describe('Channel Deletion', () => {
      it('Owner deletes second channel', async () => {
        channelContextMenuOwner = new ChannelContextMenu(users.owner.app.driver)
        await channelContextMenuOwner.openMenu()
        await channelContextMenuOwner.openDeletionChannelModal()
        await channelContextMenuOwner.deleteChannel()
        const channels = await sidebarOwner.getChannelList()
        expect(await generalChannelOwner.isOpen()).toBeTruthy()
        expect(channels.length).toEqual(1)
      })

      it('User sees info about channel deletion in general channel', async () => {
        expect(await generalChannelUser1.isOpen()).toBeTruthy()
        await generalChannelUser1.getMessageIdsByText(
          `@${users.owner.username} deleted #${newChannelName}`,
          users.owner.username
        )
      })

      it('Second user sees info about channel deletion in general channel', async () => {
        expect(await generalChannelUser3.isOpen()).toBeTruthy()
        await generalChannelUser3.getMessageIdsByText(
          `@${users.owner.username} deleted #${newChannelName}`,
          users.owner.username
        )
      })

      it('User sees that the channel is missing in the sidebar', async () => {
        const channels = await sidebarUser1.getChannelList()
        expect(channels.length).toEqual(1)
      })

      it('Second user sees that the channel is missing in the sidebar', async () => {
        const channels = await sidebarUser3.getChannelList()
        expect(channels.length).toEqual(1)
      })

      it('User can create channel with the same name and is fresh channel', async () => {
        await sidebarUser1.addNewChannel(newChannelName)
        await sidebarUser1.switchChannel(newChannelName)
        const messages = await secondChannelUser1.getUserMessages(users.user1.username)
        expect(messages.length).toEqual(1)
        expect(await secondChannelUser1.isReady()).toBeTruthy()
        const channels = await sidebarUser1.getChannelList()
        expect(channels.length).toEqual(2)
      })

      it('Owner sees the recreated second channel', async () => {
        expect(await secondChannelOwner.isReady()).toBeTruthy()
        const channels = await sidebarOwner.getChannelList()
        expect(channels.length).toEqual(2)
      })

      it('Second user sees the recreated second channel', async () => {
        expect(await secondChannelUser3.isReady()).toBeTruthy()
        const channels = await sidebarUser3.getChannelList()
        expect(channels.length).toEqual(2)
      })

      // End of tests for Windows
      if (process.platform !== 'win32') {
        it('Leave community', async () => {
          logger.info('TEST 2')
          const settingsModal = await new Sidebar(users.user1.app.driver).openSettings()
          expect(await settingsModal.isReady()).toBeTruthy()
          await settingsModal.switchTab(SettingsModalTabName.LEAVE_COMMUNITY)
          await settingsModal.leaveCommunityButton()
        })

        // Delete general channel while guest is absent
        it('Owner recreates general channel', async () => {
          logger.info('TEST 3')
          expect(await generalChannelOwner.isReady()).toBeTruthy()
          expect(await generalChannelOwner.isOpen()).toBeTruthy()
          expect(await generalChannelOwner.isMessageInputReady()).toBeTruthy()
          await channelContextMenuOwner.openMenu()
          await channelContextMenuOwner.openDeletionChannelModal()
          await channelContextMenuOwner.deleteChannel()
        })

        it('Owner sees recreated general channel', async () => {
          logger.info('TEST 3')
          expect(await generalChannelOwner.isReady()).toBeTruthy()
          expect(await generalChannelOwner.isOpen()).toBeTruthy()
          expect(await generalChannelOwner.isMessageInputReady()).toBeTruthy()
          const channels = await sidebarOwner.getChannelList()
          expect(channels.length).toEqual(2)
        })
      }
    })

    describe('Leave Community', () => {
      it('Guest re-join to community successfully', async () => {
        logger.info('TEST 4')
        const debugModal = new DebugModeModal(users.user1.app.driver)
        await debugModal.close()
        const joinCommunityModal = new JoinCommunityModal(users.user1.app.driver)
        expect(await joinCommunityModal.isReady()).toBeTruthy()
        await joinCommunityModal.typeCommunityInviteLink(invitationLink)
        await joinCommunityModal.submit()
      })

      it('Guest registers new username', async () => {
        logger.info('TEST 5')
        const registerModal2 = new RegisterUsernameModal(users.user1.app.driver)
        expect(await registerModal2.isReady()).toBeTruthy()
        await registerModal2.typeUsername(users.user2.username)
        await registerModal2.submit()
        logger.time(`[${users.user1.app.name}] '${users.user2.username}' joining community time`)
      })

      it('Guest waits to join', async () => {
        const joinPanel = new JoiningLoadingPanel(users.user1.app.driver)
        await joinPanel.waitForJoinToComplete()
      })

      // Check correct channels replication
      // TODO: add check for number of messages
      it('User sees information about recreation general channel and see correct amount of messages', async () => {
        logger.info('TEST 6')
        generalChannelUser1 = new Channel(users.user1.app.driver, generalChannelName)
        expect(await generalChannelUser1.isReady()).toBeTruthy()
        expect(await generalChannelUser1.isOpen()).toBeTruthy()
        expect(await generalChannelUser1.isMessageInputReady()).toBeTruthy()
        logger.timeEnd(`[${users.user1.app.name}] '${users.user2.username}' joining community time`)
        await sleep(10000)

        await generalChannelUser1.getMessageIdsByText(
          `@${users.owner.username} deleted all messages in #general`,
          users.owner.username
        )

        await generalChannelUser1.getMessageIdsByText(
          `@${users.user2.username} has joined and will be registered soon. 🎉 Learn more`,
          users.user2.username
        )
      })

      it('Guest sends a message after rejoining community as a new user and it is visible', async () => {
        logger.info('TEST 7')
        generalChannelUser1 = new Channel(users.user1.app.driver, generalChannelName)
        expect(await generalChannelUser1.isReady()).toBeTruthy()
        expect(await generalChannelUser1.isMessageInputReady()).toBeTruthy()
        await generalChannelUser1.sendMessage(users.user2.messages[0], users.user2.username)
      })
    })

    describe('Uploading and downloading files', () => {
      let imageMessageIds: MessageIds | undefined = undefined
      let fileMessageIds: MessageIds | undefined = undefined
      let largeFileMessageIds: MessageIds | undefined = undefined

      it('Owner uploads an image', async () => {
        const uploadFilePath = path.resolve(UPLOAD_FILE_DIR, TEST_IMAGE_FILE_NAME)
        imageMessageIds = await generalChannelOwner.uploadFile(
          TEST_IMAGE_FILE_NAME,
          uploadFilePath,
          UploadedFileType.IMAGE,
          users.owner.username
        )
      })

      it('Guest sees uploaded image', async () => {
        expect(imageMessageIds).toBeDefined()
        await generalChannelUser1.getMessageIdsByFileAndId(
          imageMessageIds!,
          TEST_IMAGE_FILE_NAME,
          UploadedFileType.IMAGE,
          users.owner.username
        )
      })

      it('Owner uploads a file', async () => {
        const uploadFilePath = path.resolve(UPLOAD_FILE_DIR, TEST_FILE_NAME)
        fileMessageIds = await generalChannelOwner.uploadFile(
          TEST_FILE_NAME,
          uploadFilePath,
          UploadedFileType.FILE,
          users.owner.username
        )
      })

      it('Guest sees uploaded file and it downloads', async () => {
        expect(fileMessageIds).toBeDefined()
        await generalChannelUser1.getMessageIdsByFileAndId(
          fileMessageIds!,
          TEST_FILE_NAME,
          UploadedFileType.FILE,
          users.owner.username
        )
      })

      it('Owner uploads a large file', async () => {
        const uploadFilePath = path.resolve(UPLOAD_FILE_DIR, TEST_BIG_FILE_NAME)
        createArbitraryFile(uploadFilePath, BIG_FILE_SIZE)
        largeFileMessageIds = await generalChannelOwner.uploadFile(
          TEST_BIG_FILE_NAME,
          uploadFilePath,
          UploadedFileType.FILE,
          users.owner.username
        )
      })

      it(`Guest sees uploaded large file`, async () => {
        expect(largeFileMessageIds).toBeDefined()
        await generalChannelUser1.getMessageIdsByFileAndId(
          largeFileMessageIds!,
          TEST_BIG_FILE_NAME,
          UploadedFileType.FILE,
          users.owner.username
        )
      })

      it(`Guest cancels download of large file`, async () => {
        expect(largeFileMessageIds).toBeDefined()
        expect(await generalChannelUser1.cancelFileDownload(largeFileMessageIds!)).toBeTruthy()
      })
    })

    describe('Guest Closes App', () => {
      it('Owner closes app', async () => {
        await users.owner.app.close({ forceSaveState: true })
      })

      it('Guest closes app', async () => {
        logger.info('TEST 9')
        await users.user1.app?.close()
      })

      it('Owner re-opens app', async () => {
        await users.owner.app?.openWithRetries()
      })

      it('Owner sends another message after guest left the app and it is visible', async () => {
        logger.info('TEST 10')
        generalChannelOwner = new Channel(users.owner.app.driver, generalChannelName)
        expect(await generalChannelOwner.isReady()).toBeTruthy()
        expect(await generalChannelOwner.isOpen()).toBeTruthy()
        expect(await generalChannelOwner.isMessageInputReady()).toBeTruthy()
        const messageIds = await generalChannelOwner.sendMessage(users.owner.messages[2], users.owner.username)
      })
    })
  })
})
