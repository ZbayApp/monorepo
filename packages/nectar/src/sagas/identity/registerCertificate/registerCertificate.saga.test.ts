import { combineReducers } from '@reduxjs/toolkit'
import { expectSaga } from 'redux-saga-test-plan'
import { Socket } from 'socket.io-client'
import {
  communitiesReducer,
  CommunitiesState,
  Community
} from '../../communities/communities.slice'
import { SocketActionTypes } from '../../socket/const/actionTypes'
import { StoreKeys } from '../../store.keys'
import { identityAdapter } from '../identity.adapter'
import {
  identityActions,
  identityReducer,
  IdentityState
} from '../identity.slice'
import { CertData, Identity, RegisterCertificatePayload, UserCsr } from '../identity.types'
import { registerCertificateSaga } from './registerCertificate.saga'

describe('registerCertificateSaga', () => {
  test('request certificate registration when user is community owner', async () => {
    const identity: Identity = {
      id: 'id',
      nickname: 'bartekDev',
      hiddenService: {
        onionAddress: 'onionAddress.onion',
        privateKey: 'privateKey'
      },
      dmKeys: { publicKey: 'publicKey', privateKey: 'privateKey' },
      peerId: { id: 'peerId', pubKey: 'pubKey', privKey: 'privKey' },
      userCsr: undefined,
      userCertificate: ''
    }
    const community: Community = {
      name: 'communityName',
      id: 'id',
      CA: { rootCertString: 'certString', rootKeyString: 'keyString' },
      registrarUrl: '',
      rootCa: '',
      peerList: [],
      registrar: null,
      onionAddress: '',
      privateKey: '',
      port: 0
    }
    const socket = { emit: jest.fn(), on: jest.fn() } as unknown as Socket
    const userCsr: UserCsr = {
      userCsr: 'userCsr',
      userKey: 'userKey',
      pkcs10: jest.fn() as unknown as CertData
    }
    const communityId = 'id'
    const registrarAddress = 'wzispgrbrrkt3bari4kljpqz2j6ozzu3vlsoi2wqupgu7ewi4ncibrid'
    const registerCertificatePayload: RegisterCertificatePayload = {
      registrarAddress: registrarAddress,
      communityId: communityId,
      userCsr: userCsr
    }
    await expectSaga(
      registerCertificateSaga,
      socket,
      identityActions.registerCertificate(registerCertificatePayload)
    )
      .withReducer(
        combineReducers({
          [StoreKeys.Communities]: communitiesReducer,
          [StoreKeys.Identity]: identityReducer
        }),
        {
          [StoreKeys.Communities]: {
            ...new CommunitiesState(),
            currentCommunity: 'id',
            communities: {
              ids: ['id'],
              entities: {
                id: community
              }
            }
          },
          [StoreKeys.Identity]: {
            ...new IdentityState(),
            identities: identityAdapter.setAll(identityAdapter.getInitialState(), [identity])
          }
        }
      )
      .apply(socket, socket.emit, [
        SocketActionTypes.REGISTER_OWNER_CERTIFICATE,
        {
          id: communityId,
          userCsr: userCsr.userCsr,
          permsData: {
            certificate: community.CA.rootCertString,
            privKey: community.CA.rootKeyString
          }
        }
      ])
      .not.apply(socket, socket.emit, [
        SocketActionTypes.REGISTER_USER_CERTIFICATE,
        {
          id: communityId,
          userCsr: userCsr.userCsr,
          serviceAddress: registrarAddress
        }
      ])
      .run()
  })
  test('request certificate registration when user is not community owner', async () => {
    const socket = { emit: jest.fn(), on: jest.fn() } as unknown as Socket
    const communityId = 'id'
    const community: Community = {
      name: 'communityName',
      id: communityId,
      CA: undefined,
      rootCa: '',
      peerList: [],
      registrarUrl: '',
      registrar: null,
      onionAddress: '',
      privateKey: '',
      port: 0
    }
    const userCsr: UserCsr = {
      userCsr: 'userCsr',
      userKey: 'userKey',
      pkcs10: jest.fn() as unknown as CertData
    }
    const registrarAddress = 'wzispgrbrrkt3bari4kljpqz2j6ozzu3vlsoi2wqupgu7ewi4ncibrid'
    const registerCertificatePayload: RegisterCertificatePayload = {
      registrarAddress: registrarAddress,
      communityId: communityId,
      userCsr: userCsr
    }
    await expectSaga(
      registerCertificateSaga,
      socket,
      identityActions.registerCertificate(registerCertificatePayload)
    )
      .withReducer(combineReducers({ [StoreKeys.Communities]: communitiesReducer }), {
        [StoreKeys.Communities]: {
          ...new CommunitiesState(),
          currentCommunity: communityId,
          communities: {
            ids: ['id'],
            entities: {
              id: community
            }
          }
        }
      })
      .apply(socket, socket.emit, [
        SocketActionTypes.REGISTER_USER_CERTIFICATE,
        {
          id: communityId,
          userCsr: userCsr.userCsr,
          serviceAddress: `http://${registrarAddress}.onion`
        }
      ])
      .not.apply(socket, socket.emit, [
        SocketActionTypes.REGISTER_OWNER_CERTIFICATE,
        {
          id: communityId,
          userCsr: userCsr.userCsr,
          permsData: {
            certificate: community.CA?.rootCertString,
            privKey: community.CA?.rootKeyString
          }
        }
      ])
      .run()
  })
})
