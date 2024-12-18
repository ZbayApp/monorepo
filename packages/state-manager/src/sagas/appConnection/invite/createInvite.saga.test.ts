import { combineReducers } from '@reduxjs/toolkit'
import { expectSaga } from 'redux-saga-test-plan'
import { prepareStore } from '../../../utils/tests/prepareStore'
import { connectionActions } from '../connection.slice'
import { setupCrypto } from '@quiet/identity'
import { reducers } from '../../reducers'
import { createInviteSaga } from './createInvite.saga'
import { SocketActionTypes } from '@quiet/types'
import { Socket } from '../../../types'
import { longLivedInvite } from '../connection.selectors'
import { Base58 } from '3rd-party/auth/packages/crypto/dist'

describe('createInvite', () => {
  it('create invite sets nothing when no sig chain is configured', async () => {
    setupCrypto()

    const socket = {
      emit: jest.fn(),
      emitWithAck: jest.fn(() => {
        return {}
      }),
      on: jest.fn(),
    } as unknown as Socket

    const store = prepareStore().store

    const reducer = combineReducers(reducers)
    await expectSaga(createInviteSaga, socket, connectionActions.createInvite({}))
      .withReducer(reducer)
      .withState(store.getState())
      .select(longLivedInvite)
      .apply(socket, socket.emitWithAck, [SocketActionTypes.VALIDATE_OR_CREATE_LONG_LIVED_LFA_INVITE, undefined])
      .run()
  })

  it('create invite sets nothing when the long lived invite is already valid', async () => {
    setupCrypto()

    const socket = {
      emit: jest.fn(),
      emitWithAck: jest.fn(() => {
        return {
          valid: true,
        }
      }),
      on: jest.fn(),
    } as unknown as Socket

    const store = prepareStore().store

    const existingInvite = {
      seed: '5ah8uYodiwuwVybT',
      id: '5ah8uYodiwuwVybT' as Base58,
    }
    store.dispatch(connectionActions.setLongLivedInvite(existingInvite))

    const reducer = combineReducers(reducers)
    await expectSaga(createInviteSaga, socket, connectionActions.createInvite({}))
      .withReducer(reducer)
      .withState(store.getState())
      .select(longLivedInvite)
      .apply(socket, socket.emitWithAck, [
        SocketActionTypes.VALIDATE_OR_CREATE_LONG_LIVED_LFA_INVITE,
        existingInvite.id,
      ])
      .run()
  })
})

it('create invite updates long lived invite when the existing invite data is undefined', async () => {
  setupCrypto()

  const newInvite = {
    seed: '5ah8uYodiwuwVybT',
    id: '5ah8uYodiwuwVybT' as Base58,
  }

  const socket = {
    emit: jest.fn(),
    emitWithAck: jest.fn(() => {
      return {
        valid: false,
        newInvite,
      }
    }),
    on: jest.fn(),
  } as unknown as Socket

  const store = prepareStore().store

  const reducer = combineReducers(reducers)
  await expectSaga(createInviteSaga, socket, connectionActions.createInvite({}))
    .withReducer(reducer)
    .withState(store.getState())
    .select(longLivedInvite)
    .apply(socket, socket.emitWithAck, [SocketActionTypes.VALIDATE_OR_CREATE_LONG_LIVED_LFA_INVITE, undefined])
    .putResolve(connectionActions.setLongLivedInvite(newInvite))
    .run()
})

it('create invite updates long lived invite when the existing invite data is defined but invalid', async () => {
  setupCrypto()

  const newInvite = {
    seed: '5ah8uYodiwuwVybT',
    id: '5ah8uYodiwuwVybT' as Base58,
  }

  const socket = {
    emit: jest.fn(),
    emitWithAck: jest.fn(() => {
      return {
        valid: false,
        newInvite,
      }
    }),
    on: jest.fn(),
  } as unknown as Socket

  const store = prepareStore().store
  const existingInvite = {
    seed: '8ah8uYodiwuwVyb5',
    id: '8ah8uYodiwuwVyb5' as Base58,
  }
  store.dispatch(connectionActions.setLongLivedInvite(existingInvite))

  const reducer = combineReducers(reducers)
  await expectSaga(createInviteSaga, socket, connectionActions.createInvite({}))
    .withReducer(reducer)
    .withState(store.getState())
    .select(longLivedInvite)
    .apply(socket, socket.emitWithAck, [SocketActionTypes.VALIDATE_OR_CREATE_LONG_LIVED_LFA_INVITE, existingInvite.id])
    .putResolve(connectionActions.setLongLivedInvite(newInvite))
    .run()
})
