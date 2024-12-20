import { setupCrypto } from '@quiet/identity'
import { type Store } from '../../store.types'
import { prepareStore } from '../../../utils/tests/prepareStore'
import { generateMessageFactoryContentWithId, getFactory, messages, publicChannels } from '../../..'
import { type FactoryGirl } from 'factory-girl'
import { combineReducers } from 'redux'
import { reducers } from '../../reducers'
import { expectSaga } from 'redux-saga-test-plan'
import { publicChannelsActions } from './../publicChannels.slice'
import { type identityActions } from '../../identity/identity.slice'
import { type communitiesActions } from '../../communities/communities.slice'
import { channelsReplicatedSaga } from './channelsReplicated.saga'
import { DateTime } from 'luxon'
import { publicChannelsSelectors } from '../publicChannels.selectors'
import { messagesActions } from '../../messages/messages.slice'
import { type Community, type Identity, type PublicChannel } from '@quiet/types'
import { generateChannelId } from '@quiet/common'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('channelsReplicatedSaga-test')

describe('channelsReplicatedSaga', () => {
  let store: Store
  let factory: FactoryGirl

  let community: Community
  let alice: Identity

  let generalChannel: PublicChannel

  let sailingChannel: PublicChannel
  let photoChannel: PublicChannel

  beforeAll(async () => {
    setupCrypto()

    store = prepareStore().store
    factory = await getFactory(store)

    community = await factory.create<ReturnType<typeof communitiesActions.addNewCommunity>['payload']>('Community')

    alice = await factory.create<ReturnType<typeof identityActions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'alice',
    })

    const generalChannelState = publicChannelsSelectors.generalChannel(store.getState())
    if (generalChannelState) generalChannel = generalChannelState
    expect(generalChannel).not.toBeUndefined()

    store.dispatch(publicChannelsActions.setCurrentChannel({ channelId: generalChannel.id }))
    sailingChannel = (
      await factory.build<typeof publicChannelsActions.addChannel>('PublicChannel', {
        communityId: community.id,
        channel: {
          name: 'sailing',
          description: 'Welcome to #sailing',
          timestamp: DateTime.utc().valueOf(),
          owner: 'owner',
          id: generateChannelId('sailing'),
        },
      })
    ).payload.channel

    photoChannel = (
      await factory.build<typeof publicChannelsActions.addChannel>('PublicChannel', {
        communityId: community.id,
        channel: {
          name: 'photo',
          description: 'Welcome to #photo',
          timestamp: DateTime.utc().valueOf(),
          owner: 'owner',
          id: generateChannelId('photo'),
        },
      })
    ).payload.channel
  })

  test('save replicated channels in local storage', async () => {
    logger.info({ generalChannel })
    const reducer = combineReducers(reducers)
    await expectSaga(
      channelsReplicatedSaga,
      publicChannelsActions.channelsReplicated({
        channels: [sailingChannel, generalChannel],
      })
    )
      .withReducer(reducer)
      .withState(store.getState())
      .putResolve(
        publicChannelsActions.addChannel({
          channel: sailingChannel,
        })
      )
      .run()
  })

  test('do not modify already stored channel', async () => {
    const reducer = combineReducers(reducers)
    await expectSaga(
      channelsReplicatedSaga,
      publicChannelsActions.channelsReplicated({
        channels: [generalChannel, sailingChannel],
      })
    )
      .withReducer(reducer)
      .withState(store.getState())
      .not.putResolve(
        publicChannelsActions.addChannel({
          channel: generalChannel,
        })
      )
      .putResolve(
        publicChannelsActions.addChannel({
          channel: sailingChannel,
        })
      )
      .run()
  })

  test('Add replicated channel to local store and create corresponding messages base', async () => {
    const reducer = combineReducers(reducers)
    await expectSaga(
      channelsReplicatedSaga,
      publicChannelsActions.channelsReplicated({
        channels: [sailingChannel, generalChannel],
      })
    )
      .withReducer(reducer)
      .withState(store.getState())
      .putResolve(
        publicChannelsActions.addChannel({
          channel: sailingChannel,
        })
      )
      .putResolve(
        messagesActions.addPublicChannelsMessagesBase({
          channelId: sailingChannel.id,
        })
      )
      .run()
  })

  test('Do not perform adding channel and messages base actions if channel is already stored', async () => {
    const reducer = combineReducers(reducers)
    await expectSaga(
      channelsReplicatedSaga,
      publicChannelsActions.channelsReplicated({
        channels: [generalChannel, sailingChannel],
      })
    )
      .withReducer(reducer)
      .withState(store.getState())
      .putResolve(
        publicChannelsActions.addChannel({
          channel: sailingChannel,
        })
      )
      .putResolve(
        messagesActions.addPublicChannelsMessagesBase({
          channelId: sailingChannel.id,
        })
      )
      .not.putResolve(
        publicChannelsActions.addChannel({
          channel: generalChannel,
        })
      )
      .not.putResolve(
        messagesActions.addPublicChannelsMessagesBase({
          channelId: generalChannel.id,
        })
      )
      .run()
  })

  test('populate channel cache on collecting data from persist', async () => {
    const message = await factory.create<ReturnType<typeof publicChannels.actions.test_message>['payload']>('Message', {
      identity: alice,
      message: generateMessageFactoryContentWithId(generalChannel.id),
    })

    store.dispatch(
      publicChannels.actions.cacheMessages({
        messages: [],
        channelId: generalChannel.id,
      })
    )

    const reducer = combineReducers(reducers)
    await expectSaga(
      channelsReplicatedSaga,
      publicChannelsActions.channelsReplicated({
        channels: [generalChannel, sailingChannel],
      })
    )
      .withReducer(reducer)
      .withState(store.getState())
      .putResolve(messages.actions.resetCurrentPublicChannelCache())
      .run()
  })

  test('do not reset channel cache if already populated', async () => {
    const message = await factory.create<ReturnType<typeof publicChannels.actions.test_message>['payload']>('Message', {
      identity: alice,
      message: generateMessageFactoryContentWithId(generalChannel.id),
    })

    const reducer = combineReducers(reducers)
    await expectSaga(
      channelsReplicatedSaga,
      publicChannelsActions.channelsReplicated({
        channels: [generalChannel, sailingChannel],
      })
    )
      .withReducer(reducer)
      .withState(store.getState())
      .not.putResolve(messages.actions.resetCurrentPublicChannelCache())
      .run()
  })

  test('remove channel from store if it doesnt exist in the payload from the backend', async () => {
    store.dispatch(publicChannelsActions.addChannel({ channel: photoChannel }))

    const reducer = combineReducers(reducers)
    await expectSaga(
      channelsReplicatedSaga,
      publicChannelsActions.channelsReplicated({
        channels: [generalChannel, sailingChannel],
      })
    )
      .withReducer(reducer)
      .withState(store.getState())
      .putResolve(publicChannelsActions.deleteChannel({ channelId: photoChannel.id }))
      .dispatch(publicChannelsActions.completeChannelDeletion({}))
      .putResolve(
        publicChannelsActions.addChannel({
          channel: sailingChannel,
        })
      )
      .run()
  })

  test('bug replication - dont delete when channels object from database is empty', async () => {
    const reducer = combineReducers(reducers)
    await expectSaga(
      channelsReplicatedSaga,
      publicChannelsActions.channelsReplicated({
        channels: [],
      })
    )
      .withReducer(reducer)
      .withState(store.getState())
      .not.putResolve(publicChannelsActions.deleteChannel({ channelId: generalChannel.id }))
      .run()
  })
})
