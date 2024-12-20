import { By, Key, type ThenableWebDriver, type WebElement, until } from 'selenium-webdriver'
import { BuildSetup, logAndReturnError, promiseWithRetries, sleep, type BuildSetupInit } from './utils'
import path from 'path'
import { FileDownloadStatus, PhotoExt, SettingsModalTabName, UploadedFileType, X_DATA_TESTID } from './enums'
import { MessageIds, RetryConfig } from './types'
import { createLogger } from './logger'
import { DateTime } from 'luxon'

const logger = createLogger('selectors')

export class App {
  thenableWebDriver?: ThenableWebDriver
  buildSetup: BuildSetup
  isOpened: boolean
  retryConfig: RetryConfig = {
    attempts: 3,
    timeoutMs: 600000,
  }
  shortRetryConfig: RetryConfig = {
    ...this.retryConfig,
    timeoutMs: 30000,
  }

  constructor(buildSetupConfig?: BuildSetupInit) {
    this.buildSetup = new BuildSetup({ ...buildSetupConfig })
    this.isOpened = false
  }

  get driver(): ThenableWebDriver {
    if (!this.thenableWebDriver) {
      this.thenableWebDriver = this.buildSetup.getDriver()
    }
    return this.thenableWebDriver
  }

  get name() {
    return this.buildSetup.dataDir
  }

  async open(): Promise<void> {
    logger.info('opening the app', this.buildSetup.dataDir)
    this.buildSetup.resetDriver()
    await this.buildSetup.createChromeDriver()
    this.isOpened = true
    this.thenableWebDriver = this.buildSetup.getDriver()
    await this.driver.getSession()
    const debugModal = new DebugModeModal(this.driver)
    await debugModal.close()
  }

  async openWithRetries(overrideConfig?: RetryConfig): Promise<void> {
    const config = {
      ...this.retryConfig,
      ...(overrideConfig ? overrideConfig : {}),
    }
    const failureReason = `Failed to open app within ${config.timeoutMs}ms`
    await promiseWithRetries(this.open(), failureReason, config, this.close)
  }

  async close(options?: { forceSaveState?: boolean }): Promise<void> {
    if (!this.isOpened) return
    logger.info('Closing the app', this.buildSetup.dataDir)
    if (options?.forceSaveState) {
      await this.saveState() // Selenium creates community and closes app so fast that redux state may not be saved properly
      await this.waitForSavedState()
    }
    await this.buildSetup.closeDriver()
    await this.buildSetup.killChromeDriver()
    if (process.platform === 'win32') {
      this.buildSetup.killNine()
      await sleep(2000)
    }
    this.isOpened = false
    logger.info('App closed', this.buildSetup.dataDir)
  }

  async cleanup(force: boolean = false) {
    logger.info(`Performing app cleanup`, this.buildSetup.dataDir)
    if (this.isOpened) {
      throw new Error(`App with dataDir ${this.buildSetup.dataDir} is still open, close before cleaning up!`)
    }
    this.buildSetup.clearDataDir(force)
  }

  get saveStateButton() {
    return this.driver.wait(
      until.elementLocated(By.xpath('//div[@data-testid="save-state-button"]')),
      10_000,
      `Save state button couldn't be located within timeout`,
      500
    )
  }

  async closeUpdateModalIfPresent() {
    const updateModal = new UpdateModal(this.driver)
    await updateModal.close()
  }

  async saveState() {
    const stateButton = await this.saveStateButton
    await this.driver.executeScript('arguments[0].click();', stateButton)
  }

  async waitForSavedState() {
    const dataSaved = this.driver.wait(
      until.elementLocated(By.xpath('//div[@data-is-saved="true"]')),
      20_000,
      `State couldn't be saved within timeout`,
      500
    )
    return await dataSaved
  }
}

export class StartingLoadingPanel {
  private readonly driver: ThenableWebDriver
  constructor(driver: ThenableWebDriver) {
    this.driver = driver
  }

  get element() {
    return this.driver.wait(
      until.elementLocated(By.xpath('//div[@data-testid="startingPanelComponent"]')),
      15_000,
      `Loading panel element couldn't be located within timeout`,
      500
    )
  }
}

export class WarningModal {
  private readonly driver: ThenableWebDriver

  constructor(driver: ThenableWebDriver) {
    this.driver = driver
  }

  async isReady(): Promise<boolean> {
    await this.driver.wait(
      until.elementIsVisible(this.titleElement),
      15_000,
      `Warning modal couldn't be seen within timeout`,
      500
    )
    return true
  }

  get titleElement() {
    return this.driver.wait(
      until.elementLocated(By.xpath('//h3[@data-testid="warningModalTitle"]')),
      10_000,
      `Warning modal title element couldn't be located within timeout`,
      500
    )
  }

  async close() {
    const submitButton = await this.driver.wait(
      this.driver.findElement(By.xpath('//button[@data-testid="warningModalSubmit"]')),
      10_000,
      `Warning modal couldn't be closed within timeout`,
      500
    )
    await submitButton.click()
  }
}

export class JoiningLoadingPanel {
  private readonly driver: ThenableWebDriver
  constructor(driver: ThenableWebDriver) {
    this.driver = driver
  }

  get element() {
    return this.driver.wait(
      this.driver.findElement(By.xpath('//div[@data-testid="joiningPanelComponent"]')),
      15_000,
      `Joining loading panel element couldn't be located within timeout`,
      500
    )
  }

  async waitForJoinToComplete() {
    const panel = await this.element
    await this.driver.wait(
      until.elementIsVisible(panel),
      15_000,
      `Loading panel element couldn't be seen within timeout`,
      500
    )

    try {
      await this.driver.wait(
        until.elementIsNotVisible(panel),
        300_000,
        `Loading panel element didn't disappear within timeout`,
        5_000
      )
    } catch (e) {
      if (e.message.includes('stale element reference')) {
        logger.warn(`Join loading panel disappeared and we couldn't get visibility information.  This is fine.`)
      } else {
        throw e
      }
    }
  }
}

