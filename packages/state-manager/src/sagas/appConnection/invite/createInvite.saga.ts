import { apply, select, putResolve } from 'typed-redux-saga'
import { type PayloadAction } from '@reduxjs/toolkit'
import { InviteResult } from '@localfirst/auth'

import { SocketActionTypes } from '@quiet/types'

import { applyEmitParams, type Socket } from '../../../types'
import { connectionActions } from '../connection.slice'
import { connectionSelectors } from '../connection.selectors'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('connection:invite:createInvite')

export function* createInviteSaga(
  socket: Socket,
  action: PayloadAction<ReturnType<typeof connectionActions.createInvite>['payload']>
): Generator {
  logger.info('Creating LFA invite code')
  logger.info('Getting existing long lived invite code')
  const existingLongLivedInvite: InviteResult | undefined = yield* select(connectionSelectors.longLivedInvite)
  logger.info('Validating existing long lived invite code')
  const lfaInviteData: { valid: boolean; newInvite?: InviteResult } | undefined = yield* apply(
    socket,
    socket.emitWithAck,
    applyEmitParams(SocketActionTypes.VALIDATE_OR_CREATE_LONG_LIVED_LFA_INVITE, existingLongLivedInvite?.id)
  )
  if (!lfaInviteData?.valid && lfaInviteData?.newInvite != null) {
    logger.info(`Existing long-lived invite was invalid, the invite has been replaced`)
    yield* putResolve(connectionActions.setLongLivedInvite(lfaInviteData.newInvite))
  } else if (!lfaInviteData?.valid && lfaInviteData?.newInvite == null) {
    logger.warn(
      `Existing invalid was missing or undefined and we failed to generate a new one - your sig chain may not be configured!`
    )
  }
}
