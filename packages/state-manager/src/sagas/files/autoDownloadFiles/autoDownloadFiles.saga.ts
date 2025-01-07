import { type PayloadAction } from '@reduxjs/toolkit'
import { type messagesActions } from '../../messages/messages.slice'
import { apply, put, select } from 'typed-redux-saga'
import { identitySelectors } from '../../identity/identity.selectors'
import { messagesSelectors } from '../../messages/messages.selectors'
import { AUTODOWNLOAD_SIZE_LIMIT } from '../../../constants'
import { filesActions } from '../files.slice'
import { applyEmitParams, type Socket } from '../../../types'
import { DownloadState, MessageType, SocketActionTypes } from '@quiet/types'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('autoDownloadFilesSaga')

export function* autoDownloadFilesSaga(
  socket: Socket,
  action: PayloadAction<ReturnType<typeof messagesActions.addMessages>['payload']>
): Generator {
  const identity = yield* select(identitySelectors.currentIdentity)
  if (!identity) {
    logger.error('Could not autodownload files, no identity')
    return
  }

  const { messages } = action.payload

  for (const message of messages) {
    // Proceed for images and files only
    if (!message.media || (message.type !== MessageType.Image && message.type !== MessageType.File)) return

    const channelMessages = yield* select(messagesSelectors.publicChannelMessagesEntities(message.channelId))

    const draft = channelMessages[message.id]

    // Do not download if already present in local file system
    if (draft?.media?.path) continue

    // Do not autodownload above certain size
    const messageMediaSize = message.media.size || 0
    if (messageMediaSize > AUTODOWNLOAD_SIZE_LIMIT) {
      yield* put(
        filesActions.updateDownloadStatus({
          mid: message.id,
          cid: message.media.cid,
          downloadState: DownloadState.Ready,
        })
      )
      continue
    }

    yield* put(
      filesActions.updateDownloadStatus({
        mid: message.id,
        cid: message.media.cid,
        downloadState: DownloadState.Queued,
      })
    )

    yield* apply(
      socket,
      socket.emit,
      applyEmitParams(SocketActionTypes.DOWNLOAD_FILE, {
        peerId: identity.peerId.id,
        metadata: message.media,
      })
    )
  }
}