export class ChannelContextMenu {
  private readonly driver: ThenableWebDriver
  constructor(driver: ThenableWebDriver) {
    this.driver = driver
  }

  async openMenu() {
    const menu = this.driver.wait(
      until.elementLocated(By.xpath('//div[@data-testid="channelContextMenuButton"]')),
      15_000,
      `Channel context menu couldn't be located within timeout`,
      500
    )
    await menu.click()
  }

  async openDeletionChannelModal() {
    const tab = this.driver.wait(
      until.elementLocated(By.xpath('//div[@data-testid="contextMenuItemDelete"]')),
      15_000,
      `Channel context menu channel deletion modal couldn't be located within timeout`,
      500
    )
    await tab.click()
  }

  // TODO: replace sleep
  async deleteChannel() {
    const button = this.driver.wait(
      until.elementLocated(By.xpath('//button[@data-testid="deleteChannelButton"]')),
      20_000,
      `Channel deletion button couldn't be located within timeout`,
      500
    )
    await button.click()
    await sleep(5000)
  }
}

export class UserProfileContextMenu {
  private readonly driver: ThenableWebDriver

  constructor(driver: ThenableWebDriver) {
    this.driver = driver
  }

  get menuElement() {
    return this.driver.wait(
      until.elementLocated(By.xpath(`//*[text()='Profile']`)),
      10_000,
      `User profile menu couldn't be found within timeout`,
      500
    )
  }

  get editProfileMenuElement() {
    return this.driver.wait(
      until.elementLocated(By.xpath(`//*[text()='Edit profile']`)),
      10_000,
      `User profile edit menu couldn't be found within timeout`,
      500
    )
  }

  async isMenuReady() {
    await this.driver.wait(
      until.elementIsVisible(this.menuElement),
      15_000,
      `User profile menu wasn't ready within timeout`,
      500
    )
    return true
  }

  async isEditProfileMenuReady() {
    await this.driver.wait(
      until.elementIsVisible(this.editProfileMenuElement),
      15_000,
      `User profile edit menu wasn't ready within timeout`,
      500
    )
    return true
  }

  async openMenu() {
    const button = await this.driver.wait(
      until.elementLocated(By.xpath('//div[@data-testid="user-profile-menu-button"]')),
      20_000,
      'Context menu button not found',
      500
    )
    await this.driver.wait(until.elementIsVisible(button), 20_000, 'Context menu button never became visible', 500)
    await button.click()
    await this.isMenuReady()
  }

  async back(dataTestid: X_DATA_TESTID) {
    const button = await this.driver.wait(
      until.elementLocated(By.xpath(`//button[@data-testid="${dataTestid}"]`)),
      20_000,
      `Context back button with data-testid ${dataTestid} not found`,
      500
    )

    await this.driver.wait(
      until.elementIsVisible(button),
      5_000,
      `Context back button with data-testid ${dataTestid} not visibile`,
      500
    )
    await button.click()
  }

  async openEditProfileMenu() {
    const button = await this.driver.wait(
      until.elementLocated(By.xpath('//div[@data-testid="contextMenuItemEdit profile"]')),
      20_000,
      'Edit Profile button not found',
      500
    )
    await this.driver.wait(until.elementIsVisible(button), 20000, 'Edit Profile button never became visible', 500)
    await button.click()
    await this.isEditProfileMenuReady()
  }

  async uploadPhoto(fileName: string) {
    const input = await this.driver.wait(
      until.elementLocated(By.xpath('//input[@data-testid="user-profile-edit-photo-input"]')),
      10_000,
      'Edit Photo button not found',
      500
    )
    const filePath = path.join(__dirname, fileName)
    await input.sendKeys(filePath)
  }

  async uploadPNGPhoto() {
    await this.uploadPhoto('../assets/profile-photo.png')
  }

  async uploadJPEGPhoto() {
    await this.uploadPhoto('../assets/profile-photo.jpg')
  }

  async uploadGIFPhoto() {
    await this.uploadPhoto('../assets/profile-photo.gif')
  }

  async waitForPhoto(): Promise<WebElement> {
    const photoElement = await this.driver.wait(
      until.elementLocated(By.className('UserProfileContextMenuprofilePhoto')),
      30_000,
      'Profile photo element never located',
      500
    )
    return photoElement
  }

  async getProfilePhotoSrc(ext: PhotoExt): Promise<string> {
    return await this.driver.wait(
      async () => {
        let i = 0
        while (i < 5) {
          const photoElement = await this.waitForPhoto()
          const src = await photoElement.getAttribute('src')

          if (src.includes(`image/${ext}`)) {
            return src
          }
          i++
        }
        throw new Error(`Failed to find image with data type ${ext} after 5 tries`)
      },
      15_000,
      `Failed to find image with data type ${ext} within timeout`,
      500
    )
  }
}

export class RegisterUsernameModal {
  private readonly driver: ThenableWebDriver
  constructor(driver: ThenableWebDriver) {
    this.driver = driver
  }

  get element() {
    return this.driver.wait(
      until.elementLocated(By.xpath("//h3[text()='Register a username']")),
      15_000,
      `Username registration modal couldn't be located within timeout`,
      500
    )
  }

  get elementUsernameTaken() {
    return this.driver.wait(
      until.elementLocated(By.xpath("//h6[text()='Username taken']")),
      15_000,
      `Username taken registration modal couldn't be located within timeout`,
      500
    )
  }

  get error() {
    return this.driver.wait(
      until.elementLocated(By.xpath("//p[text()='Username already taken.']")),
      15_000,
      `Username taken error modal couldn't be located within timeout`,
      500
    )
  }

  get usernameInput() {
    return this.driver.wait(
      this.driver.findElement(By.xpath('//input[@name="userName"]')),
      10_000,
      `Username input couldn't be found within timeout`,
      500
    )
  }

  async isReady(): Promise<boolean> {
    await this.driver.wait(
      until.elementIsVisible(this.element),
      10_000,
      `Username registration modal wasn't ready within timeout`,
      500
    )
    return true
  }

