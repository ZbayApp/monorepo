import { type PayloadAction } from '@reduxjs/toolkit'
import { select, call, put } from 'typed-redux-saga'
import { messagesActions } from '../messages.slice'
import { MessageType, userJoinedMessage, type MessageVerificationStatus } from '@quiet/types'
import { publicChannelsSelectors } from '../../publicChannels/publicChannels.selectors'
import { messagesSelectors } from '../messages.selectors'
import { usersSelectors } from '../../users/users.selectors'

export function* verifyMessagesSaga(
  action: PayloadAction<ReturnType<typeof messagesActions.incomingMessages>>['payload']
): Generator {
  const messages = action.payload.messages

  for (const message of messages) {
    // ----------------------------------------------------------------------------
    const generalChannel = yield* select(publicChannelsSelectors.generalChannel)
    if (!generalChannel) return

    if (message.type === MessageType.Info && message.channelId === generalChannel.id) {
      const getMessagesFromGeneralByPubKey = yield* select(
        messagesSelectors.getMessagesFromGeneralByPubKey(message.pubKey)
      )

      const allUsers = yield* select(usersSelectors.allUsers)

      const username = allUsers[message.pubKey].username

      const expectedMessage = yield* call(userJoinedMessage, username)

      if (getMessagesFromGeneralByPubKey[0].message !== expectedMessage) {
        console.log('black list logic here')
      }
    }
    // ----------------------------------------------------------------------------
    const verificationStatus: MessageVerificationStatus = {
      publicKey: message.pubKey,
      signature: message.signature,
      isVerified: Boolean(action.payload.isVerified),
    }

    yield* put(messagesActions.addMessageVerificationStatus(verificationStatus))
  }
}
