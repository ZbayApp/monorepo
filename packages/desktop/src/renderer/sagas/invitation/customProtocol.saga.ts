import { PayloadAction } from '@reduxjs/toolkit'
import { select, put, delay } from 'typed-redux-saga'
import { CommunityOwnership, CreateNetworkPayload, InvitationData, InvitationDataVersion } from '@quiet/types'
import { communities } from '@quiet/state-manager'
import { socketSelectors } from '../socket/socket.selectors'
import { ModalName } from '../modals/modals.types'
import { modalsActions } from '../modals/modals.slice'
import { argvInvitationLink } from '@quiet/common'
import {
  AlreadyBelongToCommunityWarning,
  InvalidInvitationLinkError,
  JoiningAnotherCommunityWarning,
} from '@quiet/common'
import _ from 'lodash'
import { createLogger } from '../../logger'

const logger = createLogger('customProtocol')

export function* customProtocolSaga(
  action: PayloadAction<ReturnType<typeof communities.actions.customProtocol>['payload']>
): Generator {
  const code = action.payload
  logger.info('Custom protocol', code)
  logger.info('Waiting for websocket connection before proceeding with deep link flow.')

  while (true) {
    const connected = yield* select(socketSelectors.isConnected)
    if (connected) {
      break
    }
    yield* delay(500)
  }

  logger.info('Continuing on deep link flow.')

  let data: InvitationData | null

  try {
    data = argvInvitationLink(code)
  } catch (e) {
    logger.warn(e)
    yield* put(
      modalsActions.openModal({
        name: ModalName.warningModal,
        args: {
          title: InvalidInvitationLinkError.TITLE,
          subtitle: InvalidInvitationLinkError.MESSAGE,
        },
      })
    )
    return
  }

  if (data === null) {
    logger.warn(`Not processing invitation code ${code}`)
    return
  }

  const community = yield* select(communities.selectors.currentCommunity)

  const isAlreadyConnected = Boolean(community?.name)

  // User already belongs to a community
  if (isAlreadyConnected) {
    logger.warn('Displaying error (user already belongs to a community).')
    yield* put(
      modalsActions.openModal({
        name: ModalName.warningModal,
        args: {
          title: AlreadyBelongToCommunityWarning.TITLE,
          subtitle: AlreadyBelongToCommunityWarning.MESSAGE,
        },
      })
    )
    return
  }

  let isJoiningAnotherCommunity = false

  switch (data.version) {
    case InvitationDataVersion.v1:
      const storedPsk = yield* select(communities.selectors.psk)
      const currentPsk = data.psk
      isJoiningAnotherCommunity = Boolean(storedPsk && storedPsk !== currentPsk)
      break
    case InvitationDataVersion.v2:
      const inviteData = yield* select(communities.selectors.inviteData)
      isJoiningAnotherCommunity = Boolean(inviteData && !_.isEqual(inviteData, data))
      break
  }

  const connectingWithAnotherCommunity = isJoiningAnotherCommunity && !isAlreadyConnected

  if (connectingWithAnotherCommunity) {
    logger.warn('Displaying error (user is already connecting to another community).')
    yield* put(
      modalsActions.openModal({
        name: ModalName.warningModal,
        args: {
          title: JoiningAnotherCommunityWarning.TITLE,
          subtitle: JoiningAnotherCommunityWarning.MESSAGE,
        },
      })
    )

    return
  }

  const payload: CreateNetworkPayload = {
    ownership: CommunityOwnership.User,
    inviteData: data,
  }

  yield* put(communities.actions.createNetwork(payload))
}