  async isUsernameTakenReady(): Promise<boolean> {
    await this.driver.wait(
      until.elementIsVisible(this.elementUsernameTaken),
      10_000,
      `Username taken registration modal wasn't ready within timeout`,
      500
    )
    return true
  }

  async typeUsername(username: string) {
    const usernameInput = await this.usernameInput
    await usernameInput.sendKeys(username)
  }

  async clearInput() {
    const usernameInput = await this.usernameInput
    if (process.platform === 'darwin') {
      await usernameInput.sendKeys(Key.COMMAND + 'a')
      await usernameInput.sendKeys(Key.DELETE)
    } else {
      await usernameInput.sendKeys(Key.CONTROL + 'a')
      await usernameInput.sendKeys(Key.DELETE)
    }
  }

  async submit() {
    const submitButton = await this.driver.wait(
      this.driver.findElement(By.xpath('//button[text()="Register"]')),
      10_000,
      `Username registration submit button couldn't be found within timeout`,
      500
    )
    await submitButton.click()
  }

  async submitUsernameTaken() {
    const submitButton = await this.driver.wait(
      this.driver.findElement(By.xpath('//button[text()="Continue"]')),
      10_000,
      `Username taken registration submit button couldn't be found within timeout`,
      500
    )
    await submitButton.click()
  }
}

export class JoinCommunityModal {
  private readonly driver: ThenableWebDriver
  constructor(driver: ThenableWebDriver) {
    this.driver = driver
  }

  get element() {
    return this.driver.wait(
      until.elementLocated(By.xpath("//h3[text()='Join community']")),
      10_000,
      `Join community modal couldn't be found within timeout`,
      500
    )
  }

  async isReady(): Promise<boolean> {
    await this.driver.wait(
      until.elementIsVisible(this.element),
      10_000,
      `Join community modal wasn't ready within timeout`,
      500
    )
    return true
  }

  async switchToCreateCommunity() {
    const link = await this.driver.wait(
      this.driver.findElement(By.linkText('create a new community')),
      10_000,
      `Create community button couldn't be found within timeout`,
      500
    )
    await link.click()
  }

  async typeCommunityInviteLink(inviteLink: string) {
    const communityNameInput = await this.driver.wait(
      this.driver.findElement(By.xpath('//input[@placeholder="Invite link"]')),
      10_000,
      `Invite link input couldn't be found within timeout`,
      500
    )
    await communityNameInput.sendKeys(inviteLink)
  }

  async submit() {
    const continueButton = await this.driver.wait(
      this.driver.findElement(By.xpath('//button[@data-testid="continue-joinCommunity"]')),
      10_000,
      `Join community continue button couldn't be found within timeout`,
      500
    )
    await continueButton.click()
  }
}
export class CreateCommunityModal {
  private readonly driver: ThenableWebDriver
  constructor(driver: ThenableWebDriver) {
    this.driver = driver
  }

  get element() {
    return this.driver.wait(
      this.driver.findElement(By.xpath("//h3[text()='Create your community']")),
      10_000,
      `Create community modal couldn't be found within timeout`,
      500
    )
  }

  async isReady(): Promise<boolean> {
    await this.driver.wait(
      until.elementIsVisible(await this.element),
      10_000,
      `Create community modal wasn't ready within timeout`,
      500
    )
    return true
  }

  async typeCommunityName(name: string) {
    const communityNameInput = await this.driver.wait(
      this.driver.findElement(By.xpath('//input[@placeholder="Community name"]')),
      10_000,
      `Community name input couldn't be found within timeout`,
      500
    )
    await communityNameInput.sendKeys(name)
  }

  async submit() {
    const continueButton = await this.driver.wait(
      this.driver.findElement(By.xpath('//button[@data-testid="continue-createCommunity"]')),
      10_000,
      `Create community submit button couldn't be found within timeout`,
      500
    )
    await continueButton.click()
  }
}
export class Channel {
  private readonly name: string
  private readonly driver: ThenableWebDriver
  constructor(driver: ThenableWebDriver, name: string) {
    this.driver = driver
    this.name = name
  }

  get title() {
    return this.driver.wait(
      until.elementLocated(By.xpath(`//*[@data-testid='channelTitle']`)),
      10_000,
      `Channel title element for ${this.name} couldn't be found within timeout`,
      500
    )
  }

  get messagesList() {
    return this.driver.wait(
      until.elementLocated(By.xpath('//ul[@id="messages-scroll"]')),
      10_000,
      `Channel message list element for ${this.name} couldn't be found within timeout`,
      500
    )
  }

  async isReady(timeoutMs = 15_000): Promise<boolean> {
    await this.driver.wait(
      until.elementIsVisible(this.element),
      timeoutMs,
      `Channel ${this.name} wasn't ready within timeout`,
      500
    )
    return true
  }

  async isOpen(): Promise<boolean> {
    const titleElement = await this.driver.wait(
      until.elementIsVisible(await this.title),
      15_000,
      `Channel title element for ${this.name} couldn't be seen within timeout`,
      500
    )
    return (await titleElement.getText()) === `#${this.name}`
  }

  async isMessageInputReady(): Promise<boolean> {
    await this.driver.wait(
      until.elementIsVisible(this.messageInput),
      15_000,
      `Channel message input element for ${this.name} couldn't be seen within timeout`,
      500
    )
    return true
  }

  async waitForUserMessageByText(username: string, messageContent: string) {
    logger.info(`Waiting for user "${username}" message "${messageContent}"`)
    return this.driver.wait(
      async () => {
        const startTime = DateTime.utc().toMillis()
        const endTime = startTime + 20_000
        while (DateTime.utc().toMillis() < endTime) {
          const messages = await this.getUserMessages(username)
          for (const element of messages) {
            const text = await element.getText()
            logger.info(`Potential message with text: ${text}`)
            if (text.includes(messageContent)) {
              logger.info(`Found message with matching text ${text}`)
              return element
            }
          }
          await sleep(500)
        }
        throw logAndReturnError(`No message found for user ${username} and message content ${messageContent}`)
      },
      30_000,
      `Message in channel ${this.name} couldn't be found within timeout`,
      500
    )
  }

