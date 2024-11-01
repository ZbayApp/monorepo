import { type Socket, applyEmitParams } from '../../../types'
import { select, apply, putResolve } from 'typed-redux-saga'
import { type PayloadAction } from '@reduxjs/toolkit'
import { identityActions } from '../../identity/identity.slice'
import { communitiesSelectors } from '../communities.selectors'
import { communitiesActions } from '../communities.slice'
import { identitySelectors } from '../../identity/identity.selectors'
import { publicChannelsActions } from '../../publicChannels/publicChannels.slice'
import { type Community, type InitCommunityPayload, SocketActionTypes } from '@quiet/types'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('createCommunitySaga')

export function* createCommunitySaga(
  socket: Socket,
  action: PayloadAction<ReturnType<typeof communitiesActions.createCommunity>['payload']>
): Generator {
  logger.info('Creating community')

  let communityId: string = action.payload

  if (!communityId) {
    communityId = yield* select(communitiesSelectors.currentCommunityId)
  }

  logger.info('Community ID:', communityId)

  const community = yield* select(communitiesSelectors.selectById(communityId))
  const identity = yield* select(identitySelectors.selectById(communityId))

  if (!identity) {
    logger.error('Could not create community - identity missing')
    return
  }

  const payload: InitCommunityPayload = {
    id: communityId,
    name: community?.name,
    CA: community?.CA,
    rootCa: community?.rootCa,
  }

  const createdCommunity: Community | undefined = yield* apply(
    socket,
    socket.emitWithAck,
    applyEmitParams(SocketActionTypes.CREATE_COMMUNITY, payload)
  )

  if (!createdCommunity || !createdCommunity.ownerCertificate) {
    logger.error('Failed to create community - invalid response from backend')
    return
  }

  yield* putResolve(communitiesActions.updateCommunityData(createdCommunity))

  yield* putResolve(
    identityActions.storeUserCertificate({
      communityId: createdCommunity.id,
      userCertificate: createdCommunity.ownerCertificate,
    })
  )

  yield* putResolve(publicChannelsActions.createGeneralChannel())
}
