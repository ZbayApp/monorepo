import React from 'react'
import '@testing-library/jest-dom/extend-expect'
import { act } from 'react-dom/test-utils'
import { screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { take } from 'typed-redux-saga'
import { renderComponent } from '../renderer/testUtils/renderComponent'
import { prepareStore } from '../renderer/testUtils/prepareStore'
import { modalsActions } from '../renderer/sagas/modals/modals.slice'
import JoinCommunity from '../renderer/components/CreateJoinCommunity/JoinCommunity/JoinCommunity'
import CreateUsername from '../renderer/components/CreateUsername/CreateUsername'
import { ModalName } from '../renderer/sagas/modals/modals.types'
import { JoinCommunityDictionary } from '../renderer/components/CreateJoinCommunity/community.dictionary'
import MockedSocket from 'socket.io-mock'
import { ioMock } from '../shared/setupTests'
import {
  communities,
  RegisterUserCertificatePayload,
  ErrorCodes,
  ErrorMessages,
  getFactory,
  errors,
} from '@quiet/state-manager'
import Channel from '../renderer/components/Channel/Channel'
import LoadingPanel from '../renderer/components/LoadingPanel/LoadingPanel'
import { AnyAction } from 'redux'
import {
  InvitationData,
  ChannelsReplicatedPayload,
  ChannelSubscribedPayload,
  ErrorPayload,
  InitCommunityPayload,
  ResponseLaunchCommunityPayload,
  SocketActionTypes,
  socketEventData,
  Identity,
  InitUserCsrPayload,
  PeerId,
  UserCsr,
} from '@quiet/types'
import { composeInvitationShareUrl } from '@quiet/common'

import { createLogger } from './logger'

const logger = createLogger('community.join.test')

jest.setTimeout(20_000)

describe('User', () => {
  let socket: MockedSocket
  const validData: InvitationData = {
    pairs: [
      {
        onionAddress: 'y7yczmugl2tekami7sbdz5pfaemvx7bahwthrdvcbzw5vex2crsr26qd',
        peerId: 'QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wfFJDPPLsbKSE',
      },
    ],
    psk: 'BNlxfE2WBF7LrlpIX0CvECN5o1oZtA16PkAb7GYiwYw=',
    ownerOrbitDbIdentity: 'testOrbitDbIdentity',
  }
  const validCode = composeInvitationShareUrl(validData)
  // trigger
  beforeEach(() => {
    socket = new MockedSocket()
    ioMock.mockImplementation(() => socket)
    window.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }))
  })

  it('joins community and registers username', async () => {
    const { store, runSaga } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    store.dispatch(modalsActions.openModal({ name: ModalName.joinCommunityModal }))
    window.HTMLElement.prototype.scrollTo = jest.fn()

    renderComponent(
      <>
        <LoadingPanel />
        <JoinCommunity />
        <CreateUsername />
        <Channel />
      </>,
      store
    )

    const mockEmitImpl = async (...input: [SocketActionTypes, ...socketEventData<[any]>]) => {
      const action = input[0]
      logger.info('emitWithAck', action)
      const community = communities.selectors.currentCommunity(store.getState())
      switch (action) {
        case SocketActionTypes.CREATE_IDENTITY:
          const createIdentityPayload = input[1] as InitCommunityPayload
          return {
            id: createIdentityPayload.id,
            nickname: 'alice',
            hiddenService: {
              onionAddress: 'onionAddress',
              privateKey: 'privKey',
            },
            peerId: {
              id: 'peerId',
            },
          } as Identity
        case SocketActionTypes.CREATE_USER_CSR:
          const csrPayload = input[1] as InitUserCsrPayload
          // Mock identity object
          const mockIdentity: Identity = {
            id: csrPayload.communityId,
            hiddenService: {
              onionAddress: 'onionAddress',
              privateKey: 'privKey',
            },
            peerId: {
              id: csrPayload.communityId,
              privKey: 'mock',
              pubKey: 'mock',
            } as PeerId,
            nickname: csrPayload.nickname,
            userCsr: {
              userCsr: 'mock',
              userKey: 'mock',
              pkcs10: {
                publicKey: 'mock',
                privateKey: 'mock',
                pkcs10: 'mock',
              },
            } as UserCsr,
            userCertificate: null,
            joinTimestamp: null,
          }
          return mockIdentity
        case SocketActionTypes.LAUNCH_COMMUNITY:
          const payload = input[1] as InitCommunityPayload
          expect(payload.id).toEqual(community?.id)
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
                id: 'general',
              },
            },
          })
          socket.socketClient.emit<ChannelSubscribedPayload>(SocketActionTypes.CHANNEL_SUBSCRIBED, {
            channelId: 'general',
          })
          break
        default:
          throw new Error(`Unexpected action: ${action}`)
      }
    }

    jest.spyOn(socket, 'emit').mockImplementation(mockEmitImpl)
    // @ts-ignore
    socket.emitWithAck = mockEmitImpl

    // Log all the dispatched actions in order
    const actions: AnyAction[] = []
    runSaga(function* (): Generator {
      while (true) {
        const action: AnyAction = yield* take()
        actions.push(action.type)
      }
    })

    // Confirm proper modal title is displayed
    const dictionary = JoinCommunityDictionary()
    const joinCommunityTitle = screen.getByText(dictionary.header)
    expect(joinCommunityTitle).toBeVisible()

    // Enter community address and hit button
    const joinCommunityInput = screen.getByPlaceholderText(dictionary.placeholder)
    const joinCommunityButton = screen.getByText(dictionary.button)
    await userEvent.type(joinCommunityInput, validCode)
    expect(joinCommunityInput).toHaveValue(validCode)
    await userEvent.click(joinCommunityButton)

    // Confirm user is being redirected to username registration
    const createUsernameTitle = await screen.findByText('Register a username')
    expect(createUsernameTitle).toBeVisible()

    // Enter username and hit button
    const createUsernameInput = screen.getByPlaceholderText('Enter a username')
    const createUsernameButton = screen.getByText('Register')
    await userEvent.type(createUsernameInput, 'alice')
    await userEvent.click(createUsernameButton)

    // Wait for the actions that updates the store
    await act(async () => {})

    // Check if join/username modals are gone
    expect(joinCommunityTitle).not.toBeVisible()
    expect(createUsernameTitle).not.toBeVisible()

    // Check if channel page is visible
    const channelPage = await screen.findByText('#general')
    expect(channelPage).toBeVisible()

    expect(actions).toMatchInlineSnapshot(`
      Array [
        "Communities/createNetwork",
        "Communities/setInvitationCodes",
        "Communities/addNewCommunity",
        "Communities/setCurrentCommunity",
        "Modals/closeModal",
        "Modals/openModal",
        "Identity/addNewIdentity",
        "Identity/registerUsername",
        "Network/setLoadingPanelType",
        "Modals/openModal",
        "Identity/updateIdentity",
        "Communities/launchCommunity",
        "Files/checkForMissingFiles",
        "Network/addInitializedCommunity",
        "Communities/clearInvitationCodes",
        "PublicChannels/channelsReplicated",
        "PublicChannels/setChannelSubscribed",
        "PublicChannels/addChannel",
        "Messages/addPublicChannelsMessagesBase",
        "PublicChannels/sendIntroductionMessage",
        "Messages/sendMessage",
        "Modals/closeModal",
        "Messages/lazyLoading",
        "Messages/resetCurrentPublicChannelCache",
      ]
    `)
  })

  // We don't display registration errors right now
  it.skip('sees proper registration error when trying to join with already taken username', async () => {
    const { store, runSaga } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    store.dispatch(modalsActions.openModal({ name: ModalName.joinCommunityModal }))

    renderComponent(
      <>
        <LoadingPanel />
        <JoinCommunity />
        <CreateUsername />
        <Channel />
      </>,
      store
    )

    const mockEmitImpl = async (...input: [SocketActionTypes, ...socketEventData<[any]>]) => {
      const action = input[0]
      if (action === SocketActionTypes.CREATE_NETWORK) {
        return {
          hiddenService: {
            onionAddress: 'onionAddress',
            privateKey: 'privKey',
          },
          peerId: {
            id: 'peerId',
          },
        }
      }
      if (action === SocketActionTypes.REGISTER_USER_CERTIFICATE) {
        const payload = input[1] as RegisterUserCertificatePayload
        const community = communities.selectors.currentCommunity(store.getState())
        expect(payload.communityId).toEqual(community?.id)
        socket.socketClient.emit<ErrorPayload>(SocketActionTypes.ERROR, {
          type: SocketActionTypes.REGISTER_USER_CERTIFICATE,
          code: ErrorCodes.FORBIDDEN,
          message: ErrorMessages.USERNAME_TAKEN,
          community: community?.id,
        })
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
    const dictionary = JoinCommunityDictionary()
    const joinCommunityTitle = screen.getByText(dictionary.header)
    expect(joinCommunityTitle).toBeVisible()

    // Enter community address and hit button
    const joinCommunityInput = screen.getByPlaceholderText(dictionary.placeholder)
    const joinCommunityButton = screen.getByText(dictionary.button)
    await userEvent.type(joinCommunityInput, validCode)
    await userEvent.click(joinCommunityButton)

    // Confirm user is being redirected to username registration
    const createUsernameTitle = await screen.findByText('Register a username')
    expect(createUsernameTitle).toBeVisible()

    // Enter username and hit button
    const createUsernameInput = screen.getByPlaceholderText('Enter a username')
    const createUsernameButton = screen.getByText('Register')
    await userEvent.type(createUsernameInput, 'bob')
    await userEvent.click(createUsernameButton)

    // Wait for the actions that updates the store
    await act(async () => {})

    // Check if 'username taken' error message is visible
    expect(createUsernameTitle).toBeVisible()
    const usernameTakenErrorMessage = await screen.findByText(ErrorMessages.USERNAME_TAKEN)
    expect(usernameTakenErrorMessage).toBeVisible()

    expect(actions).toMatchInlineSnapshot()
  })

  it.skip('clears error before sending another username registration request', async () => {
    const { store, runSaga } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )
    store.dispatch(modalsActions.openModal({ name: ModalName.joinCommunityModal }))

    renderComponent(
      <>
        <LoadingPanel />
        <JoinCommunity />
        <CreateUsername />
        <Channel />
      </>,
      store
    )

    const mockEmitImpl = async (...input: [SocketActionTypes, ...socketEventData<[any]>]) => {
      const action = input[0]
      if (action === SocketActionTypes.CREATE_NETWORK) {
        return {
          hiddenService: {
            onionAddress: 'onionAddress',
            privateKey: 'privKey',
          },
          peerId: {
            id: 'peerId',
          },
        }
      }
    }

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
    const dictionary = JoinCommunityDictionary()
    const joinCommunityTitle = screen.getByText(dictionary.header)
    expect(joinCommunityTitle).toBeVisible()

    // Enter community address and hit button
    const joinCommunityInput = screen.getByPlaceholderText(dictionary.placeholder)
    const joinCommunityButton = screen.getByText(dictionary.button)
    await userEvent.type(joinCommunityInput, validCode)
    await userEvent.click(joinCommunityButton)

    // Confirm user is being redirected to username registration
    const createUsernameTitle = await screen.findByText('Register a username')
    expect(createUsernameTitle).toBeVisible()

    await act(async () => {
      const community = communities.selectors.currentCommunity(store.getState())
      store.dispatch(
        errors.actions.addError({
          type: SocketActionTypes.REGISTER_USER_CERTIFICATE,
          code: ErrorCodes.FORBIDDEN,
          message: ErrorMessages.USERNAME_TAKEN,
          community: community?.id,
        })
      )
    })

    // Check if 'username taken' error message is visible
    expect(createUsernameTitle).toBeVisible()
    expect(await screen.findByText(ErrorMessages.USERNAME_TAKEN)).toBeVisible()

    // Enter username and hit button
    const createUsernameInput = screen.getByPlaceholderText('Enter a username')
    const createUsernameButton = screen.getByText('Register')
    await userEvent.type(createUsernameInput, 'bob')
    await userEvent.click(createUsernameButton)

    // Wait for the actions that updates the store
    await act(async () => {})

    // Check if 'username taken' error message disappeared
    expect(await screen.queryByText(ErrorMessages.USERNAME_TAKEN)).toBeNull()

    expect(actions).toMatchInlineSnapshot()
  })
})
