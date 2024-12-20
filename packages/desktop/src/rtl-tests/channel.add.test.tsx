import React from 'react'
import '@testing-library/jest-dom/extend-expect'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/dom'
import { act } from 'react-dom/test-utils'
import { take } from 'typed-redux-saga'
import MockedSocket from 'socket.io-mock'
import { ioMock } from '../shared/setupTests'
import { socketEventData } from '@quiet/types'
import { renderComponent } from '../renderer/testUtils/renderComponent'
import { prepareStore } from '../renderer/testUtils/prepareStore'
import { StoreKeys } from '../renderer/store/store.keys'

import CreateChannel from '../renderer/components/Channel/CreateChannel/CreateChannel'
import Channel from '../renderer/components/Channel/Channel'
import Sidebar from '../renderer/components/Sidebar/Sidebar'

import { getFactory, identity, publicChannels } from '@quiet/state-manager'
import {
  ChannelsReplicatedPayload,
  CreateChannelPayload,
  ErrorMessages,
  type MessagesLoadedPayload,
  SendMessagePayload,
  SocketActionTypes,
  type PublicChannel,
} from '@quiet/types'

import { modalsActions, ModalsInitialState } from '../renderer/sagas/modals/modals.slice'
import { ModalName } from '../renderer/sagas/modals/modals.types'
import { FieldErrors } from '../renderer/forms/fieldsErrors'

import { createLogger } from './logger'

const logger = createLogger('channel:add')

jest.setTimeout(20_000)

