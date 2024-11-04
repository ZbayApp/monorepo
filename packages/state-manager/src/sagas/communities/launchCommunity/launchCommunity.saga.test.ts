import { combineReducers } from '@reduxjs/toolkit'
import { prepareStore, reducers } from '../../../utils/tests/prepareStore'
import { getFactory } from '../../../utils/tests/factories'
import { expectSaga } from 'redux-saga-test-plan'
import { type Socket } from 'socket.io-client'
import { identityAdapter } from '../../identity/identity.adapter'
import { identityActions, identityReducer, IdentityState } from '../../identity/identity.slice'
import { StoreKeys } from '../../store.keys'
import { communitiesAdapter } from '../communities.adapter'
import { communitiesActions, communitiesReducer, CommunitiesState } from '../communities.slice'
import { type Store } from '../../store.types'

import { initCommunities, launchCommunitySaga } from './launchCommunity.saga'
import { setupCrypto } from '@quiet/identity'
import { type FactoryGirl } from 'factory-girl'
import { connectionReducer, ConnectionState } from '../../appConnection/connection.slice'
import { type InitCommunityPayload, SocketActionTypes } from '@quiet/types'

describe('launchCommunity', () => {
  let store: Store
  let factory: FactoryGirl

  beforeAll(async () => {
    setupCrypto()
    store = prepareStore().store
    factory = await getFactory(store)
  })

  test('launch all remembered communities', async () => {
    const community1 =
      await factory.create<ReturnType<typeof communitiesActions.addNewCommunity>['payload']>('Community')
    await factory.create<ReturnType<typeof identityActions.addNewIdentity>['payload']>('Identity', {
      id: community1.id,
      nickname: 'alice1',
    })

    const community2 =
      await factory.create<ReturnType<typeof communitiesActions.addNewCommunity>['payload']>('Community')
    await factory.create<ReturnType<typeof identityActions.addNewIdentity>['payload']>('Identity', {
      id: community2.id,
      nickname: 'alice2',
    })

    const community3 =
      await factory.create<ReturnType<typeof communitiesActions.addNewCommunity>['payload']>('Community')
    await factory.create<ReturnType<typeof identityActions.addNewIdentity>['payload']>('Identity', {
      id: community3.id,
      nickname: 'alice3',
    })

    const reducer = combineReducers(reducers)
    await expectSaga(initCommunities)
      .withReducer(reducer)
      .withState(store.getState())
      .put(communitiesActions.launchCommunity(community1.id))
      .put(communitiesActions.launchCommunity(community2.id))
      .put(communitiesActions.launchCommunity(community3.id))
      .run()
  })

  test('launch certain community instead of current community', async () => {
    const socket = { emit: jest.fn(), emitWithAck: jest.fn(), on: jest.fn() } as unknown as Socket

    const community =
      await factory.create<ReturnType<typeof communitiesActions.addNewCommunity>['payload']>('Community')

    const identity = await factory.create<ReturnType<typeof identityActions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'john',
    })
    const communityWithRootCa = {
      ...community,
      rootCa: 'rootCA',
    }
    const launchCommunityPayload: InitCommunityPayload = {
      id: community.id,
      peers: community.peerList,
      psk: undefined,
      ownerOrbitDbIdentity: undefined,
      inviteData: undefined,
    }

    await expectSaga(launchCommunitySaga, socket, communitiesActions.launchCommunity(community.id))
      .withReducer(
        combineReducers({
          [StoreKeys.Communities]: communitiesReducer,
          [StoreKeys.Identity]: identityReducer,
          [StoreKeys.Connection]: connectionReducer,
        }),
        {
          [StoreKeys.Communities]: {
            ...new CommunitiesState(),
            currentCommunity: community.id,
            communities: communitiesAdapter.setAll(communitiesAdapter.getInitialState(), [communityWithRootCa]),
          },
          [StoreKeys.Identity]: {
            ...new IdentityState(),
            identities: identityAdapter.setAll(identityAdapter.getInitialState(), [identity]),
          },
          [StoreKeys.Connection]: {
            ...new ConnectionState(),
          },
        }
      )
      .apply(socket, socket.emitWithAck, [SocketActionTypes.LAUNCH_COMMUNITY, launchCommunityPayload])
      .run()
  })

  test('launch current community', async () => {
    const socket = { emit: jest.fn(), emitWithAck: jest.fn(), on: jest.fn() } as unknown as Socket

    const community =
      await factory.create<ReturnType<typeof communitiesActions.addNewCommunity>['payload']>('Community')
    const communityWithRootCa = {
      ...community,
      rootCa: 'rootCA',
    }
    const identity = await factory.create<ReturnType<typeof identityActions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'john',
    })

    const launchCommunityPayload: InitCommunityPayload = {
      id: community.id,
      peers: community.peerList,
      psk: undefined,
      ownerOrbitDbIdentity: undefined,
      inviteData: undefined,
    }

    await expectSaga(launchCommunitySaga, socket, communitiesActions.launchCommunity(community.id))
      .withReducer(
        combineReducers({
          [StoreKeys.Communities]: communitiesReducer,
          [StoreKeys.Identity]: identityReducer,
          [StoreKeys.Connection]: connectionReducer,
        }),
        {
          [StoreKeys.Communities]: {
            ...new CommunitiesState(),
            currentCommunity: community.id,
            communities: communitiesAdapter.setAll(communitiesAdapter.getInitialState(), [communityWithRootCa]),
          },
          [StoreKeys.Identity]: {
            ...new IdentityState(),
            identities: identityAdapter.setAll(identityAdapter.getInitialState(), [identity]),
          },
          [StoreKeys.Connection]: {
            ...new ConnectionState(),
          },
        }
      )
      .apply(socket, socket.emitWithAck, [SocketActionTypes.LAUNCH_COMMUNITY, launchCommunityPayload])
      .run()
  })

  test('do not launch current community if it does not have rootCa', async () => {
    const socket = { emit: jest.fn(), emitWithAck: jest.fn(), on: jest.fn() } as unknown as Socket

    const community =
      await factory.create<ReturnType<typeof communitiesActions.addNewCommunity>['payload']>('Community')
    expect(community.rootCa).toBeUndefined()
    const identity = await factory.create<ReturnType<typeof identityActions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'john',
    })

    const launchCommunityPayload: InitCommunityPayload = {
      id: community.id,
      peers: community.peerList,
    }

    await expectSaga(launchCommunitySaga, socket, communitiesActions.launchCommunity(community.id))
      .withReducer(
        combineReducers({
          [StoreKeys.Communities]: communitiesReducer,
          [StoreKeys.Identity]: identityReducer,
          [StoreKeys.Connection]: connectionReducer,
        }),
        {
          [StoreKeys.Communities]: {
            ...new CommunitiesState(),
            currentCommunity: community.id,
            communities: communitiesAdapter.setAll(communitiesAdapter.getInitialState(), [community]),
          },
          [StoreKeys.Identity]: {
            ...new IdentityState(),
            identities: identityAdapter.setAll(identityAdapter.getInitialState(), [identity]),
          },
          [StoreKeys.Connection]: {
            ...new ConnectionState(),
          },
        }
      )
      .not.apply(socket, socket.emitWithAck, [SocketActionTypes.LAUNCH_COMMUNITY, launchCommunityPayload])
      .run()
  })

  test.skip('launch and register unregistered member and launch registered member to community', async () => {
    setupCrypto()
    const store = prepareStore().store
    const factory = await getFactory(store)

    const community1 =
      await factory.create<ReturnType<typeof communitiesActions.addNewCommunity>['payload']>('Community')

    const community2 =
      await factory.create<ReturnType<typeof communitiesActions.addNewCommunity>['payload']>('Community')

    const identityAlpha = await factory.create<ReturnType<typeof identityActions.addNewIdentity>['payload']>(
      'Identity',
      { id: community1.id, nickname: 'john' }
    )

    const identityBeta = await factory.create<ReturnType<typeof identityActions.addNewIdentity>['payload']>(
      'Identity',
      { id: community2.id, nickname: 'john' }
    )

    await expectSaga(initCommunities)
      .withReducer(
        combineReducers({
          [StoreKeys.Communities]: communitiesReducer,
          [StoreKeys.Identity]: identityReducer,
        }),
        {
          [StoreKeys.Communities]: store.getState().Communities,
          [StoreKeys.Identity]: {
            ...new IdentityState(),
            identities: identityAdapter.setAll(identityAdapter.getInitialState(), [identityAlpha, identityBeta]),
          },
        }
      )
      .put(identityActions.registerUsername({ nickname: identityAlpha.nickname }))
      .put(communitiesActions.launchCommunity(community2.id))
      .run()
  })
})
