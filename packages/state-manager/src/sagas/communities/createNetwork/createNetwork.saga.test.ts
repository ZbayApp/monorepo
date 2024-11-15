import { combineReducers } from '@reduxjs/toolkit'
import { expectSaga } from 'redux-saga-test-plan'
import { call } from 'redux-saga-test-plan/matchers'
import { Time } from 'pkijs'
import { prepareStore } from '../../../utils/tests/prepareStore'
import { communitiesActions } from '../communities.slice'
import { createRootCA, setupCrypto } from '@quiet/identity'
import { reducers } from '../../reducers'
import { createNetworkSaga } from './createNetwork.saga'
import { generateId } from '../../../utils/cryptography/cryptography'
import {
  type Community,
  CommunityOwnership,
  InvitationDataV1,
  InvitationDataVersion,
  InvitationDataV2,
} from '@quiet/types'
import { Socket } from '../../../types'
import { validInvitationDatav1, validInvitationDatav2 } from '@quiet/common'

describe('createNetwork', () => {
  it('create network for joining user with v1 invitation link', async () => {
    setupCrypto()

    const socket = {
      emit: jest.fn(),
      emitWithAck: jest.fn(() => {
        return {}
      }),
      on: jest.fn(),
    } as unknown as Socket

    const store = prepareStore().store

    const community: Community = {
      id: '1',
      name: undefined,
      CA: null,
      rootCa: undefined,
    }

    const inviteData: InvitationDataV1 = validInvitationDatav1[0]
    inviteData.version = InvitationDataVersion.v1
    const savedCommunity: Community = {
      ...community,
      psk: inviteData.psk,
      ownerOrbitDbIdentity: inviteData.ownerOrbitDbIdentity,
      inviteData,
    }

    const reducer = combineReducers(reducers)
    await expectSaga(
      createNetworkSaga,
      socket,
      communitiesActions.createNetwork({
        ownership: CommunityOwnership.User,
        inviteData,
      })
    )
      .withReducer(reducer)
      .withState(store.getState())
      .provide([[call.fn(generateId), community.id]])
      .not.call(createRootCA)
      .call(generateId)
      .put(communitiesActions.setInvitationCodes(inviteData.pairs))
      .put(communitiesActions.addNewCommunity(savedCommunity))
      .put(communitiesActions.setCurrentCommunity(community.id))
      .run()
  })

  // TODO: https://github.com/TryQuiet/quiet/issues/2628
  // it('create network for joining user with v2 invitation link', async () => {
  //   setupCrypto()

  //   const socket = {
  //     emit: jest.fn(),
  //     emitWithAck: jest.fn(() => {
  //       return {}
  //     }),
  //     on: jest.fn(),
  //   } as unknown as Socket

  //   const store = prepareStore().store

  //   const community: Community = {
  //     id: '1',
  //     name: undefined,
  //     CA: null,
  //     rootCa: undefined,
  //   }

  //   const inviteData: InvitationDataV2 = validInvitationDatav2[0]

  //   const savedCommunity: Community = {
  //     ...community,
  //     inviteData,
  //   }

  //   const reducer = combineReducers(reducers)
  //   await expectSaga(
  //     createNetworkSaga,
  //     socket,
  //     communitiesActions.createNetwork({
  //       ownership: CommunityOwnership.User,
  //       inviteData,
  //     })
  //   )
  //     .withReducer(reducer)
  //     .withState(store.getState())
  //     .provide([[call.fn(generateId), community.id]])
  //     .not.call(createRootCA)
  //     .call(generateId)
  //     .put(communitiesActions.addNewCommunity(savedCommunity))
  //     .put(communitiesActions.setCurrentCommunity(community.id))
  //     .run()
  // })

  it('create network for owner', async () => {
    setupCrypto()

    const socket = {
      emit: jest.fn(),
      emitWithAck: jest.fn(() => {
        return {}
      }),
      on: jest.fn(),
    } as unknown as Socket

    const store = prepareStore().store

    const CA = {
      rootCertString: 'rootCertString',
      rootKeyString: 'rootKeyString',
    }

    const community: Community = {
      id: '1',
      name: 'rockets',
      CA,
      rootCa: CA.rootCertString,
      inviteData: undefined,
    }

    const reducer = combineReducers(reducers)
    await expectSaga(
      createNetworkSaga,
      socket,
      communitiesActions.createNetwork({
        ownership: CommunityOwnership.Owner,
        name: 'rockets',
      })
    )
      .withReducer(reducer)
      .withState(store.getState())
      .provide([
        [call.fn(createRootCA), CA],
        [call.fn(generateId), community.id],
      ])
      .call(
        createRootCA,
        new Time({ type: 0, value: new Date(Date.UTC(2010, 11, 28, 10, 10, 10)) }),
        new Time({ type: 0, value: new Date(Date.UTC(2030, 11, 28, 10, 10, 10)) }),
        'rockets'
      )
      .call(generateId)
      .put(communitiesActions.addNewCommunity(community))
      .put(communitiesActions.setCurrentCommunity(community.id))
      .run()
  })
})
