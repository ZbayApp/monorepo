import { combineReducers } from '@reduxjs/toolkit'
import { expectSaga } from 'redux-saga-test-plan'
import { call } from 'redux-saga-test-plan/matchers'
import { setupCrypto } from '@quiet/identity'
import { prepareStore } from '../../../utils/tests/prepareStore'
import { getFactory } from '../../../utils/tests/factories'
import { reducers } from '../../reducers'
import { identityActions } from '../identity.slice'
import { registerUsernameSaga } from './registerUsername.saga'
import { communitiesActions } from '../../communities/communities.slice'
import { createUserCsr, UserCsr } from '@quiet/identity'
import { CertData, CreateUserCsrPayload } from '../identity.types'
import { config } from '../../users/const/certFieldTypes'

describe('registerUsernameSaga', () => {
  it('create user csr', async () => {
    setupCrypto()
    const store = prepareStore().store

    const factory = await getFactory(store)

    const community = await factory.create<
      ReturnType<typeof communitiesActions.addNewCommunity>['payload']
    >('Community', {
      id: '1',
      name: 'rockets',
      registrarUrl: 'registrarUrl',
      CA: null,
      rootCa: 'rootCa',
      peerList: [],
      registrar: null,
      onionAddress: '',
      privateKey: '',
      port: 0
    })

    // Identity won't have userCsr as long as its corresponding community has no CA (factory specific logic)
    const identity = await factory.create<ReturnType<typeof identityActions.addNewIdentity>['payload']>('Identity', {
      id: community.id
    })

    const userCsr: UserCsr = {
      userCsr: 'userCsr',
      userKey: 'userKey',
      pkcs10: jest.fn() as unknown as CertData
    }

    const createUserCsrPayload: CreateUserCsrPayload = {
      nickname: 'username',
      commonName: identity.hiddenService.onionAddress,
      peerId: identity.peerId.id,
      dmPublicKey: identity.dmKeys.publicKey,
      signAlg: config.signAlg,
      hashAlg: config.hashAlg
    }

    const reducer = combineReducers(reducers)
    await expectSaga(registerUsernameSaga, identityActions.registerUsername('username'))
      .withReducer(reducer)
      .withState(store.getState())
      .provide([[call.fn(createUserCsr), userCsr]])
      .call(createUserCsr, createUserCsrPayload)
      .put(
        identityActions.registerCertificate({
          communityId: community.id,
          userCsr: userCsr
        })
      )
      .run()
  })

  it('reuse existing csr', async () => {
    setupCrypto()
    const store = prepareStore().store

    const factory = await getFactory(store)

    const community = await factory.create<
      ReturnType<typeof communitiesActions.addNewCommunity>['payload']
    >('Community', {
      id: '1',
      name: 'rockets',
      registrarUrl: 'registrarUrl',
      CA: null,
      rootCa: 'rootCa',
      peerList: [],
      registrar: null,
      onionAddress: '',
      privateKey: '',
      port: 0
    })

    const userCsr: UserCsr = {
      userCsr: 'userCsr',
      userKey: 'userKey',
      pkcs10: jest.fn() as unknown as CertData
    }

    let identity = (
      await factory.build<typeof identityActions.addNewIdentity>('Identity', {
        id: community.id
      })
    )['payload']

    identity.userCsr = userCsr

    store.dispatch(identityActions.addNewIdentity(identity))

    const reducer = combineReducers(reducers)
    await expectSaga(registerUsernameSaga, identityActions.registerUsername('username'))
      .withReducer(reducer)
      .withState(store.getState())
      .not.call(createUserCsr)
      .put(
        identityActions.registerCertificate({
          communityId: community.id,
          userCsr: userCsr
        })
      )
      .run()
  })
})
