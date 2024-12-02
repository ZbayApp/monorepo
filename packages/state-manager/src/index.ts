import { useIO } from './sagas/socket/startConnection/startConnection.saga'

import { reducers } from './sagas/reducers'

import { appActions } from './sagas/app/app.slice'

import {
  publicChannelsReducer,
  publicChannelsActions,
  PublicChannelsState,
} from './sagas/publicChannels/publicChannels.slice'

import { publicChannelsSelectors } from './sagas/publicChannels/publicChannels.selectors'
import { publicChannelsMasterSaga } from './sagas/publicChannels/publicChannels.master.saga'

import { usersReducer, usersActions, UsersState } from './sagas/users/users.slice'
import { usersSelectors } from './sagas/users/users.selectors'
import { userProfileSelectors } from './sagas/users/userProfile/userProfile.selectors'

import { identityReducer, identityActions, IdentityState } from './sagas/identity/identity.slice'

import { identitySelectors } from './sagas/identity/identity.selectors'

import { messagesActions, messagesReducer } from './sagas/messages/messages.slice'

import { messagesSelectors } from './sagas/messages/messages.selectors'

import { errorsSelectors } from './sagas/errors/errors.selectors'
import { errorsReducer, errorsActions } from './sagas/errors/errors.slice'

import { communitiesActions, communitiesReducer, CommunitiesState } from './sagas/communities/communities.slice'

import { communitiesSelectors } from './sagas/communities/communities.selectors'

import { StoreKeys } from './sagas/store.keys'

import { connectionActions, connectionReducer } from './sagas/appConnection/connection.slice'
import { connectionSelectors } from './sagas/appConnection/connection.selectors'

import { settingsActions, settingsReducer, SettingsState } from './sagas/settings/settings.slice'
import { settingsSelectors } from './sagas/settings/settings.selectors'

import { filesActions, filesReducer } from './sagas/files/files.slice'
import { filesSelectors } from './sagas/files/files.selectors'
import { networkActions, networkReducer } from './sagas/network/network.slice'
import { networkSelectors } from './sagas/network/network.selectors'

// Workaround for "The inferred type of '(...)' cannot be named without a reference to
// 'packages/identity/node_modules/pkijs/build'. This is likely not portable. A type annotation is necessary."
// https://github.com/microsoft/TypeScript/issues/47663#issuecomment-1270716220
import type {} from 'pkijs'
export { LoadingPanelType } from './sagas/network/network.types'
export type { Store } from './sagas/store.types'
export type { TestStore, TestStoreState } from './utils/tests/types'
export { StoreKeys } from './sagas/store.keys'
export { storeMigrations } from './sagas/store.migrations'

export { prepareStore } from './utils/tests/prepareStore'
export { useIO } from './sagas/socket/startConnection/startConnection.saga'

export { getFactory, generateMessageFactoryContentWithId } from './utils/tests/factories'
export * from './utils/tests/helpers'

export { communitiesAdapter } from './sagas/communities/communities.adapter'
export { certificatesAdapter } from './sagas/users/users.adapter'

export { publicChannelsAdapter, channelMessagesAdapter } from './sagas/publicChannels/publicChannels.adapter'

export { identityAdapter } from './sagas/identity/identity.adapter'

export { CommunitiesTransform } from './sagas/communities/communities.transform'
export { PublicChannelsTransform } from './sagas/publicChannels/publicChannels.transform'
export { MessagesTransform } from './sagas/messages/messages.transform'
export { FilesTransform } from './sagas/files/files.transform'
export { ConnectionTransform } from './sagas/appConnection/connection.transform'
export { UsersTransform } from './sagas/users/users.transform'
export { resetStateAndSaveTorConnectionData } from './sagas/appConnection/connection.helpers'
export * from './constants'

export { formatBytes } from './utils/functions/formatBytes/formatBytes'

export { getInvitationLinks as getInvitationCodes } from './utils/functions/invitationCode/invitationCode'

export type { Socket } from './types'

export * from './sagas/identity/identity.types'

export * from './sagas/communities/communities.types'

export * from './sagas/users/users.types'

export * from './sagas/users/const/certFieldTypes'

export * from './sagas/publicChannels/publicChannels.types'

export * from './sagas/messages/messages.types'

export * from './sagas/files/files.types'

export * from './sagas/errors/errors.types'

export * from './sagas/settings/settings.types'

export * from './sagas/appConnection/connection.types'

export const app = {
  actions: appActions,
}

export const settings = {
  reducer: settingsReducer,
  State: SettingsState,
  selectors: settingsSelectors,
  actions: settingsActions,
}

export const publicChannels = {
  reducer: publicChannelsReducer,
  State: PublicChannelsState,
  selectors: publicChannelsSelectors,
  actions: publicChannelsActions,
  sagas: publicChannelsMasterSaga,
}

export const users = {
  reducer: usersReducer,
  State: UsersState,
  actions: usersActions,
  selectors: { ...usersSelectors, ...userProfileSelectors },
}

export const identity = {
  reducer: identityReducer,
  State: IdentityState,
  actions: identityActions,
  selectors: identitySelectors,
}

export const messages = {
  reducer: messagesReducer,
  actions: messagesActions,
  selectors: messagesSelectors,
}

export const errors = {
  reducer: errorsReducer,
  actions: errorsActions,
  selectors: errorsSelectors,
}

export const communities = {
  reducer: communitiesReducer,
  State: CommunitiesState,
  actions: communitiesActions,
  selectors: communitiesSelectors,
}

export const connection = {
  reducer: connectionReducer,
  actions: connectionActions,
  selectors: connectionSelectors,
}

export const files = {
  reducer: filesReducer,
  actions: filesActions,
  selectors: filesSelectors,
}

export const network = {
  reducer: networkReducer,
  actions: networkActions,
  selectors: networkSelectors,
}

export const socket = {
  useIO,
}

export const storeKeys = StoreKeys

export default {
  app,
  publicChannels,
  users,
  identity,
  messages,
  errors,
  communities,
  connection,
  reducers,
  storeKeys,
  settings,
}
