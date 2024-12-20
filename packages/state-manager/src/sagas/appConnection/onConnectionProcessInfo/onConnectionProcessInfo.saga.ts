import { type PayloadAction } from '@reduxjs/toolkit'
import { select, putResolve } from 'typed-redux-saga'
import { connectionActions } from '../connection.slice'
import { communitiesSelectors } from '../../communities/communities.selectors'

export function* onConnectionProcessInfo(
  action: PayloadAction<ReturnType<typeof connectionActions.onConnectionProcessInfo>['payload']>
): Generator {
  const info = action.payload
  const community = yield* select(communitiesSelectors.currentCommunity)
  const isOwner = Boolean(community?.CA)

  yield* putResolve(connectionActions.setConnectionProcess({ info, isOwner }))
}