  async waitForUserMessageByFilename(
    username: string,
    filename: string,
    fileType: UploadedFileType
  ): Promise<WebElement> {
    logger.info(`Waiting for user "${username}" message with uploaded file "${filename}"`)
    return this.driver.wait(
      async () => {
        const startTime = DateTime.utc().toMillis()
        const endTime = startTime + 30_000
        while (DateTime.utc().toMillis() < endTime) {
          const messages = await this.getUserMessages(username)
          for (const element of messages) {
            const filenameElement = await this.getUploadedFilenameElementByType(filename, fileType, element)
            if (filenameElement != null) {
              logger.info(`Found message with matching filename ${filename}`)
              return element
            }
          }
          await sleep(500)
        }
        throw logAndReturnError(`No message found for user ${username} and filename ${filename}`)
      },
      45_000,
      `Message for uploaded file ${filename} in channel ${this.name} couldn't be found within timeout`,
      500
    )
  }

  private async getUploadedFilenameElementByType(
    filename: string,
    fileType: UploadedFileType,
    baseElement: WebElement
  ): Promise<WebElement | undefined> {
    let filenameElement: WebElement | undefined = undefined
    switch (fileType) {
      case UploadedFileType.IMAGE:
        filenameElement = await this.getUploadedImageFilenameElement(filename, baseElement)
        break
      case UploadedFileType.FILE:
        filenameElement = await this.getUploadedFileFilenameElement(filename, baseElement)
        break
    }

    return filenameElement
  }

  private async getUploadedFileFilenameElement(
    filename: string,
    baseElement: WebElement
  ): Promise<WebElement | undefined> {
    try {
      const filenameComponentElement = await this.driver.wait(
        baseElement.findElement(By.xpath(`//*[@class='FileComponentfilename']`)),
        20_000,
        `Filename parent component for uploaded file ${filename} in channel ${this.name} couldn't be found within timeout`,
        500
      )
      const parsedPath = path.parse(filename)
      // this is split because we print the message as multiple lines and contains doesn't return true when searching the full filename
      const filenameElement = await this.driver.wait(
        filenameComponentElement.findElement(By.xpath(`//h5[contains(text(), "${parsedPath.name}")]`)),
        15_000,
        `Filename component with correct filename for uploaded file ${filename} in channel ${this.name} couldn't be found within timeout`,
        500
      )
      if ((await filenameElement.getText()) === filename) {
        return filenameElement
      }
    } catch (e) {
      if (!e.message.includes('no such element')) {
        throw e
      }
    }

    return undefined
  }

  private async getUploadedImageFilenameElement(
    filename: string,
    baseElement: WebElement
  ): Promise<WebElement | undefined> {
    try {
      const filenameElement = await this.driver.wait(
        baseElement.findElement(By.xpath(`//p[text()='${filename}']`)),
        15_000,
        `Filename component for uploaded image ${filename} in channel ${this.name} couldn't be found within timeout`,
        500
      )
      return filenameElement
    } catch (e) {
      if (!e.message.includes('no such element')) {
        throw e
      }
    }

    return undefined
  }

  get getAllMessages() {
    return this.driver.wait(
      until.elementsLocated(By.xpath('//*[contains(@data-testid, "userMessages-")]')),
      15_000,
      `All messages in channel ${this.name} couldn't be found within timeout`,
      500
    )
  }

  get element() {
    return this.driver.wait(
      until.elementLocated(By.xpath(`//p[@data-testid="${this.name}-link-text"]`)),
      60_000,
      `Link for channel ${this.name} couldn't be found within timeout`,
      500
    )
  }

  get messageInput() {
    return this.driver.wait(
      until.elementLocated(By.xpath('//*[@data-testid="messageInput"]')),
      15_000,
      `Message input for channel ${this.name} couldn't be found within timeout`,
      500
    )
  }

  get uploadFileInput() {
    return this.driver.wait(
      this.driver.findElement(By.xpath('//*[@data-testid="uploadFileInput"]')),
      15_000,
      `File upload button for channel ${this.name} couldn't be found within timeout`,
      500
    )
  }

  async sendMessage(message: string, username: string): Promise<MessageIds> {
    const sendMessageInput = await this.messageInput
    await sendMessageInput.sendKeys(message)
    await sendMessageInput.sendKeys(Key.ENTER)
    return this.getMessageIdsByText(message, username)
  }

  async uploadFile(
    filename: string,
    filePath: string,
    fileType: UploadedFileType,
    username: string
  ): Promise<MessageIds> {
    const uploadFileInput = await this.uploadFileInput
    await uploadFileInput.sendKeys(filePath)
    const sendMessageInput = await this.messageInput
    await sendMessageInput.sendKeys(Key.ENTER)
    return this.getMessageIdsByFile(filename, fileType, username)
  }

  async cancelFileDownload(messageIds: MessageIds): Promise<boolean> {
    try {
      const messageElement = await this.waitForMessageContentById(messageIds.messageId)
      let statusElement: WebElement | undefined = undefined
      try {
        statusElement = await this.waitForFileDownloadStatus(FileDownloadStatus.QUEUED, messageElement, 15_000)
      } catch (e) {
        logger.warn(
          `Couldn't find a queued status element for this file, this is likely because it is already downloading...`
        )
      }

      let endTime = DateTime.utc().toMillis() + 90_000
      while (DateTime.utc().toMillis() < endTime) {
        try {
          statusElement = await this.waitForFileDownloadStatus(FileDownloadStatus.DOWNLOADING, messageElement, 15_000)
          break
        } catch (e) {
          logger.warn(`Couldn't find status element with downloading status`)
        }

        try {
          statusElement = await this.waitForFileDownloadStatus(
            FileDownloadStatus.DOWNLOADING_CAN_CANCEL,
            messageElement,
            15_000
          )
          break
        } catch (e) {
          logger.warn(`Couldn't find status element with downloading cancelable status`)
        }
      }

      if (statusElement == null) {
        throw new Error(`File didn't start downloading within a reasonable time`)
      }

      await statusElement.click()
      endTime = DateTime.utc().toMillis() + 90_000
      while (DateTime.utc().toMillis() < endTime) {
        try {
          statusElement = await this.waitForFileDownloadStatus(FileDownloadStatus.CANCELED, messageElement, 15_000)
          break
        } catch (e) {
          logger.warn(`Couldn't find status element with canceled status`)
        }

        try {
          statusElement = await this.waitForFileDownloadStatus(FileDownloadStatus.DOWNLOAD_FILE, messageElement, 15_000)
          break
        } catch (e) {
          logger.warn(`Couldn't find status element with download file status`)
        }
      }
      return true
    } catch (e) {
      logger.error(`Error occurred while canceling download`, e)
      return false
    }
  }

