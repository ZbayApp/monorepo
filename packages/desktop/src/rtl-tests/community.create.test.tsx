import { generateChannelId } from '@quiet/common'
import { publicChannels } from '@quiet/state-manager'
import {
  SocketActionTypes,
  socketEventData,
  ChannelsReplicatedPayload,
  InitCommunityPayload,
  ResponseLaunchCommunityPayload,
  Identity,
  CreateNetworkPayload,
  PeerId,
  UserCsr,
  InitUserCsrPayload,
} from '@quiet/types'
import { screen } from '@testing-library/dom'
import '@testing-library/jest-dom/extend-expect'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { act } from 'react-dom/test-utils'
import { AnyAction } from 'redux'
import MockedSocket from 'socket.io-mock'
import { take } from 'typed-redux-saga'
import Channel from '../renderer/components/Channel/Channel'
import CreateCommunity from '../renderer/components/CreateJoinCommunity/CreateCommunity/CreateCommunity'
import { CreateCommunityDictionary } from '../renderer/components/CreateJoinCommunity/community.dictionary'
import CreateUsername from '../renderer/components/CreateUsername/CreateUsername'
import LoadingPanel from '../renderer/components/LoadingPanel/LoadingPanel'
import { modalsActions } from '../renderer/sagas/modals/modals.slice'
import { ModalName } from '../renderer/sagas/modals/modals.types'
import { prepareStore } from '../renderer/testUtils/prepareStore'
import { renderComponent } from '../renderer/testUtils/renderComponent'
import { ioMock } from '../shared/setupTests'

jest.setTimeout(20_000)

describe('User', () => {
  let socket: MockedSocket
  const generalId = generateChannelId('general')

  beforeEach(() => {
    socket = new MockedSocket()
    ioMock.mockImplementation(() => socket)
    window.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('creates community and registers username', async () => {
    const { store, runSaga } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    store.dispatch(modalsActions.openModal({ name: ModalName.createCommunityModal }))

    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <LoadingPanel />
        <CreateCommunity />
        <CreateUsername />
        <Channel />
      </>,
      store
    )

    const mockEmitImpl = (...input: [SocketActionTypes, ...socketEventData<[any]>]) => {
      const action = input[0]
      if (action === SocketActionTypes.CREATE_IDENTITY) {
        const payload: string = input[1]
        console.info('CREATE_IDENTITY', payload)
        return {
          id: payload,
          nickname: 'alice',
          hiddenService: {
            onionAddress: 'onionAddress',
            privateKey: 'privKey',
          },
          peerId: {
            id: 'peerId',
          },
        } as Identity
      }
      if (action === SocketActionTypes.CREATE_USER_CSR) {
        const payload = input[1] as InitUserCsrPayload
        return {
          id: payload.communityId,
          nickname: payload.nickname,
          hiddenService: {
            onionAddress: 'onionAddress',
            privateKey: 'privKey',
          },
          peerId: {
            id: 'peerId',
          } as PeerId,
          userCsr: {
            userCsr: 'mock',
            userKey: 'mock',
            pkcs10: {
              publicKey: 'mock',
              privateKey: 'mock',
              pkcs10: 'mock',
            },
          } as UserCsr,
        } as Identity
      }
      if (action === SocketActionTypes.CREATE_COMMUNITY) {
        const payload = input[1] as InitCommunityPayload
        socket.socketClient.emit<ResponseLaunchCommunityPayload>(SocketActionTypes.COMMUNITY_LAUNCHED, {
          id: payload.id,
        })

        socket.socketClient.emit<ChannelsReplicatedPayload>(SocketActionTypes.CHANNELS_STORED, {
          channels: {
            general: {
              name: 'general',
              description: 'string',
              owner: 'owner',
              timestamp: 0,
              id: generalId,
            },
          },
        })

        return { id: payload.id, ownerCertificate: 'cert' }
      }
    }

    jest.spyOn(socket, 'emit').mockImplementation(mockEmitImpl)
    // @ts-ignore
    socket.emitWithAck = mockEmitImpl

    // Log all the dispatched actions in order
    const actions: AnyAction[] = []
    runSaga(function* (): Generator {
      while (true) {
        const action = yield* take()
        actions.push(action.type)
      }
    })

    // Confirm proper modal title is displayed
    const dictionary = CreateCommunityDictionary()
    const createCommunityTitle = screen.getByText(dictionary.header)
    expect(createCommunityTitle).toBeVisible()

    // Enter community name and hit button
    const createCommunityInput = screen.getByPlaceholderText(dictionary.placeholder)
    const createCommunityButton = screen.getByText(dictionary.button)
    await userEvent.type(createCommunityInput, 'rockets')
    await userEvent.click(createCommunityButton)

    // Confirm user is being redirected to username registration
    const createUsernameTitle = await screen.findByText('Register a username')
    expect(createUsernameTitle).toBeVisible()

    // Enter username and hit button
    const createUsernameInput = await screen.findByPlaceholderText('Enter a username')
    const createUsernameButton = await screen.findByText('Register')
    await userEvent.type(createUsernameInput, 'alice')
    await userEvent.click(createUsernameButton)

    // Wait for the actions that updates the store
    await act(async () => {
      // Little workaround
      store.dispatch(publicChannels.actions.setCurrentChannel({ channelId: generalId }))
    })

    // Check if create/username modals are gone
    expect(createCommunityTitle).not.toBeVisible()
    expect(createUsernameTitle).not.toBeVisible()

    // Check if channel page is visible
    const channelPage = await screen.findByText('#general')
    expect(channelPage).toBeVisible()
    expect(actions).toMatchInlineSnapshot(`
      Array [
        "Communities/createNetwork",
        "Communities/addNewCommunity",
        "Communities/setCurrentCommunity",
        "Identity/addNewIdentity",
        "Modals/closeModal",
        "Modals/openModal",
        "Identity/registerUsername",
        "Identity/updateIdentity",
        "Communities/createCommunity",
        "Files/checkForMissingFiles",
        "Network/addInitializedCommunity",
        "Communities/clearInvitationCodes",
        "PublicChannels/channelsReplicated",
        "Communities/updateCommunityData",
        "PublicChannels/addChannel",
        "Identity/storeUserCertificate",
        "Messages/addPublicChannelsMessagesBase",
        "PublicChannels/createGeneralChannel",
        "PublicChannels/createChannel",
        "PublicChannels/setCurrentChannel",
        "PublicChannels/clearUnreadChannel",
        "Network/setLoadingPanelType",
        "Modals/openModal",
        "Modals/closeModal",
        "Messages/lazyLoading",
        "Messages/resetCurrentPublicChannelCache",
        "Messages/resetCurrentPublicChannelCache",
        "PublicChannels/setCurrentChannel",
        "PublicChannels/clearUnreadChannel",
        "Messages/lazyLoading",
        "Messages/resetCurrentPublicChannelCache",
        "Messages/resetCurrentPublicChannelCache",
      ]
    `)
  })
})
