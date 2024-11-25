import React from 'react'
import '@testing-library/jest-dom/extend-expect'
import { act } from 'react-dom/test-utils'
import { AnyAction } from 'redux'
import { take } from 'typed-redux-saga'
import MockedSocket from 'socket.io-mock'
import { ioMock } from '../shared/setupTests'
import { prepareStore } from '../renderer/testUtils/prepareStore'
import { renderComponent } from '../renderer/testUtils/renderComponent'
import { getValidInvitationUrlTestData, validInvitationCodeTestData } from '@quiet/common'
import { communities } from '@quiet/state-manager'
import { createLogger } from './logger'
const logger = createLogger('deepLinking')

describe('Deep linking', () => {
  let socket: MockedSocket

  beforeEach(async () => {
    logger.info('Setting up mocked socket')
    socket = new MockedSocket()
    // @ts-ignore
    socket.emitWithAck = jest.fn()
    ioMock.mockImplementation(() => socket)
  })

  test('does not override network data if triggered twice', async () => {
    logger.info('does not override network data if triggered twice')
    const { store, runSaga } = await prepareStore({}, socket)
    logger.info('Store prepared')

    // Log all the dispatched actions in order
    const actions: AnyAction[] = []
    runSaga(function* (): Generator {
      while (true) {
        const action = yield* take()
        actions.push(action.type)
      }
    })

    logger.info('rendering component')
    renderComponent(<></>, store)
    logger.info('component rendered')

    logger.info('dispatching custom protocol')
    store.dispatch(
      communities.actions.customProtocol([getValidInvitationUrlTestData(validInvitationCodeTestData[0]).deepUrl()])
    )
    logger.info('custom protocol dispatched')
    await act(async () => {})
    logger.info('act done')

    const originalPair = communities.selectors.invitationCodes(store.getState())
    logger.info('originalPair', originalPair)
    // Redo the action to provoke renewed saga runs
    logger.info('dispatching second custom protocol')
    store.dispatch(
      communities.actions.customProtocol([getValidInvitationUrlTestData(validInvitationCodeTestData[1]).deepUrl()])
    )
    logger.info('second custom protocol dispatched')
    await act(async () => {})
    logger.info('act done')

    const currentPair = communities.selectors.invitationCodes(store.getState())
    logger.info('currentPair', currentPair)

    expect(originalPair).toEqual(currentPair)

    expect(actions).toMatchInlineSnapshot(`
      Array [
        "Communities/customProtocol",
        "Communities/createNetwork",
        "Communities/setInvitationCodes",
        "Communities/addNewCommunity",
        "Communities/setCurrentCommunity",
        "Communities/customProtocol",
        "Modals/openModal",
      ]
    `)
  })
})