  async getMessageIdsByText(message: string, username: string): Promise<MessageIds> {
    const messageElement = await this.waitForUserMessageByText(username, message)
    if (!messageElement) {
      throw logAndReturnError(`No message element found for message ${message}`)
    }

    let testId = await messageElement.getAttribute('data-testid')
    logger.info(`Data Test ID for message content: ${testId}`)
    let testIdSplit = testId.split('-')
    const parentMessageId = testIdSplit[testIdSplit.length - 1]

    const contentElement = await this.waitForMessageContentByText(message, messageElement)
    if (!contentElement) {
      throw logAndReturnError(`No message content element found for message content ${message}`)
    }

    testId = await contentElement.getAttribute('data-testid')
    logger.info(`Data Test ID for message content: ${testId}`)
    testIdSplit = testId.split('-')
    const messageId = testIdSplit[testIdSplit.length - 1]
    return {
      messageId,
      parentMessageId,
    }
  }

  async getMessageIdsByFile(filename: string, fileType: UploadedFileType, username: string): Promise<MessageIds> {
    const messageElement = await this.waitForUserMessageByFilename(username, filename, fileType)
    if (!messageElement) {
      throw logAndReturnError(`No message element found for filename ${filename}`)
    }

    let testId = await messageElement.getAttribute('data-testid')
    logger.info(`Data Test ID for (parent) message content: ${testId}`)
    let testIdSplit = testId.split('-')
    const parentMessageId = testIdSplit[testIdSplit.length - 1]

    const contentElement = await this.waitForMessageContentByFilename(filename, fileType, messageElement)
    if (!contentElement) {
      throw logAndReturnError(`No message content element found for filename ${filename}`)
    }

    testId = await contentElement.getAttribute('data-testid')
    logger.info(`Data Test ID for message content: ${testId}`)
    testIdSplit = testId.split('-')
    const messageId = testIdSplit[testIdSplit.length - 1]
    return {
      messageId,
      parentMessageId,
    }
  }

  async getMessageIdsByFileAndId(
    messageIds: MessageIds,
    filename: string,
    fileType: UploadedFileType,
    username: string
  ): Promise<MessageIds> {
    const messageElement = await this.waitForUserMessageByFilename(username, filename, fileType)
    if (!messageElement) {
      throw logAndReturnError(`No message element found for filename ${filename}`)
    }

    let testId = await messageElement.getAttribute('data-testid')
    logger.info(`Data Test ID for (parent) message content: ${testId}`)
    let testIdSplit = testId.split('-')
    const parentMessageId = testIdSplit[testIdSplit.length - 1]

    const contentElement = await this.waitForMessageContentByFilenameAndId(messageIds, filename, fileType)
    if (contentElement == null) {
      throw logAndReturnError(`No message content element found for filename ${filename}`)
    }

    testId = await contentElement.getAttribute('data-testid')
    logger.info(`Data Test ID for message content: ${testId}`)
    testIdSplit = testId.split('-')
    const messageId = testIdSplit[testIdSplit.length - 1]
    return {
      messageId,
      parentMessageId,
    }
  }

  async getUserMessages(username: string): Promise<WebElement[]> {
    return await this.driver.wait(
      until.elementsLocated(By.xpath(`//*[contains(@data-testid, "userMessages-${username}")]`)),
      15_000,
      `Messages for user ${username} in channel ${this.name} couldn't be found within timeout`,
      500
    )
  }

  async getUserMessagesFull(username: string): Promise<WebElement[]> {
    return await this.driver.wait(
      until.elementsLocated(By.xpath(`//*[contains(@data-testid, "userMessagesWrapper-${username}")]`)),
      15_000,
      `All messages for user ${username} in channel ${this.name} couldn't be found within timeout`,
      500
    )
  }

  async getAtleastNumUserMessages(username: string, num: number): Promise<WebElement[] | null> {
    return await this.driver.wait(
      async (): Promise<WebElement[] | null> => {
        const messages = await this.getUserMessages(username)
        return messages.length >= num ? messages : null
      },
      20_000,
      `At least ${num} messages for user ${username} in channel ${this.name} couldn't be found within timeout`,
      500
    )
  }

  async waitForLabel(username: string, label: string) {
    logger.info(`Waiting for user's "${username}" label "${label}" label`)
    await this.driver.wait(
      async () => {
        const labels = await this.driver.findElements(By.xpath(`//*[contains(@data-testid, "userLabel-${username}")]`))
        const properLabels = labels.filter(async labelElement => {
          const labelText = await labelElement.getText()
          return labelText === label
        })
        return properLabels.length > 0
      },
      15_000,
      `Message label ${label} for user ${username} in channel ${this.name} couldn't be found within timeout`,
      500
    )
  }

  async waitForAvatar(username: string, messageId: string): Promise<WebElement> {
    logger.info(`Waiting for user's avatar with username ${username} for message with ID ${messageId}`)
    const avatarElement = await this.driver.wait(
      this.driver.findElement(By.xpath(`//*[contains(@data-testid, "userAvatar-${username}-${messageId}")]`)),
      15_000,
      `Avatar for user ${username} in channel ${this.name} couldn't be found within timeout`,
      500
    )
    if (avatarElement) {
      logger.info(`Found user's avatar with username ${username} for message with ID ${messageId}`)
      return avatarElement
    }

    throw logAndReturnError(`Failed to find user's avatar with username ${username} for message with ID ${messageId}`)
  }

