import { PayloadAction } from '@reduxjs/toolkit'
import { select, put, take, apply } from 'typed-redux-saga'
import { identityActions } from '../identity.slice'
import { Socket, applyEmitParams } from '../../../types'
import { communitiesActions } from '../../communities/communities.slice'
import { communitiesSelectors } from '../../communities/communities.selectors'
import { SocketActionTypes, Identity, InitUserCsrPayload } from '@quiet/types'
import { createLogger } from '../../../utils/logger'
import { identitySelectors } from '../identity.selectors'

const logger = createLogger('registerUsernameSaga')

export function* registerUsernameSaga(
  socket: Socket,
  action: PayloadAction<ReturnType<typeof identityActions.registerUsername>['payload']>
): Generator {
  logger.info('Registering username', action.payload.nickname)

  // Nickname can differ between saga calls

  const { nickname, isUsernameTaken = false } = action.payload

  let community = yield* select(communitiesSelectors.currentCommunity)
  if (!community) {
    logger.warn('Community missing, waiting...')
    yield* take(communitiesActions.addNewCommunity)
  }
  community = yield* select(communitiesSelectors.currentCommunity)
  if (!community) {
    logger.error('Could not register username, no community data')
    return
  }
  logger.info(`Found community ${community?.id} has CA?: ${community?.CA !== null}`)

  // **Wait for identity to be available before proceeding.**
  let identity = yield* select(identitySelectors.currentIdentity)
  if (!identity) {
    logger.info('Identity not present, waiting for identity to be added.')
    // This will block until the addNewIdentity action is dispatched.
    const actionIdentity: ReturnType<typeof identityActions.addNewIdentity> = yield* take(
      identityActions.addNewIdentity
    )
    identity = actionIdentity.payload
  }

  logger.info('Emitting CREATE_USER_CSR')
  const payload: InitUserCsrPayload = { communityId: community.id, nickname, isUsernameTaken }
  identity = yield* apply(socket, socket.emitWithAck, applyEmitParams(SocketActionTypes.CREATE_USER_CSR, payload))

  if (!identity) {
    logger.error('Failed to create identity')
    return
  }
  yield* put(identityActions.updateIdentity(identity))

  if (community.CA?.rootCertString) {
    yield* put(communitiesActions.createCommunity(community.id))
  } else if (!isUsernameTaken) {
    logger.info('Username is not taken, launching community')
    yield* put(communitiesActions.launchCommunity(community.id))
  }
}
