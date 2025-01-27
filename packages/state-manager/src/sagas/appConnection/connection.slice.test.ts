import { type Store } from 'redux'
import { connectionSelectors } from './connection.selectors'
import { connectionActions } from './connection.slice'
import { type identityActions } from '../identity/identity.slice'
import { prepareStore } from '../../utils/tests/prepareStore'

import { setupCrypto } from '@quiet/identity'
import { networkActions } from '../network/network.slice'
import { initializedCommunities, networkSelectors } from '../network/network.selectors'
import { Community, ConnectionProcessInfo, PublicChannel, type Identity, ChannelMessage } from '@quiet/types'
import { usersSelectors } from '../users/users.selectors'
import { communitiesSelectors } from '../communities/communities.selectors'
import { communitiesActions } from '../communities/communities.slice'
import { publicChannelsSelectors } from '../publicChannels/publicChannels.selectors'
import { generateMessageFactoryContentWithId, getFactory, publicChannels } from '../..'

describe('connectionReducer', () => {
  let store: Store
  let alice: Identity
  let community: Community
  let generalChannel: PublicChannel
  let generalChannelId: string

  beforeEach(async () => {
    setupCrypto()

    store = prepareStore().store

    const factory = await getFactory(store)

    alice = await factory.create<ReturnType<typeof identityActions.addNewIdentity>['payload']>('Identity', {
      nickname: 'alice',
    })

    community = await factory.create<ReturnType<typeof communitiesActions.addNewCommunity>['payload']>('Community')

    const generalChannelState = publicChannelsSelectors.generalChannel(store.getState())
    if (generalChannelState) generalChannel = generalChannelState
    expect(generalChannel).not.toBeUndefined()
    expect(generalChannel).toBeDefined()
    generalChannelId = generalChannel?.id || ''

    await factory.create<ReturnType<typeof publicChannels.actions.test_message>['payload']>('Message', {
      identity: alice,
      message: generateMessageFactoryContentWithId(generalChannelId),
      verifyAutomatically: true,
    })
  })

  it('add initialized communities should add correctly data into the store', () => {
    const communityId = 'communityId'
    store.dispatch(networkActions.addInitializedCommunity(communityId))

    const communities = networkSelectors.initializedCommunities(store.getState())
    expect(communities).toEqual({ [communityId]: true })
  })

  it('add connected users peerId from store and get it correctly', () => {
    const peersIds = ['peerId1', 'peerId2']

    store.dispatch(networkActions.addConnectedPeers(peersIds))

    const connectedPeersFromStore = networkSelectors.connectedPeers(store.getState())

    expect(connectedPeersFromStore).toEqual(['peerId1', 'peerId2'])
  })

  it('user data mapping by peerId', () => {
    const allUsers = usersSelectors.allUsers(store.getState())
    const _pubKey = Object.values(allUsers).map(item => {
      if (item.username === 'alice') {
        return item.pubKey
      }
    })
    const pubKey = _pubKey[0]
    const aliceCertData = {
      username: alice.nickname,
      onionAddress: alice.hiddenService.onionAddress,
      peerId: alice.peerId.id,
      isDuplicated: false,
      isRegistered: true,
      pubKey,
    }

    store.dispatch(networkActions.addConnectedPeers([alice.peerId.id]))
    const userDataPerPeerId = connectionSelectors.connectedPeersMapping(store.getState())
    expect(userDataPerPeerId[alice.peerId.id]).toEqual(aliceCertData)
  })

  it('set connectionProcess', () => {
    const payload2 = ConnectionProcessInfo.INITIALIZING_IPFS

    store.dispatch(connectionActions.setConnectionProcess({ info: payload2, isOwner: false }))

    const { number, text } = connectionSelectors.connectionProcess(store.getState())

    expect(number).toEqual(30)

    expect(text).toEqual(ConnectionProcessInfo.BACKEND_MODULES)
  })

  it('isJoiningCompleted - false', async () => {
    const isJoiningCompleted = connectionSelectors.isJoiningCompleted(store.getState())

    expect(isJoiningCompleted).toBeFalsy()
  })

  it('isJoiningCompleted - true', async () => {
    store.dispatch(networkActions.addInitializedCommunity('1'))

    const isJoiningCompleted = connectionSelectors.isJoiningCompleted(store.getState())

    expect(isJoiningCompleted).toBeFalsy()
  })
})
