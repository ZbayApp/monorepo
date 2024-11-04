import React from 'react'
import '@testing-library/jest-dom/extend-expect'
import { act } from 'react-dom/test-utils'
import { screen } from '@testing-library/dom'
import { apply, take } from 'typed-redux-saga'
import userEvent from '@testing-library/user-event'
import MockedSocket from 'socket.io-mock'
import { ioMock } from '../shared/setupTests'
import { socketEventData } from '@quiet/types'
import { renderComponent } from '../renderer/testUtils/renderComponent'
import { prepareStore } from '../renderer/testUtils/prepareStore'
import Channel from '../renderer/components/Channel/Channel'
import ChannelInputComponent from '../renderer/components/widgets/channels/ChannelInput/ChannelInput'
import { AnyAction } from 'redux'
import {
  identity,
  communities,
  publicChannels,
  getFactory,
  messages,
  files,
  AUTODOWNLOAD_SIZE_LIMIT,
  network,
  connection,
  generateMessageFactoryContentWithId,
} from '@quiet/state-manager'
import {
  SocketActionTypes,
  ChannelMessage,
  SendingStatus,
  MessageType,
  FileMetadata,
  DownloadFilePayload,
  InitCommunityPayload,
  UploadFilePayload,
  FileContent,
  DownloadState,
  SendMessagePayload,
  MessageVerificationStatus,
  DownloadStatus,
  type MessagesLoadedPayload,
  ResponseLaunchCommunityPayload,
  Community,
} from '@quiet/types'
import { keyFromCertificate, parseCertificate } from '@quiet/identity'

import { fetchingChannelMessagesText } from '../renderer/components/widgets/channels/ChannelMessages'
import { DateTime } from 'luxon'

jest.setTimeout(20_000)

const notification = jest.fn().mockImplementation(() => {
  return jest.fn()
})
// @ts-expect-error
window.Notification = notification

jest.mock('electron', () => {
  return {
    ipcRenderer: { on: () => {}, send: jest.fn(), sendSync: jest.fn() },
    remote: {
      BrowserWindow: {
        getAllWindows: () => {
          return [
            {
              show: jest.fn(),
              isFocused: jest.fn(),
            },
          ]
        },
      },
    },
  }
})

jest.mock('../shared/sounds', () => ({
  ...jest.requireActual('../shared/sounds'),
  soundTypeToAudio: {
    pow: {
      play: jest.fn(),
    },
  },
}))

