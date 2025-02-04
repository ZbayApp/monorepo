import { PayloadAction } from '@reduxjs/toolkit'
import { select, delay, put } from 'typed-redux-saga'
import { communities, getInvitationCodes } from '@quiet/state-manager'
import { ScreenNames } from '../../../const/ScreenNames.enum'
import { navigationActions } from '../../navigation/navigation.slice'
import { initSelectors } from '../init.selectors'
import { initActions } from '../init.slice'
import { appImages } from '../../../assets'
import { replaceScreen } from '../../../RootNavigation'
import { CommunityOwnership, CreateNetworkPayload, InvitationData, InvitationDataVersion } from '@quiet/types'
import _ from 'lodash'
import {
  AlreadyBelongToCommunityWarning,
  InvalidInvitationLinkError,
  JoiningAnotherCommunityWarning,
} from '@quiet/common'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('deepLink')

export function* deepLinkSaga(action: PayloadAction<ReturnType<typeof initActions.deepLink>['payload']>): Generator {
  const code = action.payload

  logger.info('INIT_NAVIGATION: Waiting for websocket connection before proceeding with deep link flow.')

  while (true) {
    const connected = yield* select(initSelectors.isWebsocketConnected)
    if (connected) {
      break
    }
    yield* delay(500)
  }

  logger.info('INIT_NAVIGATION: Continuing on deep link flow.')

  // Reset deep link flag for future redirections sake
  yield* put(initActions.resetDeepLink())

  let data: InvitationData
  try {
    data = getInvitationCodes(code)
  } catch (e) {
    logger.error(e)
    yield* put(
      navigationActions.replaceScreen({
        screen: ScreenNames.ErrorScreen,
        params: {
          onPress: () => replaceScreen(ScreenNames.JoinCommunityScreen),
          icon: appImages.quiet_icon_round,
          title: InvalidInvitationLinkError.TITLE,
          message: InvalidInvitationLinkError.MESSAGE,
        },
      })
    )
    return
  }

  const community = yield* select(communities.selectors.currentCommunity)

  const isAlreadyConnected = Boolean(community?.name)

  // User already belongs to a community
  if (isAlreadyConnected) {
    logger.info('INIT_NAVIGATION: Displaying error (user already belongs to a community).')

    yield* put(
      navigationActions.replaceScreen({
        screen: ScreenNames.ErrorScreen,
        params: {
          onPress: () => replaceScreen(ScreenNames.ChannelListScreen),
          icon: appImages.quiet_icon_round,
          title: AlreadyBelongToCommunityWarning.TITLE,
          message: AlreadyBelongToCommunityWarning.MESSAGE,
        },
      })
    )

    return
  }

  let isJoiningAnotherCommunity = false

  let storedPsk: string | undefined = undefined
  let currentPsk: string | undefined = undefined
  switch (data.version) {
    case InvitationDataVersion.v1:
      storedPsk = yield* select(communities.selectors.psk)
      currentPsk = data.psk
      isJoiningAnotherCommunity = Boolean(storedPsk && storedPsk !== currentPsk)
      break
    case InvitationDataVersion.v2: // Question: should we also check if the sig chain team name is different or something?  is the psk enough?
      storedPsk = yield* select(communities.selectors.psk)
      currentPsk = data.psk
      isJoiningAnotherCommunity = Boolean(storedPsk && storedPsk !== currentPsk)
      break
  }

  const connectingWithAnotherCommunity = isJoiningAnotherCommunity && !isAlreadyConnected

  if (connectingWithAnotherCommunity) {
    logger.info('INIT_NAVIGATION: Displaying error (user is already connecting to another community).')

    yield* put(
      navigationActions.replaceScreen({
        screen: ScreenNames.ErrorScreen,
        params: {
          onPress: () => replaceScreen(ScreenNames.UsernameRegistrationScreen),
          icon: appImages.quiet_icon_round,
          title: JoiningAnotherCommunityWarning.TITLE,
          message: JoiningAnotherCommunityWarning.MESSAGE,
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

  yield* put(
    navigationActions.replaceScreen({
      screen: ScreenNames.UsernameRegistrationScreen,
    })
  )
}