describe('Add new channel', () => {
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

  it('Opens modal on button click', async () => {
    const { store } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    const factory = await getFactory(store)

    await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      nickname: 'alice',
    })

    renderComponent(
      <>
        <Sidebar />
        <CreateChannel />
      </>,
      store
    )

    const addChannel = screen.getByTestId('addChannelButton')
    await userEvent.click(addChannel)

    const title = await screen.findByText('Create a new public channel')
    expect(title).toBeVisible()
  })

  it('Adds new channel and opens it. Sends initial message', async () => {
    const { store, runSaga } = await prepareStore(
      {
        [StoreKeys.Modals]: {
          ...new ModalsInitialState(),
          [ModalName.createChannel]: { open: true },
        },
      },
      socket // Fork state manager's sagas
    )

    const factory = await getFactory(store)
    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      nickname: 'alice',
    })
    const channelName = { input: 'my-Super Channel ', output: 'my-super-channel-' }

    const mockImpl = async (...input: [SocketActionTypes, ...socketEventData<[any]>]) => {
      const action = input[0]
      if (action === SocketActionTypes.CREATE_CHANNEL) {
        const payload = input[1] as CreateChannelPayload
        expect(payload.channel.owner).toEqual(alice.nickname)
        expect(payload.channel.name).toEqual(channelName.output)
        const channelEntities = store.getState().PublicChannels.channels.entities
        const channels = Object.values(channelEntities).filter(x => x) as PublicChannel[]
        return socket.socketClient.emit<ChannelsReplicatedPayload>(SocketActionTypes.CHANNELS_STORED, {
          channels: [...channels, payload.channel],
        })
      }
      if (action === SocketActionTypes.SEND_MESSAGE) {
        const data = input[1] as SendMessagePayload
        const { message } = data
        expect(message.channelId).toEqual(channelName.output)
        expect(message.message).toEqual(`Created #${channelName.output}`)
        return socket.socketClient.emit<MessagesLoadedPayload>(SocketActionTypes.MESSAGES_STORED, {
          messages: [message],
        })
      }
    }

    jest.spyOn(socket, 'emit').mockImplementation(mockImpl)
    // @ts-ignore
    socket.emitWithAck = mockImpl

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <Sidebar />
        <CreateChannel />
        <Channel />
      </>,
      store
    )
    const user = userEvent.setup()
    const input = screen.getByPlaceholderText('Enter a channel name')
    await user.type(input, channelName.input)

    // FIXME: await user.click(screen.getByText('Create Channel') causes this and few other tests to fail (hangs on taking createChannel action)
    await act(
      async () =>
        await waitFor(() => {
          user.click(screen.getByText('Create Channel')).catch(e => {
            logger.error(e)
          })
        })
    )

    function* testCreateChannelSaga(): Generator {
      const createChannelAction = yield* take(publicChannels.actions.createChannel)
      expect(createChannelAction.payload.channel.name).toEqual(channelName.output)
      expect(createChannelAction.payload.channel.owner).toEqual(alice.nickname)
      const addChannelAction = yield* take(publicChannels.actions.addChannel)
      expect(addChannelAction.payload.channel).toEqual(createChannelAction.payload.channel)
    }

    await act(async () => {
      await runSaga(testCreateChannelSaga).toPromise()
    })

    const createChannelModal = screen.queryByTestId('createChannelModal')
    expect(createChannelModal).toBeNull()

    // Check if newly created channel is present and selected
    expect(screen.getByTestId('channelTitle')).toHaveTextContent(`#${channelName.output}`)
    // Check if sidebar item displays as selected
    const link = screen.getByTestId(`${channelName.output}-link`)
    expect(link).toHaveClass('ChannelsListItemselected')
  })

  it('Displays error if trying to add channel with already taken name', async () => {
    const { store } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )
    const factory = await getFactory(store)

    const channel =
      await factory.create<ReturnType<typeof publicChannels.actions.addChannel>['payload']>('PublicChannel')

    renderComponent(<CreateChannel />, store)

    store.dispatch(modalsActions.openModal({ name: ModalName.createChannel }))

    const input = await screen.findByPlaceholderText('Enter a channel name')
    await userEvent.type(input, channel.channel.name)

    const button = screen.getByText('Create Channel')
    await userEvent.click(button)

    const error = await screen.findByText(ErrorMessages.CHANNEL_NAME_TAKEN)
    expect(error).toBeVisible()
  })

  it('Input after reopen should be clear', async () => {
    const channelName = 'san-fierro'
    const { store } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    const factory = await getFactory(store)

    await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      nickname: 'alice',
    })

    renderComponent(
      <>
        <Sidebar />
        <CreateChannel />
      </>,
      store
    )

    const addChannel = screen.getByTestId('addChannelButton')
    await userEvent.click(addChannel)

    const title = await screen.findByText('Create a new public channel')
    expect(title).toBeVisible()

    const user = userEvent.setup()
    const input = screen.getByPlaceholderText('Enter a channel name')
    await user.type(input, channelName)
    expect(input).toHaveValue(channelName)

    const closeChannel = screen.getByTestId('ModalActions').querySelector('button')
    expect(closeChannel).not.toBeNull()
    // @ts-expect-error
    await userEvent.click(closeChannel)

    const isGeneral = await screen.findByText('# general')

    expect(isGeneral).toBeVisible()

    await userEvent.click(addChannel)
    const input2 = screen.getByPlaceholderText('Enter a channel name')
    expect(input2).toHaveValue('')
  })

  it('Bug reproduction - open and close modal and check there are any errors', async () => {
    const channelName = ''
    const { store } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    const factory = await getFactory(store)

    await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      nickname: 'alice',
    })

    renderComponent(
      <>
        <Sidebar />
        <CreateChannel />
      </>,
      store
    )

    const addChannel = screen.getByTestId('addChannelButton')
    await userEvent.click(addChannel)

    const title = await screen.findByText('Create a new public channel')
    expect(title).toBeVisible()

    const user = userEvent.setup()
    const input = screen.getByPlaceholderText('Enter a channel name')
    expect(input).toHaveValue(channelName)

    const button = screen.getByText('Create Channel')
    await userEvent.click(button)

    const error = await screen.findByText(FieldErrors.Required)
    expect(error).toBeVisible()

    const closeChannel = screen.getByTestId('ModalActions').querySelector('button')
    expect(closeChannel).not.toBeNull()
    // @ts-expect-error
    await userEvent.click(closeChannel)

    const isGeneral = await screen.findByText('# general')
    expect(isGeneral).toBeVisible()

    await userEvent.click(addChannel)
    const title2 = await screen.findByText('Create a new public channel')
    expect(title2).toBeVisible()

    const isErrorStillExist = screen.queryByText(FieldErrors.Required)
    expect(isErrorStillExist).toBeNull()
  })

  it('Bug reproduction - create channel and open modal again without requierd field error', async () => {
    const channelName = 'las-venturas'

    const { store, runSaga } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    const factory = await getFactory(store)

    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      nickname: 'alice',
    })

    const mockImpl = async (...input: [SocketActionTypes, ...socketEventData<[any]>]) => {
      const action = input[0]
      if (action === SocketActionTypes.CREATE_CHANNEL) {
        const payload = input[1] as CreateChannelPayload
        // const payload = data[0]
        expect(payload.channel.owner).toEqual(alice.nickname)
        expect(payload.channel.name).toEqual(channelName)
        const channelEntities = store.getState().PublicChannels.channels.entities
        const channels = Object.values(channelEntities).filter(x => x) as PublicChannel[]
        return socket.socketClient.emit<ChannelsReplicatedPayload>(SocketActionTypes.CHANNELS_STORED, {
          channels: [...channels, payload.channel],
        })
      }
      if (action === SocketActionTypes.SEND_MESSAGE) {
        const data = input[1] as SendMessagePayload
        const { message } = data
        expect(message.channelId).toEqual(channelName)
        expect(message.message).toEqual(`Created #${channelName}`)
        return socket.socketClient.emit<MessagesLoadedPayload>(SocketActionTypes.MESSAGES_STORED, {
          messages: [message],
        })
      }
    }

    jest.spyOn(socket, 'emit').mockImplementation(mockImpl)
    // @ts-ignore
    socket.emitWithAck = mockImpl

    renderComponent(
      <>
        <Sidebar />
        <CreateChannel />
      </>,
      store
    )

    const addChannel = screen.getByTestId('addChannelButton')
    await userEvent.click(addChannel)

    const title = await screen.findByText('Create a new public channel')
    expect(title).toBeVisible()

    const user = userEvent.setup()
    const input = screen.getByPlaceholderText('Enter a channel name')
    await user.type(input, channelName)
    expect(input).toHaveValue(channelName)

    await act(
      async () =>
        await waitFor(() => {
          user.click(screen.getByText('Create Channel')).catch(e => {
            logger.error(e)
          })
        })
    )

    await act(async () => {
      await runSaga(testCreateChannelSaga).toPromise()
    })

    function* testCreateChannelSaga(): Generator {
      const createChannelAction = yield* take(publicChannels.actions.createChannel)
      expect(createChannelAction.payload.channel.name).toEqual(channelName)
      expect(createChannelAction.payload.channel.owner).toEqual(alice.nickname)
      const addChannelAction = yield* take(publicChannels.actions.addChannel)
      expect(addChannelAction.payload.channel).toEqual(createChannelAction.payload.channel)
    }

    const isNewChannel = await screen.findByText(`# ${channelName}`)
    expect(isNewChannel).toBeVisible()

    await userEvent.click(addChannel)
    const title2 = await screen.findByText('Create a new public channel')
    expect(title2).toBeVisible()

    const isErrorExist = screen.queryByText(FieldErrors.Required)
    expect(isErrorExist).toBeNull()
  })

  it('Adds few new channels and check order', async () => {
    const { store, runSaga } = await prepareStore(
      {
        [StoreKeys.Modals]: {
          ...new ModalsInitialState(),
          [ModalName.createChannel]: { open: true },
        },
      },
      socket // Fork state manager's sagas
    )

    const factory = await getFactory(store)
    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      nickname: 'alice',
    })

    const channels = ['zzz', 'abc', '12a']

    const mockImpl = async (...input: [SocketActionTypes, ...socketEventData<[CreateChannelPayload]>]) => {
      const action = input[0]
      if (action === SocketActionTypes.CREATE_CHANNEL) {
        const data = input[1]
        const payload = data
        expect(payload.channel.owner).toEqual(alice.nickname)
        const channelEntities = store.getState().PublicChannels.channels.entities
        const channels = Object.values(channelEntities).filter(x => x) as PublicChannel[]
        return socket.socketClient.emit<ChannelsReplicatedPayload>(SocketActionTypes.CHANNELS_STORED, {
          channels: [...channels, payload.channel],
        })
      }
    }

    jest.spyOn(socket, 'emit').mockImplementation(mockImpl)
    // @ts-ignore
    socket.emitWithAck = mockImpl

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <Sidebar />
        <CreateChannel />
        <Channel />
      </>,
      store
    )

    for await (const channel of channels) {
      const addChannel = screen.getByTestId('addChannelButton')
      await userEvent.click(addChannel)

      const title = await screen.findByText('Create a new public channel')
      expect(title).toBeVisible()

      const user = userEvent.setup()
      const input = screen.getByPlaceholderText('Enter a channel name')

      await user.type(input, channel)
      await act(
        async () =>
          await waitFor(() => {
            user.click(screen.getByText('Create Channel')).catch(e => {
              logger.error(e)
            })
          })
      )
      await act(async () => {
        await runSaga(testCreateChannelSaga).toPromise()
      })
      await new Promise<void>(resolve => setTimeout(() => resolve(), 100))
    }

    function* testCreateChannelSaga(): Generator {
      yield* take(publicChannels.actions.createChannel)
      yield* take(publicChannels.actions.addChannel)
    }

    const createChannelModal = screen.queryByTestId('createChannelModal')
    expect(createChannelModal).toBeNull()
    const list = await screen.findByTestId('channelsList')
    const textContent = list.textContent
    expect(textContent).not.toBeNull()
    // @ts-expect-error
    const textArray = textContent.replace(/#/g, '').split(' ')
    const filteredArray = textArray.filter(item => item.length > 0)
    expect(filteredArray).toEqual(['general', '12a', 'abc', 'zzz'])
  })
})