describe('Channel', () => {
  let socket: MockedSocket

  beforeEach(() => {
    socket = new MockedSocket()
    ioMock.mockImplementation(() => socket)
    window.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }))
  })

  it("causes no error if there's no data yet", async () => {
    const { store } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <Channel />
      </>,
      store
    )
  })

  it('displays properly on app (re)start', async () => {
    const { store } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    const factory = await getFactory(store)

    // const community = await factory.create<
    // ReturnType<typeof communitiesActions.addNewCommunity>['payload']
    // >('Community')

    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      nickname: 'alice',
    })

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <Channel />
      </>,
      store
    )

    const channelName = screen.getByText('#general')
    expect(channelName).toBeVisible()

    const messageInput = screen.getByPlaceholderText(`Message #general as @${alice.nickname}`)
    expect(messageInput).toBeVisible()
  })

  it('filters out suspicious messages', async () => {
    const { store, runSaga } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    const factory = await getFactory(store)

    const community =
      await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community')

    const entities = store.getState().PublicChannels.channels.entities

    const generalId = Object.keys(entities).find(key => entities[key]?.name === 'general')
    expect(generalId).not.toBeUndefined()

    await act(async () => {
      store.dispatch(
        publicChannels.actions.setCurrentChannel({
          // @ts-expect-error
          channelId: generalId,
        })
      )
    })

    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'alice',
    })

    const john = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'john',
    })
    expect(john.userCertificate).not.toBeNull()
    // @ts-expect-error
    const johnPublicKey = keyFromCertificate(parseCertificate(john.userCertificate))

    const authenticMessage: ChannelMessage = {
      ...(
        await factory.build<typeof publicChannels.actions.test_message>('Message', {
          identity: alice,
          message: {
            id: Math.random().toString(36).substr(2.9),
            type: MessageType.Basic,
            message: 'authenticMessage',
            createdAt: DateTime.utc().valueOf(),
            channelId: generalId,
            signature: '',
            pubKey: '',
          },
        })
      ).payload.message,
    }

    const spoofedMessage: ChannelMessage = {
      ...(
        await factory.build<typeof publicChannels.actions.test_message>('Message', {
          identity: alice,
          message: {
            id: Math.random().toString(36).substr(2.9),
            type: MessageType.Basic,
            message: 'spoofedMessage',
            createdAt: DateTime.utc().valueOf(),
            channelId: generalId,
            signature: '',
            pubKey: johnPublicKey,
          },
        })
      ).payload.message,
    }

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <Channel />
      </>,
      store
    )

    await act(async () => {
      await runSaga(mockIncomingMessages).toPromise()
    })

    // Verified message is shown
    const persistedMessage = await screen.findByText(authenticMessage.message)
    expect(persistedMessage).toBeVisible()

    // Spoofed message doesn't exist
    expect(screen.queryByText(spoofedMessage.message)).toBeNull()

    function* mockIncomingMessages(): Generator {
      yield* apply(socket.socketClient, socket.socketClient.emit, [
        SocketActionTypes.MESSAGES_STORED,
        {
          messages: [authenticMessage],
          communityId: community.id,
          isVerified: true,
        },
      ])
      yield* apply(socket.socketClient, socket.socketClient.emit, [
        SocketActionTypes.MESSAGES_STORED,
        {
          messages: [spoofedMessage],
          communityId: community.id,
          isVerified: false,
        },
      ])
    }
  })

  it('validates and displays persisted messages even if verification status cache is invalid', async () => {
    const { store, runSaga } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    const factory = await getFactory(store)

    const community =
      await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community')

    const entities = store.getState().PublicChannels.channels.entities

    const generalId = Object.keys(entities).find(key => entities[key]?.name === 'general')

    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'alice',
    })

    const aliceMessage = (
      await factory.build<typeof publicChannels.actions.test_message>('Message', {
        identity: alice,
        message: {
          id: Math.random().toString(36).substr(2.9),
          type: MessageType.Basic,
          message: 'message',
          createdAt: DateTime.utc().valueOf(),
          channelId: generalId,
          signature: '',
          pubKey: '',
        },
      })
    ).payload.message

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <Channel />
      </>,
      store
    )

    await act(async () => {
      await runSaga(mockIncomingMessages).toPromise()
    })

    // Mssage is shown
    const persistedMessage = await screen.findByText(aliceMessage.message)
    expect(persistedMessage).toBeVisible()

    function* mockIncomingMessages(): Generator {
      yield* apply(socket.socketClient, socket.socketClient.emit, [
        SocketActionTypes.MESSAGES_STORED,
        {
          messages: [aliceMessage],
          communityId: community.id,
          isVerified: true,
        },
      ])
    }
  })

  it("displays messages loading spinner if there's no messages", async () => {
    const { store } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    const factory = await getFactory(store)

    const community =
      await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community')
    await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'john',
    })

    renderComponent(
      <>
        <Channel />
      </>,
      store
    )

    // Confirm there are no messages to display
    const messages = publicChannels.selectors.currentChannelMessagesMergedBySender(store.getState())
    expect(Object.values(messages).length).toBe(0)

    // Verify loading spinner is visible
    const spinner = screen.getByText(fetchingChannelMessagesText)
    expect(spinner).toBeVisible()
  })

  it("doesn't display messages loading spinner if there's at least one message", async () => {
    const { store } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    const factory = await getFactory(store)

    const community =
      await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community')

    const entities = store.getState().PublicChannels.channels.entities

    const generalId = Object.keys(entities).find(key => entities[key]?.name === 'general')
    expect(generalId).not.toBeUndefined()

    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'alice',
    })

    await factory.create<ReturnType<typeof publicChannels.actions.test_message>['payload']>('Message', {
      identity: alice,
      // @ts-expect-error
      message: generateMessageFactoryContentWithId(generalId),
      verifyAutomatically: true,
    })

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <Channel />
      </>,
      store
    )

    await act(async () => {})

    // Confirm there are messages to display
    expect(Object.values(publicChannels.selectors.currentChannelMessagesMergedBySender(store.getState())).length).toBe(
      1
    )

    // Verify loading spinner is not visible
    const spinner = await screen.queryByText(fetchingChannelMessagesText)
    expect(spinner).toBeNull()
  })

  it('immediately display greyed out message after sending, then turn it black when saved to db', async () => {
    const { store, runSaga } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    const factory = await getFactory(store)

    const community =
      await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community')

    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'alice',
    })

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <Channel />
      </>,
      store
    )

    const messageText = 'Hello!'

    store.dispatch(messages.actions.sendMessage({ message: messageText }))

    await act(async () => {})

    // Get sent message for further assertions
    const sentMessage = publicChannels.selectors.currentChannelMessages(store.getState())[0]

    // Confirm message has been stored immediately
    const displayableMessages = publicChannels.selectors.currentChannelMessagesMergedBySender(store.getState())
    expect(Object.values(displayableMessages).length).toBe(1)

    // Verify message status is 'pending'
    expect(messages.selectors.messagesSendingStatus(store.getState())[sentMessage.id]?.status).toBe(
      SendingStatus.Pending
    )

    // Verify message is greyed out
    expect(await screen.findByText(messageText)).toHaveStyle('color:#B2B2B2')

    // Update message sending status
    store.dispatch(
      messages.actions.addMessages({
        messages: [sentMessage],
      })
    )

    await act(async () => {
      await runSaga(mockIncomingMessages).toPromise()
    })

    function* mockIncomingMessages(): Generator {
      yield* apply(socket.socketClient, socket.socketClient.emit, [
        SocketActionTypes.MESSAGES_STORED,
        {
          messages: [sentMessage],
          communityId: community.id,
        },
      ])
    }

    // Confirm 'pending' message status has been removed
    expect(messages.selectors.messagesSendingStatus(store.getState())[sentMessage.id]).toBe(undefined)

    // Confirm message is no longer greyed out
    expect(await screen.findByText(messageText)).toBeVisible()
    expect(await screen.findByText(messageText)).not.toHaveStyle('color:#B2B2B2')
  })

  it("shows incoming message if it's not older than oldest message, and isn't the newest one", async () => {
    const { store, runSaga } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    const factory = await getFactory(store)

    const community =
      await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community')

    const entities = store.getState().PublicChannels.channels.entities

    const generalId = Object.keys(entities).find(key => entities[key]?.name === 'general')

    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'alice',
    })

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <Channel />
      </>,
      store
    )

    const messagesText = ['message1', 'message2', 'message3']
    const messages: ChannelMessage[] = []

    for (const msg of messagesText) {
      const message = (
        await factory.build<typeof publicChannels.actions.test_message>('Message', {
          identity: alice,
          message: {
            id: Math.random().toString(36).substr(2.9),
            type: MessageType.Basic,
            message: msg,
            createdAt: messagesText.indexOf(msg) + 1,
            channelId: generalId,
            signature: '',
            pubKey: '',
          },
        })
      ).payload.message
      messages.push(message)
    }

    const [message1, message2, message3] = messages

    await act(async () => {
      await runSaga(mockIncomingMessages).toPromise()
    })

    function* mockIncomingMessages(): Generator {
      yield* apply(socket.socketClient, socket.socketClient.emit, [
        SocketActionTypes.MESSAGES_STORED,
        {
          messages: [message1],
          communityId: community.id,
          isVerified: true,
        },
      ])
      yield* apply(socket.socketClient, socket.socketClient.emit, [
        SocketActionTypes.MESSAGES_STORED,
        {
          messages: [message3],
          communityId: community.id,
          isVerified: true,
        },
      ])
      yield* apply(socket.socketClient, socket.socketClient.emit, [
        SocketActionTypes.MESSAGES_STORED,
        {
          messages: [message2],
          communityId: community.id,
          isVerified: true,
        },
      ])
    }

    expect(await screen.findByText(message1.message)).toBeVisible()
    expect(await screen.findByText(message2.message)).toBeVisible()
    expect(await screen.findByText(message3.message)).toBeVisible()
  })

  // TODO: https://github.com/TryQuiet/monorepo/issues/530
  it.skip('allow to type and send message if community is initialized', async () => {
    const { store, runSaga } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    const factory = await getFactory(store)

    const community =
      await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community')

    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'alice',
    })

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <Channel />
      </>,
      store
    )

    await act(async () => {
      store.dispatch(network.actions.addInitializedCommunity(community.id))
    })

    // Log all the dispatched actions in order
    const actions: AnyAction[] = []
    runSaga(function* (): Generator {
      while (true) {
        const action = yield* take()
        actions.push(action.type)
      }
    })

    const messageInput = screen.getByPlaceholderText(`Message #general as @${alice.nickname}`)

    // This input loses the first letter, hence the next assertion looks for a string without that.
    await userEvent.type(messageInput, 'hhello')

    const isTextVisible = screen.getByText('hello')

    expect(isTextVisible).toBeTruthy()

    await userEvent.type(messageInput, '{enter}')

    // sendMessage action trigger
    expect(actions).toMatchInlineSnapshot()
  })

  it('renders a multi-line message', async () => {
    renderComponent(
      <ChannelInputComponent
        channelId={'channelId'}
        channelName={'channelName'}
        inputPlaceholder='#channel as @user'
        onChange={jest.fn()}
        onKeyPress={jest.fn()}
        infoClass={''}
        setInfoClass={jest.fn()}
        openFilesDialog={jest.fn()}
        handleOpenFiles={jest.fn()}
        handleClipboardFiles={jest.fn()}
      />
    )

    const messageInput = screen.getByTestId('messageInput')

    await userEvent.type(messageInput, 'multi-line{Shift>}{Enter}{/Shift}message{Shift>}{Enter}{/Shift}hello')
    expect(messageInput.textContent).toBe('multi-line\nmessage\nhello')
  })

  // TODO the userEvent.type doesn't setup the input text node children like the app does,
  // so this test, as written, fails.
  it.skip('traverses a multi-line message it with arrow keys', async () => {
    renderComponent(
      <ChannelInputComponent
        channelId={'channelId'}
        channelName={'channelName'}
        inputPlaceholder='#channel as @user'
        onChange={jest.fn()}
        onKeyPress={jest.fn()}
        infoClass={''}
        setInfoClass={jest.fn()}
        openFilesDialog={jest.fn()}
        handleOpenFiles={jest.fn()}
        handleClipboardFiles={jest.fn()}
      />
    )

    const messageInput = screen.getByTestId('messageInput')

    // TODO Why does the first letter not get entered?
    // Test where the starting caret is
    await userEvent.type(messageInput, 'mmulti-line{Shift>}{Enter}{/Shift}message{Shift>}{Enter}{/Shift}hello')
    expect(window?.getSelection()?.anchorNode?.nodeValue).toBe('hello')
    expect(window?.getSelection()?.anchorOffset).toBe(5)

    // Test where the caret is after an Arrow Up
    await userEvent.keyboard('{ArrowLeft>3/}')
    expect(window?.getSelection()?.anchorOffset).toBe(2)
    await userEvent.keyboard('{ArrowUp}')
    expect(window?.getSelection()?.anchorNode?.nodeValue).toBe('message')
    expect(window?.getSelection()?.anchorOffset).toBe(2)
    await userEvent.keyboard('{ArrowUp}')
    expect(window?.getSelection()?.anchorNode?.nodeValue).toBe('multi-line')
    expect(window?.getSelection()?.anchorOffset).toBe(2)
    await userEvent.keyboard('{ArrowUp}')
    expect(window?.getSelection()?.anchorNode?.nodeValue).toBe('multi-line')
    expect(window?.getSelection()?.anchorOffset).toBe(0)

    // Test where the caret is after an Arrow Down
    await userEvent.keyboard('{ArrowRight>3/}')
    expect(window?.getSelection()?.anchorOffset).toBe(3)
    await userEvent.keyboard('{ArrowDown}')
    expect(window?.getSelection()?.anchorNode?.nodeValue).toBe('message')
    expect(window?.getSelection()?.anchorOffset).toBe(3)
    await userEvent.keyboard('{ArrowDown}')
    expect(window?.getSelection()?.anchorNode?.nodeValue).toBe('hello')
    expect(window?.getSelection()?.anchorOffset).toBe(3)
    await userEvent.keyboard('{ArrowDown}')
    expect(window?.getSelection()?.anchorNode?.nodeValue).toBe('hello')
    expect(window.getSelection()?.anchorOffset).toBe(5)
  })

  it("doesn't allow to type and send message if community is not initialized", async () => {
    const { store, runSaga } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    const factory = await getFactory(store)

    const community =
      await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community')

    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'alice',
    })

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <Channel />
      </>,
      store
    )

    // Log all the dispatched actions in order
    const actions: AnyAction[] = []
    runSaga(function* (): Generator {
      while (true) {
        const action = yield* take()
        actions.push(action.type)
      }
    })

    const infoMessage = screen.getByText('Initializing community. This may take a few minutes...')
    expect(infoMessage).toBeVisible()

    const messageInput = screen.getByPlaceholderText(`Message #general as @${alice.nickname}`)

    // This input loses the first letter, hence the next assertion looks for a string without that.
    await userEvent.type(messageInput, 'hhello')

    expect(await screen.queryByText('hello')).toBeNull()

    await userEvent.type(messageInput, '{enter}')

    // sendMessage action does not trigger
    expect(actions).toMatchInlineSnapshot(`Array []`)
  })

  it('immediately shows uploaded image', async () => {
    const initialState = (await prepareStore()).store

    const factory = await getFactory(initialState)

    const community =
      await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community')

    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'alice',
    })

    initialState.dispatch(
      communities.actions.updateCommunityData({
        id: community.id,
        // null/undefined type mismatch here. Might make things easier
        // to make it consistent.
        ownerCertificate: alice.userCertificate || undefined,
      })
    )

    let cid = ''

    const uploadingDelay = 100

    const mockEmitImpl = async (...input: [SocketActionTypes, ...socketEventData<[any]>]) => {
      const action = input[0]
      if (action === SocketActionTypes.LAUNCH_COMMUNITY) {
        const data = input[1] as InitCommunityPayload
        const payload = data
        return socket.socketClient.emit<ResponseLaunchCommunityPayload>(SocketActionTypes.COMMUNITY_LAUNCHED, {
          id: payload.id,
        })
      }
      if (action === SocketActionTypes.UPLOAD_FILE) {
        const data = input[1] as UploadFilePayload
        const payload = data

        cid = `uploading_${payload.file.message.id}`

        await new Promise(resolve => {
          setTimeout(resolve, uploadingDelay)
        })

        socket.socketClient.emit<FileMetadata>(SocketActionTypes.FILE_UPLOADED, {
          ...payload.file,
          cid: cid,
          path: null,
          width: 100,
          height: 100,
          size: AUTODOWNLOAD_SIZE_LIMIT - 2048,
        })
        return socket.socketClient.emit<DownloadStatus>(SocketActionTypes.DOWNLOAD_PROGRESS, {
          mid: payload.file.message.id,
          cid: cid,
          downloadState: DownloadState.Hosted,
        })
      }
      if (action === SocketActionTypes.SEND_MESSAGE) {
        const data = input[1] as SendMessagePayload
        const payload = data
        return socket.socketClient.emit<MessagesLoadedPayload>(SocketActionTypes.MESSAGES_STORED, {
          messages: [payload.message],
        })
      }
      if (action === SocketActionTypes.MESSAGES_STORED) {
        const data = input[1] as MessagesLoadedPayload
        const media = data.messages[0].media
        if (!media) return
        return socket.socketClient.emit<UploadFilePayload>(SocketActionTypes.UPLOAD_FILE, {
          file: media,
          peerId: alice.peerId.id,
        })
      }
    }

    jest.spyOn(socket, 'emit').mockImplementation(mockEmitImpl)
    // @ts-ignore
    socket.emitWithAck = mockEmitImpl

    const { store, runSaga } = await prepareStore(
      initialState.getState(),
      socket // Fork state manager's sagas
    )

    const fileContent: FileContent = {
      path: 'path/to/image.png',
      name: 'image',
      ext: '.png',
    }

    // Log all the dispatched actions in order
    const actions: AnyAction[] = []
    runSaga(function* (): Generator {
      while (true) {
        const action = yield* take()
        actions.push(action.type)
      }
    })

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <Channel />
      </>,
      store
    )

    store.dispatch(files.actions.uploadFile(fileContent))

    await act(async () => {
      await new Promise(resolve => {
        setTimeout(resolve, uploadingDelay)
      })
    })

    expect(cid).not.toEqual('')
    // Confirm image's placeholder never displays
    expect(screen.queryByTestId(`${cid}-imagePlaceholder`)).toBeNull()

    // Confirm image is visible (in uploading state)
    expect(await screen.findByTestId(`${cid}-imageVisual`)).toBeVisible()

    expect(actions).toMatchInlineSnapshot(`
      Array [
        "Messages/lazyLoading",
        "Messages/resetCurrentPublicChannelCache",
        "Messages/resetCurrentPublicChannelCache",
        "Files/uploadFile",
        "Messages/sendMessage",
        "Files/updateDownloadStatus",
        "Messages/addMessagesSendingStatus",
        "Messages/addMessageVerificationStatus",
        "Messages/addMessages",
        "PublicChannels/cacheMessages",
        "Messages/addMessageVerificationStatus",
        "Identity/verifyJoinTimestamp",
        "PublicChannels/updateNewestMessage",
        "Messages/lazyLoading",
        "Messages/resetCurrentPublicChannelCache",
        "PublicChannels/cacheMessages",
        "Messages/setDisplayedMessagesNumber",
        "Files/broadcastHostedFile",
        "Messages/removePendingMessageStatuses",
        "Messages/addMessages",
        "PublicChannels/cacheMessages",
        "Messages/addMessageVerificationStatus",
        "Identity/verifyJoinTimestamp",
        "Files/updateDownloadStatus",
      ]
    `)
  })

  it('downloads and displays missing images after app restart', async () => {
    const initialState = (await prepareStore()).store

    const factory = await getFactory(initialState)

    const community: Community = await factory.create<
      ReturnType<typeof communities.actions.addNewCommunity>['payload']
    >('Community', { rootCa: 'rootCa' })

    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'alice',
    })

    initialState.dispatch(
      communities.actions.updateCommunityData({
        id: community.id,
        // null/undefined type mismatch here. Might make things easier
        // to make it consistent.
        ownerCertificate: alice.userCertificate || undefined,
      })
    )

    const message = Math.random().toString(36).substr(2.9)

    const entities = initialState.getState().PublicChannels.channels.entities

    const generalId = Object.keys(entities).find(key => entities[key]?.name === 'general')
    expect(generalId).not.toBeUndefined()
    const missingFile: FileMetadata = {
      cid: Math.random().toString(36).substr(2.9),
      path: null,
      name: 'test-image',
      ext: '.jpeg',
      width: 100,
      height: 200,
      message: {
        id: message,
        // @ts-expect-error
        channelId: generalId,
      },
      size: AUTODOWNLOAD_SIZE_LIMIT - 2048,
    }

    await factory.create<ReturnType<typeof publicChannels.actions.test_message>['payload']>('Message', {
      identity: alice,
      message: {
        id: message,
        type: MessageType.Image,
        message: '',
        createdAt: DateTime.utc().valueOf(),
        // @ts-expect-error
        channelId: generalId,
        signature: '',
        pubKey: '',
        media: missingFile,
      },
    })

    initialState.dispatch(
      files.actions.updateDownloadStatus({
        mid: missingFile.message.id,
        cid: `uploading_${missingFile.cid}`,
        downloadState: DownloadState.Queued,
        downloadProgress: {
          downloaded: AUTODOWNLOAD_SIZE_LIMIT / 2,
          size: AUTODOWNLOAD_SIZE_LIMIT - 2048,
          transferSpeed: 1024,
        },
      })
    )

    const mockEmitImpl = async (...input: [SocketActionTypes, ...socketEventData<[any]>]) => {
      const action = input[0]
      if (action === SocketActionTypes.LAUNCH_COMMUNITY) {
        const data = input[1] as InitCommunityPayload
        const payload = data
        return socket.socketClient.emit<ResponseLaunchCommunityPayload>(SocketActionTypes.COMMUNITY_LAUNCHED, {
          id: payload.id,
        })
      }
      if (action === SocketActionTypes.DOWNLOAD_FILE) {
        const data = input[1] as DownloadFilePayload
        const payload = data
        expect(payload.metadata.cid).toEqual(missingFile.cid)
        await new Promise(resolve => setTimeout(resolve, 1000))
        return socket.socketClient.emit<FileMetadata>(SocketActionTypes.MESSAGE_MEDIA_UPDATED, {
          ...missingFile,
          path: `${__dirname}/test-image.jpeg`,
        })
      }
    }

    jest.spyOn(socket, 'emit').mockImplementation(mockEmitImpl)
    // @ts-ignore
    socket.emitWithAck = mockEmitImpl

    const { store, runSaga } = await prepareStore(
      initialState.getState(),
      socket // Fork state manager's sagas
    )

    store.dispatch(connection.actions.torBootstrapped('100%'))
    // Log all the dispatched actions in order
    const actions: AnyAction[] = []
    runSaga(function* (): Generator {
      while (true) {
        const action = yield* take()
        actions.push(action.type)
      }
    })

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <Channel />
      </>,
      store
    )

    // Confirm image placeholder is visible until image downloads
    expect(screen.getByTestId(`${missingFile.cid}-imagePlaceholder`)).toBeVisible()

    // Confirm image is visible and it's placeholder is gone after downloading the image
    expect(await screen.findByTestId(`${missingFile.cid}-imageVisual`)).toBeVisible()
    expect(await screen.queryByTestId(`${missingFile.cid}-imagePlaceholder`)).toBeNull()

    expect(actions).toMatchInlineSnapshot(`
      Array [
        "Messages/lazyLoading",
        "Messages/resetCurrentPublicChannelCache",
        "Messages/resetCurrentPublicChannelCache",
        "Files/updateMessageMedia",
        "Messages/addMessages",
        "Messages/addMessageVerificationStatus",
        "Identity/verifyJoinTimestamp",
        "PublicChannels/updateNewestMessage",
        "PublicChannels/cacheMessages",
      ]
    `)
  })

  it('displays hosted file in proper state', async () => {
    const initialState = (await prepareStore()).store

    const factory = await getFactory(initialState)

    const community =
      await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community')

    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'alice',
    })

    initialState.dispatch(
      communities.actions.updateCommunityData({
        id: community.id,
        // null/undefined type mismatch here. Might make things easier
        // to make it consistent.
        ownerCertificate: alice.userCertificate || undefined,
      })
    )

    jest.spyOn(socket, 'emit').mockImplementation(async (...input: [SocketActionTypes, ...socketEventData<[any]>]) => {
      const action = input[0]
      if (action === SocketActionTypes.LAUNCH_COMMUNITY) {
        const data = input[1] as InitCommunityPayload
        const payload = data
        return socket.socketClient.emit<ResponseLaunchCommunityPayload>(SocketActionTypes.COMMUNITY_LAUNCHED, {
          id: payload.id,
        })
      }
      if (action === SocketActionTypes.UPLOAD_FILE) {
        const data = input[1] as UploadFilePayload
        const payload = data
        socket.socketClient.emit<FileMetadata>(SocketActionTypes.FILE_UPLOADED, {
          ...payload.file,
          size: 1024,
        })
        return socket.socketClient.emit<DownloadStatus>(SocketActionTypes.DOWNLOAD_PROGRESS, {
          mid: payload.file.message.id,
          cid: `uploading_${payload.file.message.id}`,
          downloadState: DownloadState.Hosted,
        })
      }
    })

    const { store, runSaga } = await prepareStore(
      initialState.getState(),
      socket // Fork state manager's sagas
    )

    const fileContent: FileContent = {
      path: 'path/to/file.ext',
      name: 'file',
      ext: '.ext',
    }

    // Log all the dispatched actions in order
    const actions: AnyAction[] = []
    runSaga(function* (): Generator {
      while (true) {
        const action = yield* take()
        actions.push(action.type)
      }
    })

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <Channel />
      </>,
      store
    )

    store.dispatch(files.actions.uploadFile(fileContent))

    // Confirm file component displays in HOSTED state
    expect(await screen.findByText('Show in folder')).toBeVisible()

    expect(actions).toMatchInlineSnapshot(`
      Array [
        "Messages/lazyLoading",
        "Messages/resetCurrentPublicChannelCache",
        "Messages/resetCurrentPublicChannelCache",
        "Files/uploadFile",
        "Messages/sendMessage",
        "Files/updateDownloadStatus",
        "Messages/addMessagesSendingStatus",
        "Files/broadcastHostedFile",
        "Files/updateDownloadStatus",
        "Messages/addMessageVerificationStatus",
        "Messages/addMessages",
        "PublicChannels/cacheMessages",
        "Messages/addMessageVerificationStatus",
        "Identity/verifyJoinTimestamp",
        "PublicChannels/updateNewestMessage",
        "Messages/lazyLoading",
        "Messages/resetCurrentPublicChannelCache",
        "PublicChannels/cacheMessages",
        "Messages/setDisplayedMessagesNumber",
      ]
    `)
  })

  it('displays file queued for download', async () => {
    const initialState = (await prepareStore()).store

    const factory = await getFactory(initialState)

    const community =
      await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community')

    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'alice',
    })

    initialState.dispatch(
      communities.actions.updateCommunityData({
        id: community.id,
        // null/undefined type mismatch here. Might make things easier
        // to make it consistent.
        ownerCertificate: alice.userCertificate || undefined,
      })
    )

    const messageId = Math.random().toString(36).substr(2.9)
    const entities = initialState.getState().PublicChannels.channels.entities
    const generalId = Object.keys(entities).find(key => entities[key]?.name === 'general')
    expect(generalId).not.toBeUndefined()
    const media: FileMetadata = {
      cid: Math.random().toString(36).substr(2.9),
      path: null,
      name: 'test-file',
      ext: '.ext',
      size: AUTODOWNLOAD_SIZE_LIMIT - 1024,
      message: {
        id: messageId,
        // @ts-expect-error
        channelId: generalId,
      },
    }

    const message = (
      await factory.build<typeof publicChannels.actions.test_message>('Message', {
        identity: alice,
        message: {
          id: messageId,
          type: MessageType.File,
          message: '',
          createdAt: DateTime.utc().valueOf(),
          channelId: generalId,
          signature: '',
          pubKey: '',
          media: media,
        },
      })
    ).payload.message

    jest.spyOn(socket, 'emit').mockImplementation(async (...input: [SocketActionTypes, ...socketEventData<[any]>]) => {
      const action = input[0]
      if (action === SocketActionTypes.LAUNCH_COMMUNITY) {
        const data = input[1] as InitCommunityPayload
        const payload = data
        return socket.socketClient.emit<ResponseLaunchCommunityPayload>(SocketActionTypes.COMMUNITY_LAUNCHED, {
          id: payload.id,
        })
      }
    })

    const { store, runSaga } = await prepareStore(
      initialState.getState(),
      socket // Fork state manager's sagas
    )

    // Log all the dispatched actions in order
    const actions: AnyAction[] = []
    runSaga(function* (): Generator {
      while (true) {
        const action = yield* take()
        actions.push(action.type)
      }
    })

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <Channel />
      </>,
      store
    )

    await act(async () => {
      await runSaga(mockIncomingMessages).toPromise()
    })

    function* mockIncomingMessages(): Generator {
      yield* apply(socket.socketClient, socket.socketClient.emit, [
        SocketActionTypes.MESSAGES_STORED,
        {
          messages: [message],
          communityId: community.id,
          isVerified: true,
        },
      ])
    }

    await act(async () => {})

    // Confirm file component displays in QUEUED state
    // Temporary fix for error with files downloading https://github.com/TryQuiet/quiet/issues/1264
    // expect(await screen.findByText('Queued for download')).toBeVisible()

    expect(actions).toMatchInlineSnapshot(`
      Array [
        "Messages/lazyLoading",
        "Messages/resetCurrentPublicChannelCache",
        "Messages/resetCurrentPublicChannelCache",
        "Messages/removePendingMessageStatuses",
        "Messages/addMessages",
        "Files/updateDownloadStatus",
        "Messages/addMessageVerificationStatus",
        "Identity/verifyJoinTimestamp",
        "PublicChannels/updateNewestMessage",
      ]
    `)
  })

  it('displays large file as ready to download', async () => {
    const initialState = (await prepareStore()).store

    const factory = await getFactory(initialState)

    const community =
      await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community')

    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'alice',
    })

    initialState.dispatch(
      communities.actions.updateCommunityData({
        id: community.id,
        // null/undefined type mismatch here. Might make things easier
        // to make it consistent.
        ownerCertificate: alice.userCertificate || undefined,
      })
    )

    const messageId = Math.random().toString(36).substr(2.9)
    const entities = initialState.getState().PublicChannels.channels.entities
    const generalId = Object.keys(entities).find(key => entities[key]?.name === 'general')
    expect(generalId).not.toBeUndefined()
    const media: FileMetadata = {
      cid: Math.random().toString(36).substr(2.9),
      path: null,
      name: 'test-file',
      ext: '.ext',
      size: AUTODOWNLOAD_SIZE_LIMIT + 1024,
      message: {
        id: messageId,
        // @ts-expect-error
        channelId: generalId,
      },
    }

    const message = (
      await factory.build<typeof publicChannels.actions.test_message>('Message', {
        identity: alice,
        message: {
          id: messageId,
          type: MessageType.File,
          message: '',
          createdAt: DateTime.utc().valueOf(),
          channelId: generalId,
          signature: '',
          pubKey: '',
          media: media,
        },
      })
    ).payload.message

    jest.spyOn(socket, 'emit').mockImplementation(async (...input: [SocketActionTypes, ...socketEventData<[any]>]) => {
      const action = input[0]
      if (action === SocketActionTypes.LAUNCH_COMMUNITY) {
        const data = input[1] as InitCommunityPayload
        const payload = data
        return socket.socketClient.emit<ResponseLaunchCommunityPayload>(SocketActionTypes.COMMUNITY_LAUNCHED, {
          id: payload.id,
        })
      }
    })

    const { store, runSaga } = await prepareStore(
      initialState.getState(),
      socket // Fork state manager's sagas
    )

    // Log all the dispatched actions in order
    const actions: AnyAction[] = []
    runSaga(function* (): Generator {
      while (true) {
        const action = yield* take()
        actions.push(action.type)
      }
    })

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <Channel />
      </>,
      store
    )

    await act(async () => {
      await runSaga(mockIncomingMessages).toPromise()
    })

    function* mockIncomingMessages(): Generator {
      yield* apply(socket.socketClient, socket.socketClient.emit, [
        SocketActionTypes.MESSAGES_STORED,
        {
          messages: [message],
          communityId: community.id,
          isVerified: true,
        },
      ])
    }

    // Confirm file component displays in READY state
    expect(await screen.findByText('Download file')).toBeVisible()

    expect(actions).toMatchInlineSnapshot(`
      Array [
        "Messages/lazyLoading",
        "Messages/resetCurrentPublicChannelCache",
        "Messages/resetCurrentPublicChannelCache",
        "Messages/removePendingMessageStatuses",
        "Messages/addMessages",
        "Files/updateDownloadStatus",
        "Messages/addMessageVerificationStatus",
        "Identity/verifyJoinTimestamp",
        "PublicChannels/updateNewestMessage",
        "PublicChannels/cacheMessages",
        "Messages/lazyLoading",
        "Messages/resetCurrentPublicChannelCache",
        "PublicChannels/cacheMessages",
        "Messages/setDisplayedMessagesNumber",
      ]
    `)
  })

  it('downloads file on demand', async () => {
    const initialState = (await prepareStore()).store

    const factory = await getFactory(initialState)

    const community =
      await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community')

    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'alice',
    })

    initialState.dispatch(
      communities.actions.updateCommunityData({
        id: community.id,
        // null/undefined type mismatch here. Might make things easier
        // to make it consistent.
        ownerCertificate: alice.userCertificate || undefined,
      })
    )

    const messageId = Math.random().toString(36).substr(2.9)
    const entities = initialState.getState().PublicChannels.channels.entities
    const generalId = Object.keys(entities).find(key => entities[key]?.name === 'general')
    expect(generalId).not.toBeUndefined()
    const media: FileMetadata = {
      cid: Math.random().toString(36).substr(2.9),
      path: null,
      name: 'test-file',
      ext: '.ext',
      size: AUTODOWNLOAD_SIZE_LIMIT + 1024,
      message: {
        id: messageId,
        // @ts-expect-error
        channelId: generalId,
      },
    }

    const message = (
      await factory.build<typeof publicChannels.actions.test_message>('Message', {
        identity: alice,
        message: {
          id: messageId,
          type: MessageType.File,
          message: '',
          createdAt: DateTime.utc().valueOf(),
          channelId: generalId,
          signature: '',
          pubKey: '',
          media: media,
        },
      })
    ).payload.message

    jest.spyOn(socket, 'emit').mockImplementation(async (...input: [SocketActionTypes, ...socketEventData<[any]>]) => {
      const action = input[0]
      if (action === SocketActionTypes.LAUNCH_COMMUNITY) {
        const data = input[1] as InitCommunityPayload
        const payload = data
        return socket.socketClient.emit<ResponseLaunchCommunityPayload>(SocketActionTypes.COMMUNITY_LAUNCHED, {
          id: payload.id,
        })
      }
    })

    const { store, runSaga } = await prepareStore(
      initialState.getState(),
      socket // Fork state manager's sagas
    )

    // Log all the dispatched actions in order
    const actions: AnyAction[] = []
    runSaga(function* (): Generator {
      while (true) {
        const action = yield* take()
        actions.push(action.type)
      }
    })

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <Channel />
      </>,
      store
    )

    await act(async () => {
      await runSaga(mockIncomingMessages).toPromise()
    })

    const verificationStatus: MessageVerificationStatus = {
      publicKey: message.pubKey,
      signature: message.signature,
      isVerified: true,
    }

    store.dispatch(messages.actions.addMessageVerificationStatus(verificationStatus))

    function* mockIncomingMessages(): Generator {
      yield* apply(socket.socketClient, socket.socketClient.emit, [
        SocketActionTypes.MESSAGES_STORED,
        {
          messages: [message],
          communityId: community.id,
          isVerfied: true,
        },
      ])
    }

    const downloadSpy = jest.spyOn(socket, 'emit')

    const downloadButton = await screen.findByText('Download file')

    await userEvent.click(downloadButton)

    // Confirm file component displays in QUEUED state
    // Temporary fix for error with files downloading https://github.com/TryQuiet/quiet/issues/1264
    // expect(await screen.findByText('Queued for download')).toBeVisible()

    expect(downloadSpy).toHaveBeenCalledWith(SocketActionTypes.DOWNLOAD_FILE, {
      peerId: alice.peerId.id,
      metadata: media,
    })

    expect(actions).toMatchInlineSnapshot(`
      Array [
        "Messages/lazyLoading",
        "Messages/resetCurrentPublicChannelCache",
        "Messages/resetCurrentPublicChannelCache",
        "Messages/removePendingMessageStatuses",
        "Messages/addMessages",
        "Files/updateDownloadStatus",
        "Messages/addMessageVerificationStatus",
        "Identity/verifyJoinTimestamp",
        "PublicChannels/updateNewestMessage",
        "Messages/addMessageVerificationStatus",
        "PublicChannels/cacheMessages",
        "Messages/lazyLoading",
        "Messages/resetCurrentPublicChannelCache",
        "PublicChannels/cacheMessages",
        "Messages/setDisplayedMessagesNumber",
        "Files/downloadFile",
        "Files/updateDownloadStatus",
      ]
    `)
  })
})
