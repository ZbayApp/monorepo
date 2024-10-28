import { combineReducers } from '@reduxjs/toolkit'
import { expectSaga } from 'redux-saga-test-plan'
import * as matchers from 'redux-saga-test-plan/matchers'
import { setupCrypto, createUserCsr, type UserCsr, getPubKey, loadPrivateKey, pubKeyFromCsr } from '@quiet/identity'
import { prepareStore } from '../../../utils/tests/prepareStore'
import { getFactory } from '../../../utils/tests/factories'
import { reducers } from '../../reducers'
import { identityActions } from '../identity.slice'
import { registerUsernameSaga } from './registerUsername.saga'
import { communitiesActions } from '../../communities/communities.slice'
import { config } from '../../users/const/certFieldTypes'
import { CertData, CreateUserCsrPayload, InitUserCsrPayload, SocketActionTypes } from '@quiet/types'
import { Socket } from '../../../types'
import { communitiesSelectors } from '../../communities/communities.selectors'

describe('registerUsernameSaga', () => {
  it('create user csr', async () => {
    setupCrypto()

    const socket = {
      emit: jest.fn(),
      emitWithAck: jest.fn(() => {
        return {}
      }),
      on: jest.fn(),
    } as unknown as Socket

    const store = prepareStore().store

    const factory = await getFactory(store)

    const community =
      await factory.create<ReturnType<typeof communitiesActions.addNewCommunity>['payload']>('Community')

    expect(community.CA).not.toBeNull()

    // Identity won't have userCsr as long as its corresponding community has no CA (factory specific logic)
    const identity = await factory.create<ReturnType<typeof identityActions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: undefined,
      userCsr: null,
    })

    const userCsr: UserCsr = {
      userCsr: 'userCsr',
      userKey: 'userKey',
      pkcs10: jest.fn() as unknown as CertData,
    }

    const initUserCsrPayload: InitUserCsrPayload = {
      nickname: 'nickname',
      communityId: community.id,
      isUsernameTaken: false,
    }

    const reducer = combineReducers(reducers)
    await expectSaga(registerUsernameSaga, socket, identityActions.registerUsername({ nickname: 'nickname' }))
      .withReducer(reducer)
      .withState(store.getState())
      .provide([
        [matchers.select(communitiesSelectors.currentCommunity), community],
        [
          matchers.apply(socket, socket.emitWithAck, [SocketActionTypes.CREATE_USER_CSR, initUserCsrPayload]),
          { ...identity, userCsr },
        ],
      ])
      .put(identityActions.updateIdentity({ ...identity, userCsr }))
      .put(communitiesActions.createCommunity(community.id))
      .run()
  })

  it('username taken - use current CSR and new nickname', async () => {
    setupCrypto()
    const socket = {
      emit: jest.fn(),
      emitWithAck: jest.fn(() => {
        return {}
      }),
      on: jest.fn(),
    } as unknown as Socket

    const store = prepareStore().store

    const factory = await getFactory(store)

    const community = await factory.create<ReturnType<typeof communitiesActions.addNewCommunity>['payload']>(
      'Community',
      {
        CA: null,
      }
    )

    expect(community.CA).toBeNull()

    const oldNickname = 'john'
    const newNickname = 'paul'

    const userCsr: UserCsr = {
      userCsr: 'userCsr',
      userKey: 'userKey',
      pkcs10: jest.fn() as unknown as CertData,
    }

    const identity = await factory.create<ReturnType<typeof identityActions.addNewIdentity>['payload']>('Identity', {
      nickname: oldNickname,
      id: community.id,
      userCsr: userCsr,
    })

    const newUserCsr: UserCsr = {
      userCsr: 'newUserCsr',
      userKey: 'newUserKey',
      pkcs10: jest.fn() as unknown as CertData,
    }

    expect(identity.nickname).toBe(oldNickname)

    const initUserCsrPayload: InitUserCsrPayload = {
      nickname: newNickname,
      communityId: community.id,
      isUsernameTaken: true,
    }

    const reducer = combineReducers(reducers)
    await expectSaga(
      registerUsernameSaga,
      socket,
      identityActions.registerUsername({ nickname: newNickname, isUsernameTaken: true })
    )
      .withReducer(reducer)
      .withState(store.getState())
      .provide([
        [matchers.select(communitiesSelectors.currentCommunity), community],
        [
          matchers.apply(socket, socket.emitWithAck, [SocketActionTypes.CREATE_USER_CSR, initUserCsrPayload]),
          { ...identity, nickname: newNickname, userCsr: newUserCsr },
        ],
      ])
      .put(identityActions.updateIdentity({ ...identity, nickname: newNickname, userCsr: newUserCsr }))
      .run()
  })
})
