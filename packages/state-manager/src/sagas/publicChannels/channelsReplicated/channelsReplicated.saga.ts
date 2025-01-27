import { type PayloadAction } from '@reduxjs/toolkit'
import { select, take, putResolve } from 'typed-redux-saga'
import { publicChannelsSelectors } from '../publicChannels.selectors'
import { publicChannelsActions } from '../publicChannels.slice'
import { messagesSelectors } from '../../messages/messages.selectors'
import { messagesActions } from '../../messages/messages.slice'
import { communitiesSelectors } from '../../communities/communities.selectors'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('channelsReplicatedSaga')

export function* channelsReplicatedSaga(
  action: PayloadAction<ReturnType<typeof publicChannelsActions.channelsReplicated>['payload']>
): Generator {
  // TODO: Refactor to use QuietLogger
  logger.info(`Syncing channels: ${JSON.stringify(action.payload, null, 2)}`)

  const { channels } = action.payload
  const _locallyStoredChannels = yield* select(publicChannelsSelectors.publicChannels)
  const locallyStoredChannels = _locallyStoredChannels.map(channel => channel.id)
  const databaseStoredChannels = channels
  const databaseStoredChannelsIds = databaseStoredChannels.map(channel => channel.id)

  logger.info({ locallyStoredChannels, databaseStoredChannelsIds })

  // Upserting channels to local storage
  for (const channel of databaseStoredChannels) {
    if (!locallyStoredChannels.includes(channel.id)) {
      // TODO: Refactor to use QuietLogger
      logger.info(`Adding #${channel.name} to store`)
      yield* putResolve(
        publicChannelsActions.addChannel({
          channel,
        })
      )
      yield* putResolve(
        messagesActions.addPublicChannelsMessagesBase({
          channelId: channel.id,
        })
      )
    }
  }

  // Removing channels from store
  if (databaseStoredChannelsIds.length > 0) {
    for (const channelId of locallyStoredChannels) {
      if (!databaseStoredChannelsIds.includes(channelId)) {
        // TODO: Refactor to use QuietLogger
        logger.info(`Removing #${channelId} from store`)
        yield* putResolve(publicChannelsActions.deleteChannel({ channelId }))
        yield* take(publicChannelsActions.completeChannelDeletion)
      }
    }
  }

  const currentChannelCache = yield* select(publicChannelsSelectors.currentChannelMessages)
  const currentChannelRepository = yield* select(messagesSelectors.currentPublicChannelMessagesEntries)

  // (On collecting data from persist) Populating displayable data
  if (currentChannelCache.length < 1 && currentChannelRepository.length > 0) {
    yield* putResolve(messagesActions.resetCurrentPublicChannelCache())
  }

  const community = yield* select(communitiesSelectors.currentCommunity)

  if (!community?.CA && databaseStoredChannels.find(channel => channel.name === 'general')) {
    yield* putResolve(publicChannelsActions.sendIntroductionMessage())
  }
}
