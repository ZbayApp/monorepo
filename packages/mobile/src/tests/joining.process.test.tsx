import React from 'react'
import '@testing-library/jest-native/extend-expect'
import { screen, fireEvent, act } from '@testing-library/react-native'
import MockedSocket from 'socket.io-mock'
import { ioMock } from '../setupTests'
import { prepareStore } from './utils/prepareStore'
import { renderComponent } from './utils/renderComponent'
import { FactoryGirl } from 'factory-girl'
import { getFactory, communities, identity, connection } from '@quiet/state-manager'
import { ScreenNames } from '../const/ScreenNames.enum'
import { ChannelListScreen } from '../screens/ChannelList/ChannelList.screen'
import { ConnectionProcessScreen } from '../screens/ConnectionProcess/ConnectionProcess.screen'
import { UsernameRegistrationScreen } from '../screens/UsernameRegistration/UsernameRegistration.screen'
import { ConnectionProcessInfo } from '@quiet/types'
import { createLogger } from '../utils/logger'

const logger = createLogger('joiningProcess:test')

describe('Joining process', () => {
  let socket: MockedSocket

  let factory: FactoryGirl

  beforeEach(async () => {
    socket = new MockedSocket()
    ioMock.mockImplementation(() => socket)
  })

  test('Check informations on connection process', async () => {
    const { store, root } = await prepareStore({}, socket)
    const userName = 'johnny'

    factory = await getFactory(store)

    const community = await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>(
      'Community'
    )

    renderComponent(
      <>
        <ConnectionProcessScreen />
        <ChannelListScreen />
      </>,
      store
    )

    await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: userName,
    })
    await act(async () => {})

    const connectionProcessScreen = screen.getByTestId('connection-process-component')

    expect(connectionProcessScreen).toBeVisible()

    const processText = screen.getByTestId('connection-process-text')
    expect(processText.props.children).toEqual(ConnectionProcessInfo.CONNECTION_STARTED)

    store.dispatch(
      connection.actions.setConnectionProcess({ info: ConnectionProcessInfo.INITIALIZING_IPFS, isOwner: true })
    )
    await act(async () => {})

    const processText2 = screen.getByTestId('connection-process-text')
    logger.info(processText2.props)
    expect(processText2.props.children).toEqual(ConnectionProcessInfo.BACKEND_MODULES)

    await act(async () => {})

    const channelList = screen.getByTestId('channels_list')

    expect(channelList).toBeVisible()

    // Stop state-manager sagas
    root?.cancel()
  })

  test('Check flow from registering username to connecting process screen', async () => {
    const { store, root } = await prepareStore({}, socket)
    const userName = 'johnny'

    factory = await getFactory(store)

    const community = await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>(
      'Community'
    )

    const route: { key: string; name: ScreenNames.UsernameRegistrationScreen; path?: string | undefined } = {
      key: '',
      name: ScreenNames.UsernameRegistrationScreen,
    }
    renderComponent(
      <>
        <UsernameRegistrationScreen route={route} />
        <ConnectionProcessScreen />
      </>,
      store
    )

    const registrationScreen = screen.getByTestId('username-registration-component')

    expect(registrationScreen).toBeVisible()

    const input = screen.getByPlaceholderText('Enter a username')
    expect(input).toBeVisible()

    fireEvent.changeText(input, userName)
    const button = screen.getByTestId('button')
    expect(button).toBeVisible()

    fireEvent.press(button)

    await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: userName,
    })
    await act(async () => {})

    const connectionProcessScreen = screen.getByTestId('connection-process-component')

    expect(connectionProcessScreen).toBeVisible()

    const processText = screen.getByTestId('connection-process-text')
    expect(processText.props.children).toEqual('Connecting process started')
    // Stop state-manager sagas
    root?.cancel()
  })
})
