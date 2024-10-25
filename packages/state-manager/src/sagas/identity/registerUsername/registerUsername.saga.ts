import { PayloadAction } from '@reduxjs/toolkit'
import { select, put, take, apply } from 'typed-redux-saga'
import { identityActions } from '../identity.slice'
import { Socket, applyEmitParams } from '../../../types'
import { communitiesActions } from '../../communities/communities.slice'
import { communitiesSelectors } from '../../communities/communities.selectors'
import { SocketActionTypes, Identity, InitUserCsrPayload } from '@quiet/types'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('registerUsernameSaga')

export function* registerUsernameSaga(
  socket: Socket,
  action: PayloadAction<ReturnType<typeof identityActions.registerUsername>['payload']>
): Generator {
  logger.info('Registering username')

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

  logger.info('Emitting CREATE_USER_CSR')
  const payload: InitUserCsrPayload = { communityId: community.id, nickname, isUsernameTaken }
  const identity: Identity = yield* apply(
    socket,
    socket.emitWithAck,
    applyEmitParams(SocketActionTypes.CREATE_USER_CSR, payload)
  )

  yield* put(identityActions.updateIdentity(identity))

  if (community.CA?.rootCertString) {
    yield* put(communitiesActions.createCommunity(community.id))
  } else if (!isUsernameTaken) {
    logger.info('Username is not taken, launching community')
    yield* put(communitiesActions.launchCommunity(community.id))
  }
}