  async waitForDateLabel(username: string, messageId: string): Promise<WebElement> {
    logger.info(`Waiting for date for message with ID ${messageId}`)
    const dateElement = await this.driver.wait(
      this.driver.findElement(By.xpath(`//*[contains(@data-testid, "messageDateLabel-${username}-${messageId}")]`)),
      15_000,
      `Message date label for user ${username} in channel ${this.name} couldn't be found within timeout`,
      500
    )
    if (dateElement) {
      logger.info(`Found date label for message with ID ${messageId}`)
      return dateElement
    }

    throw logAndReturnError(`Failed to find date label for message with ID ${messageId}`)
  }

  async waitForMessageContentById(messageId: string): Promise<WebElement> {
    logger.info(`Waiting for content for message with ID ${messageId}`)
    const messageContentElement = await this.driver.wait(
      this.driver.findElement(By.xpath(`//*[contains(@data-testid, "messagesGroupContent-${messageId}")]`)),
      15_000,
      `Message content element for message ID ${messageId} in channel ${this.name} couldn't be found within timeout`,
      500
    )
    if (messageContentElement) {
      logger.info(`Found content for message with ID ${messageId}`)
      return messageContentElement
    }

    throw logAndReturnError(`Failed to find content for message with ID ${messageId}`)
  }

  async waitForMessageContentByText(messageContent: string, messageElement: WebElement): Promise<WebElement> {
    logger.info(`Waiting for content for message with text ${messageContent}`)
    const messageContentElements = await this.driver.wait(
      messageElement.findElements(By.xpath(`//*[contains(@data-testid, "messagesGroupContent-")]`)),
      15_000,
      `Message content element for text ${messageContent} in channel ${this.name} couldn't be found within timeout`,
      500
    )
    for (const element of messageContentElements) {
      logger.info(await element.getId())
      const text = await element.getText()
      logger.info(`Testing content: ${messageContent}`)
      if (text.includes(messageContent)) {
        logger.info(`Found content element for message with text ${messageContent}`)
        return element
      }
    }

    throw logAndReturnError(`Failed to find content for message with content ${messageContent}`)
  }

  async waitForMessageContentByFilename(
    filename: string,
    fileType: UploadedFileType,
    messageElement: WebElement
  ): Promise<WebElement> {
    logger.info(`Waiting for file content for message with filename ${filename} and type ${fileType}`)
    await this.getUploadedFilenameElementByType(filename, fileType, messageElement)
    const messageContentElements = await this.driver.wait(
      messageElement.findElements(By.xpath(`//*[contains(@data-testid, "messagesGroupContent-")]`)),
      45_000,
      `Message content element for filename ${filename} in channel ${this.name} couldn't be found within timeout`,
      500
    )

    for (const element of messageContentElements) {
      const result = await this.testContentByFilename(filename, fileType, element)
      if (result != null) {
        return result
      }
    }

    throw logAndReturnError(`Failed to find content for message with filename ${filename} and type ${fileType}`)
  }

  async waitForMessageContentByFilenameAndId(
    messageIds: MessageIds,
    filename: string,
    fileType: UploadedFileType
  ): Promise<WebElement> {
    logger.info(
      `Waiting for file content for message with filename ${filename} and type ${fileType} and ID ${messageIds.messageId}`
    )
    const messageContentElement = await this.waitForMessageContentById(messageIds.messageId)
    await this.getUploadedFilenameElementByType(filename, fileType, messageContentElement)
    const result = await this.testContentByFilename(filename, fileType, messageContentElement)
    if (result != null) {
      return result
    }

    throw logAndReturnError(`Failed to find content for message with filename ${filename} and type ${fileType}`)
  }

  // class="UploadedImagePlaceholderplaceholderIcon"
  // class="UploadedImagePlaceholderplaceholder"

  private async testContentByFilename(
    filename: string,
    fileType: UploadedFileType,
    testableMessageContentElement: WebElement
  ): Promise<WebElement | undefined> {
    logger.info(`Testing content for type ${fileType}`)
    let containerElements: WebElement[] = []
    switch (fileType) {
      case UploadedFileType.IMAGE:
        // wait for the downloading placeholder to appear and then disappear
        try {
          const placeholderElement = await this.driver.wait(
            this.driver.findElement(By.xpath(`//*[@class='UploadedImagePlaceholderplaceholder']`)),
            10_000,
            `Image placeholder element for ${filename} in channel ${this.name} couldn't be found within timeout`,
            500
          )
          await this.driver.wait(
            until.elementIsNotVisible(placeholderElement),
            30_000,
            `Image placeholder element for ${filename} in channel ${this.name} didn't disappear within timeout`,
            500
          )
        } catch (e) {
          logger.warn(
            `The image placeholder element never became visible, this is likely because the download completed too quickly...`
          )
        }

        containerElements = await this.driver.wait(
          testableMessageContentElement.findElements(By.xpath(`//*[@class='UploadedImagecontainer']`)),
          15_000,
          `Image container elements in channel ${this.name} couldn't be found within timeout`,
          500
        )
        break
      case UploadedFileType.FILE:
        containerElements = await this.driver.wait(
          testableMessageContentElement.findElements(By.xpath(`//*[contains(@data-testid, "-fileComponent")]`)),
          15_000,
          `File container elements for ${filename} in channel ${this.name} couldn't be found within timeout`,
          500
        )
        break
    }

    for (const container of containerElements) {
      logger.info(`Testing uploaded file container ${await container.getId()}`)
      const filenameElement = await this.getUploadedFilenameElementByType(filename, fileType, container)
      if (filenameElement == null) {
        continue
      }

      let contentElement: WebElement | undefined = undefined
      switch (fileType) {
        case UploadedFileType.IMAGE:
          contentElement = await this.driver.wait(
            container.findElement(By.xpath(`//img[@class='UploadedImageimage']`)),
            15_000,
            `Image element for ${filename} in channel ${this.name} couldn't be found within timeout`,
            500
          )
          break
        case UploadedFileType.FILE:
          contentElement = await this.driver.wait(
            container.findElement(By.xpath(`//img[@class='FileComponentactionIcon']`)),
            15_000,
            `File element for ${filename} in channel ${this.name} couldn't be found within timeout`,
            500
          )
          break
      }

      if (contentElement != null) {
        await this.driver.wait(
          until.elementIsVisible(contentElement),
          30_000,
          `Image/file content element for ${filename} in channel ${this.name} couldn't be seen within timeout`,
          500
        )
        logger.info(`Found content element for message with filename ${filename} and type ${fileType}`)
        return testableMessageContentElement
      }
    }

    return undefined
  }

