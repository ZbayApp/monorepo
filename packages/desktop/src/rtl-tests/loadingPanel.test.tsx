import React from 'react'
import '@testing-library/jest-dom/extend-expect'
import { screen, waitFor } from '@testing-library/react'
import { renderComponent } from '../renderer/testUtils/renderComponent'
import { prepareStore } from '../renderer/testUtils/prepareStore'
import { StoreKeys } from '../renderer/store/store.keys'
import { socketActions, SocketState } from '../renderer/sagas/socket/socket.slice'
import LoadingPanel from '../renderer/components/LoadingPanel/LoadingPanel'
import CreateUsername from '../renderer/components/CreateUsername/CreateUsername'
import MockedSocket from 'socket.io-mock'
import { ioMock } from '../shared/setupTests'
import {
  communities,
  identity,
  getFactory,
  publicChannels,
  network,
  LoadingPanelType,
  connection,
} from '@quiet/state-manager'
import { DateTime } from 'luxon'
import { act } from '@testing-library/react'
import { modalsActions } from '../renderer/sagas/modals/modals.slice'
import { ModalName } from '../renderer/sagas/modals/modals.types'
import { createLogger } from './logger'
import { SocketActionTypes, Identity, CreateUserCsrPayload, UserCsr, RegisterCertificatePayload } from '@quiet/types'
import { createUserCertificateTestHelper } from '@quiet/identity'

const logger = createLogger('loadingPanel')

jest.setTimeout(20_000)
const mockNotification = jest.fn()
const notification = jest.fn().mockImplementation(() => {
  return mockNotification
})
// @ts-expect-error
window.Notification = notification

describe('Loading panel', () => {
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

  it.skip('Displays loading panel before connecting websocket', async () => {
    // todo loading panel in other electron window
    logger.info('Displays loading panel before connecting websocket')
    const { store } = await prepareStore({
      [StoreKeys.Socket]: {
        ...new SocketState(),
        isConnected: false,
      },
    })
    logger.info('rendering component')
    renderComponent(
      <>
        <LoadingPanel />
      </>,
      store
    )

    // Verify loading panel is visible
    logger.info('Verify loading panel is visible')
    expect(screen.getByTestId('startingPanelComponent')).toBeVisible()

    // Verify proper messages is displayed
    logger.info('Verify proper messages is displayed')
    const startingApplicationMessage = screen.getByText(LoadingPanelType.StartingApplication)
    expect(startingApplicationMessage).toBeVisible()

    logger.info('Dispatching setConnected')
    store.dispatch(socketActions.setConnected())

    logger.info('Waiting for act')
    await act(async () => {})

    // Verify loading panel disappeared
    logger.info('Verify starting panel disappeared')
    expect(screen.queryByTestId('startingPanelComponent')).toBeNull()
  })

  it('Displays loading panel between registering username and replicating data', async () => {
    logger.info('Displays loading panel between registering username and replicating data')
    const { store } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    const factory = await getFactory(store)

    const community = (await factory.build<typeof communities.actions.addNewCommunity>('Community')).payload

    logger.info('Adding new community')
    await act(async () => {
      store.dispatch(communities.actions.addNewCommunity(community))
    })
    await act(async () => {
      store.dispatch(communities.actions.setCurrentCommunity(community.id))
    })

    const channel = (
      await factory.build<typeof publicChannels.actions.addChannel>('PublicChannel', {
        communityId: community.id,
        channel: {
          name: 'general',
          description: 'Welcome to #general',
          timestamp: DateTime.utc().valueOf(),
          owner: 'owner',
          id: 'general',
        },
      })
    ).payload

    await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'alice',
    })

    logger.info('Setting community and opening modal')
    await act(async () => {
      store.dispatch(communities.actions.addNewCommunity(community))
    })
    await act(async () => {
      store.dispatch(communities.actions.setCurrentCommunity(community.id))
    })
    await act(async () => {
      store.dispatch(network.actions.setLoadingPanelType(LoadingPanelType.Joining))
    })
    await act(async () => {
      store.dispatch(modalsActions.openModal({ name: ModalName.loadingPanel }))
    })
    logger.info('Rendering component')
    await act(async () => {
      renderComponent(
        <>
          <LoadingPanel />
        </>,
        store
      )
    })
    // Verify loading panel is visible
    logger.info('Verify loading panel is visible')
    expect(screen.getByTestId('joiningPanelComponent')).toBeVisible()

    // Verify proper messages is displayed
    logger.info('Verify proper messages is displayed')
    const startingApplicationMessage = screen.getByText('Joining now!')
    expect(startingApplicationMessage).toBeVisible()

    logger.info('Dispatching addChannel')
    await act(async () => {
      store.dispatch(publicChannels.actions.addChannel(channel))
    })
    logger.info('Dispatching closeModal done')
    await act(async () => {
      store.dispatch(modalsActions.closeModal(ModalName.loadingPanel))
    })

    // Verify loading panel dissapeared
    expect(screen.queryByTestId('joiningPanelComponent')).toBeNull()
  })

  it('Do not display Loading panel when community and identity are created but user csr is missing', async () => {
    const { store } = await prepareStore(
      {},
      socket // Fork state manager's sagas
    )

    const factory = await getFactory(store)

    const community = (await factory.build<typeof communities.actions.addNewCommunity>('Community')).payload

    act(() => {
      store.dispatch(communities.actions.addNewCommunity(community))
    })
    act(() => {
      store.dispatch(communities.actions.setCurrentCommunity(community.id))
    })
    const originalIdentity: Identity = await factory.create<
      ReturnType<typeof identity.actions.addNewIdentity>['payload']
    >('Identity', {
      id: community.id,
      nickname: 'alice',
      userCertificate: null,
      userCsr: null,
    })

    logger.info('Community and identity created, testing that userCsr is missing')
    expect(store.getState().Identity.identities.entities[community.id]?.userCsr).toBeNull()

    logger.info('Rendering component')
    renderComponent(
      <>
        <LoadingPanel />
        <CreateUsername />
      </>,
      store
    )

    logger.info('CreateUsernameModal should be opened')
    expect(screen.queryByTestId('createUsernameModalActions')).not.toBeNull()

    // Assertions that we don't see Loading Pannel
    logger.info('Loading panel should not be visible')
    expect(screen.queryByTestId('spinnerLoader')).toBeNull()

    const userCertData = await createUserCertificateTestHelper({
      nickname: originalIdentity.nickname,
      commonName: originalIdentity.nickname,
      peerId: originalIdentity.peerId.id,
    })

    const userCsr: UserCsr = userCertData.userCsr
    await act(async () => {
      store.dispatch(identity.actions.updateIdentity({ ...originalIdentity, userCsr: userCsr }))
    })

    const receivedIdentity = store.getState().Identity.identities.entities[community.id]
    expect(receivedIdentity?.userCsr).not.toBeNull()

    await waitFor(() => expect(screen.queryByTestId('createUsernameModalActions')).toBeNull())
  })
})
