import React from 'react'
import '@testing-library/jest-native/extend-expect'
import { act } from '@testing-library/react-native'
import { AnyAction } from 'redux'
import { take } from 'typed-redux-saga'
import MockedSocket from 'socket.io-mock'
import { ioMock } from '../setupTests'
import { prepareStore } from './utils/prepareStore'
import { renderComponent } from './utils/renderComponent'
import { initActions } from '../store/init/init.slice'
import { validInvitationCodeTestData, getValidInvitationUrlTestData } from '@quiet/common'
import { communities, createPeerIdTestHelper } from '@quiet/state-manager'
import { NetworkInfo, SocketActionTypes, socketEventData } from '@quiet/types'

const mockEmitImpl = async (...input: [SocketActionTypes, ...socketEventData<[any]>]) => {
  const action = input[0]
  if (action === SocketActionTypes.CREATE_NETWORK) {
    const data: NetworkInfo = {
      hiddenService: {
        onionAddress: 'onionAddress',
        privateKey: 'privateKey',
      },
      peerId: createPeerIdTestHelper(),
    }
    return data
  }
}

describe('Deep linking', () => {
  let socket: MockedSocket

  beforeEach(async () => {
    socket = new MockedSocket()
    ioMock.mockImplementation(() => socket)
    jest.spyOn(socket, 'emit').mockImplementation(mockEmitImpl)
    // @ts-ignore
    socket.emitWithAck = mockEmitImpl
  })

  test('does not override network data if triggered twice', async () => {
    const { store, runSaga, root } = await prepareStore({}, socket)

    // Log all the dispatched actions in order
    const actions: AnyAction[] = []
    runSaga(function* (): Generator {
      while (true) {
        const action = yield* take()
        actions.push(action.type)
      }
    })

    renderComponent(<></>, store)

    store.dispatch(initActions.deepLink(getValidInvitationUrlTestData(validInvitationCodeTestData[0]).code()))
    await act(async () => {})

    const originalPair = communities.selectors.invitationCodes(store.getState())

    // Redo the action to provoke renewed saga runs
    store.dispatch(initActions.deepLink(getValidInvitationUrlTestData(validInvitationCodeTestData[1]).code()))
    await act(async () => {})

    const currentPair = communities.selectors.invitationCodes(store.getState())

    expect(originalPair).toEqual(currentPair)

    expect(actions).toMatchInlineSnapshot(`
      [
        "Init/deepLink",
        "Init/resetDeepLink",
        "Communities/createNetwork",
        "Communities/setInvitationCodes",
        "Navigation/replaceScreen",
        "Communities/addNewCommunity",
        "Communities/setCurrentCommunity",
        "Init/deepLink",
        "Init/resetDeepLink",
        "Navigation/replaceScreen",
      ]
    `)

    // Stop state-manager sagas
    root?.cancel()
  })
})