  async waitForFileDownloadStatus(
    status: FileDownloadStatus,
    messageElement: WebElement,
    timeoutMs = 45_000
  ): Promise<WebElement> {
    let locatorString: string | undefined = undefined
    switch (status) {
      case FileDownloadStatus.QUEUED:
        locatorString = 'Queued for download'
        break
      case FileDownloadStatus.DOWNLOADING:
        locatorString = 'Downloading...'
        break
      case FileDownloadStatus.DOWNLOADING_CAN_CANCEL:
        locatorString = 'Cancel download'
        break
      case FileDownloadStatus.COMPLETED:
        locatorString = 'Show in folder'
        break
      case FileDownloadStatus.CANCELED:
        locatorString = 'Canceled'
        break
      case FileDownloadStatus.DOWNLOAD_FILE:
        locatorString = 'Download file'
        break
      default:
        throw new Error(`Unknown status type ${status}`)
    }
    return await this.driver.wait(
      messageElement.findElement(By.xpath(`//p[text()='${locatorString!}']`)),
      timeoutMs,
      `File download status element with text ${locatorString} in channel ${this.name} couldn't be found within timeout`,
      500
    )
  }

  async waitForLabelsNotPresent(username: string) {
    logger.info(`Waiting for user's "${username}" label to not be present`)
    await this.driver.wait(
      async () => {
        const labels = await this.driver.findElements(By.xpath(`//*[contains(@data-testid, "userLabel-${username}")]`))
        return labels.length === 0
      },
      15_000,
      `User name label ${username} in channel ${this.name} didn't disappear within timeout`,
      500
    )
  }

  async getMessage(text: string) {
    return await this.driver.wait(
      until.elementLocated(By.xpath(`//span[contains(text(),"${text}")]`)),
      15_000,
      `Message with text ${text} in channel ${this.name} couldn't be found within timeout`,
      500
    )
  }
}

export class Sidebar {
  private readonly driver: ThenableWebDriver
  constructor(driver: ThenableWebDriver) {
    this.driver = driver
  }

  async getChannelList() {
    const channels = await this.driver.wait(
      this.driver.findElements(By.xpath('//*[contains(@data-testid, "link-text")]')),
      15_000,
      `Sidebar channel list couldn't be found within timeout`,
      500
    )
    return channels
  }

  /**
   * Get names of all channels in the sidebar
   */
  async getChannelsNames() {
    const elements = await this.getChannelList()
    return Promise.all(
      elements.map(async element => {
        const fullName = await element.getText()
        return fullName.split(' ')[1]
      })
    )
  }

  async waitForChannelsNum(num: number) {
    logger.info(`Waiting for ${num} channels`)
    return this.driver.wait(
      async () => {
        const channels = await this.getChannelList()
        return channels.length === num
      },
      15_000,
      `Sidebar channel list length couldn't be determined within timeout`,
      500
    )
  }

  async waitForChannels(channelsNames: Array<string>) {
    await this.waitForChannelsNum(channelsNames.length)
    const names = await this.getChannelsNames()
    expect(names).toEqual(expect.arrayContaining(channelsNames))
  }

  async openSettings(): Promise<Settings> {
    const button = await this.driver.wait(
      this.driver.findElement(By.xpath('//span[@data-testid="settings-panel-button"]')),
      10_000,
      `Community settings button couldn't be found within timeout`,
      500
    )
    await button.click()
    return new Settings(this.driver)
  }

  async switchChannel(name: string): Promise<Channel> {
    const channelLink = await this.driver.wait(
      until.elementLocated(By.xpath(`//div[@data-testid="${name}-link"]`)),
      10_000,
      `Channel link button for ${name} couldn't be found within timeout`,
      500
    )
    await channelLink.click()
    const channel = new Channel(this.driver, name)
    await channel.isOpen()
    return channel
  }

  async addNewChannel(name: string): Promise<Channel> {
    const button = await this.driver.wait(
      this.driver.findElement(By.xpath('//button[@data-testid="addChannelButton"]')),
      5_000,
      `Add channel button couldn't be found within timeout`,
      500
    )
    await button.click()
    const channelNameInput = await this.driver.wait(
      this.driver.findElement(By.xpath('//input[@name="channelName"]')),
      5_000,
      `Add channel name input field couldn't be found within timeout`,
      500
    )
    await channelNameInput.sendKeys(name)
    const channelNameButton = await this.driver.wait(
      this.driver.findElement(By.xpath('//button[@data-testid="channelNameSubmit"]')),
      5_000,
      `Add channel submit button couldn't be found within timeout`,
      500
    )
    await channelNameButton.click()
    return new Channel(this.driver, name)
  }
}

export class UpdateModal {
  private readonly driver: ThenableWebDriver
  constructor(driver: ThenableWebDriver) {
    this.driver = driver
  }

  get element() {
    logger.info('Waiting for update modal root element')
    return this.driver.wait(
      until.elementLocated(By.xpath("//h3[text()='Software update']/ancestor::div[contains(@class,'MuiModal-root')]")),
      15_000,
      `Update modal couldn't be found within timeout`,
      500
    )
  }

  async close() {
    const updateModalRootElement = await this.element
    logger.info('Found update modal root element')
    const closeButton = await this.driver.wait(
      updateModalRootElement.findElement(By.xpath("//*[self::div[@data-testid='ModalActions']]/button")),
      10_000,
      `Update modal close button couldn't be found within timeout`,
      500
    )

    try {
      logger.info('Before clicking update modal close button')
      await closeButton.click()
      return
    } catch (e) {
      logger.error('Error while clicking close button on update modal', e)
    }

    try {
      const log = await this.driver.executeScript('arguments[0].click();', closeButton)
      logger.info('executeScript', log)
    } catch (e) {
      logger.warn('Probably clicked hidden close button on update modal')
    }
  }
}
export class Settings {
  private readonly driver: ThenableWebDriver
  constructor(driver: ThenableWebDriver) {
    this.driver = driver
  }

  get element() {
    return this.driver.wait(
      until.elementLocated(By.xpath("//p[text()='Community Settings']")),
      15_000,
      `Settings modal couldn't be found within timeout`,
      500
    )
  }

  async isReady(): Promise<boolean> {
    await this.driver.wait(
      until.elementIsVisible(this.element),
      10_000,
      `Settings modal wasn't ready within timeout`,
      500
    )
    return true
  }

  async getVersion() {
    await this.switchTab(SettingsModalTabName.ABOUT)
    const textWebElement = await this.driver.wait(
      this.driver.findElement(By.xpath('//p[contains(text(),"Version")]')),
      10_000,
      `App version couldn't be found within timeout`,
      500
    )
    const text = await textWebElement.getText()

    const version = this.formatVersionText(text)

    return version
  }

  private formatVersionText(text: string) {
    const index1 = text.indexOf(':') + 1
    const index2 = text.indexOf('\n')
    const version = text.slice(index1, index2).trim()
    return version
  }

  async openLeaveCommunityModal() {
    await this.switchTab(SettingsModalTabName.LEAVE_COMMUNITY)
  }

  async leaveCommunityButton() {
    const button = await this.driver.wait(
      until.elementLocated(By.xpath('//button[text()="Leave community"]')),
      15_000,
      `Leave community button couldn't be found within timeout`,
      500
    )
    await button.click()
  }

  async switchTab(name: SettingsModalTabName) {
    const tab = await this.driver.wait(
      this.driver.findElement(By.xpath(`//div[@data-testid='${name}-settings-tab']`)),
      15_000,
      `Settings tab button for ${name} couldn't be found within timeout`,
      500
    )
    await tab.click()
    await this.waitForTabToBeReady(name)
  }

  async invitationLink() {
    const unlockButton = await this.driver.wait(
      until.elementLocated(By.xpath('//button[@data-testid="show-invitation-link"]')),
      10_000,
      `Show invitation link button couldn't be found within timeout`,
      500
    )
    await this.driver.wait(until.elementIsVisible(unlockButton), 10_000)

    await unlockButton.click()

    return await this.driver.wait(
      this.driver.findElement(By.xpath("//p[@data-testid='invitation-link']")),
      10_000,
      `Unhidden invitation link element couldn't be found within timeout`,
      500
    )
  }

  async closeTabThenModal() {
    await this.closeTab()
    await this.close()
  }

  async close() {
    const closeButton = await this.driver.wait(
      this.driver.findElement(By.xpath('//div[@data-testid="close-settings-button"]')),
      10_000,
      `Settings close button couldn't be found within timeout`,
      500
    )
    await closeButton.click()
  }

  async closeTab() {
    const closeTabButton = await this.driver.wait(
      this.driver.findElement(By.xpath('//div[@data-testid="close-tab-button-box"]')).findElement(By.css('button')),
      10_000,
      `Settings tab close button couldn't be found within timeout`,
      500
    )
    await closeTabButton.click()
  }

  private async waitForTabToBeReady(tabName: SettingsModalTabName) {
    let locator: string | undefined = undefined
    switch (tabName) {
      case SettingsModalTabName.INVITE:
        locator = "//*[@data-testid='invite-a-friend']"
        break
      case SettingsModalTabName.ABOUT:
        locator = "//div[contains(@class, 'Abouttitle')]"
        break
      case SettingsModalTabName.LEAVE_COMMUNITY:
        locator = "//div[contains(@class, 'LeaveCommunitytitleContainer')]"
        break
      case SettingsModalTabName.NOTIFICATIONS:
        locator = "//div[contains(@class, 'Notificationstitle')]"
        break
      case SettingsModalTabName.QR_CODE:
        locator = "//div[contains(@class, 'QRCodetextWrapper')]"
        break
      default:
        throw new Error(`Can't wait for unknown tab ${tabName}`)
    }

    const result = await this.driver.wait(
      this.driver.findElement(By.xpath(locator!)),
      15_000,
      `Settings tab ${tabName} wasn't ready within timeout`,
      500
    )
    await this.driver.wait(
      until.elementIsVisible(result),
      10_000,
      `Settings tab ${tabName} wasn't visible within timeout`,
      500
    )
  }
}

export class DebugModeModal {
  private readonly driver: ThenableWebDriver
  constructor(driver: ThenableWebDriver) {
    this.driver = driver
    logger.info('Debug modal')
  }

  get element() {
    return this.driver.wait(
      until.elementLocated(By.xpath("//h3[text()='App is running in debug mode']")),
      5000,
      `Debug modal couldn't be found within timeout`,
      500
    )
  }

  get button() {
    return this.driver.wait(
      until.elementLocated(By.xpath("//button[text()='Understand']")),
      5000,
      `Debug modal understand button couldn't be found within timeout`,
      500
    )
  }

  async close() {
    if (!process.env.TEST_MODE) return
    let button
    try {
      logger.info('Closing debug modal')
      await this.driver.wait(
        until.elementIsVisible(this.element),
        15_000,
        `Debug modal couldn't be seen within timeout`,
        500
      )
      logger.info('Debug modal title is displayed')
      button = await this.button
      logger.info('Debug modal button is displayed')
    } catch (e) {
      logger.error('Debug modal might have been covered by "join community" modal', e)
      return
    }

    await button.isDisplayed()
    logger.info('Button is displayed')
    await button.click()
    logger.info('Button click')
    try {
      const log = await this.driver.executeScript('arguments[0].click();', button)
      logger.info('executeScript', log)
    } catch (e) {
      logger.warn('Probably clicked hidden close button on debug modal')
    }
    await sleep(2000)
  }
}
