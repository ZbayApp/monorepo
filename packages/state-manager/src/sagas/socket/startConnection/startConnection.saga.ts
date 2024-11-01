import { eventChannel } from 'redux-saga'
import { type Socket } from '../../../types'
import { all, call, fork, put, takeEvery, cancelled, select } from 'typed-redux-saga'
import { appActions } from '../../app/app.slice'
import { appMasterSaga } from '../../app/app.master.saga'
import { connectionActions } from '../../appConnection/connection.slice'
import { communitiesMasterSaga } from '../../communities/communities.master.saga'
import { connectionMasterSaga } from '../../appConnection/connection.master.saga'
import { communitiesActions } from '../../communities/communities.slice'
import { errorsMasterSaga } from '../../errors/errors.master.saga'
import { errorsActions } from '../../errors/errors.slice'
import { identityMasterSaga } from '../../identity/identity.master.saga'
import { identityActions, identitySlice } from '../../identity/identity.slice'
import { messagesMasterSaga } from '../../messages/messages.master.saga'
import { filesMasterSaga } from '../../files/files.master.saga'
import { messagesActions } from '../../messages/messages.slice'
import { publicChannelsMasterSaga } from '../../publicChannels/publicChannels.master.saga'
import { publicChannelsActions } from '../../publicChannels/publicChannels.slice'
import { usersMasterSaga } from '../../users/users.master.saga'
import { usersActions } from '../../users/users.slice'
import { filesActions } from '../../files/files.slice'
import { networkActions } from '../../network/network.slice'
import {
  type ResponseCreateCommunityPayload,
  type StorePeerListPayload,
  type ResponseLaunchCommunityPayload,
  type ChannelMessageIdsResponse,
  type ChannelsReplicatedPayload,
  type Community,
  type CommunityId,
  type DownloadStatus,
  type ErrorPayload,
  type FileMetadata,
  type MessagesLoadedPayload,
  type NetworkDataPayload,
  type RemoveDownloadStatus,
  type SendCertificatesResponse,
  type ChannelSubscribedPayload,
  type SavedOwnerCertificatePayload,
  type SendOwnerCertificatePayload,
  type SendCsrsResponse,
  type CommunityMetadata,
  type UserProfilesStoredEvent,
  type Identity,
  SocketActionTypes,
} from '@quiet/types'

import { createLogger } from '../../../utils/logger'
import { identitySelectors } from '../../identity/identity.selectors'

const logger = createLogger('startConnectionSaga')

export function subscribe(socket: Socket) {
  return eventChannel<
    | ReturnType<typeof messagesActions.addMessages>
    | ReturnType<typeof messagesActions.removePendingMessageStatuses>
    | ReturnType<typeof messagesActions.checkForMessages>
    | ReturnType<typeof messagesActions.addPublicChannelsMessagesBase>
    | ReturnType<typeof publicChannelsActions.addChannel>
    | ReturnType<typeof publicChannelsActions.setChannelSubscribed>
    | ReturnType<typeof publicChannelsActions.sendInitialChannelMessage>
    | ReturnType<typeof publicChannelsActions.channelsReplicated>
    | ReturnType<typeof publicChannelsActions.createGeneralChannel>
    | ReturnType<typeof publicChannelsActions.channelDeletionResponse>
    | ReturnType<typeof usersActions.responseSendCertificates>
    | ReturnType<typeof usersActions.storeCsrs>
    | ReturnType<typeof errorsActions.addError>
    | ReturnType<typeof errorsActions.handleError>
    | ReturnType<typeof identityActions.storeUserCertificate>
    | ReturnType<typeof identityActions.updateIdentity>
    | ReturnType<typeof identityActions.addNewIdentity>
    | ReturnType<typeof communitiesActions.createCommunity>
    | ReturnType<typeof communitiesActions.launchCommunity>
    | ReturnType<typeof communitiesActions.updateCommunityData>
    | ReturnType<typeof networkActions.addInitializedCommunity>
    | ReturnType<typeof networkActions.removeConnectedPeer>
    | ReturnType<typeof connectionActions.updateNetworkData>
    | ReturnType<typeof networkActions.addConnectedPeers>
    | ReturnType<typeof filesActions.broadcastHostedFile>
    | ReturnType<typeof filesActions.updateMessageMedia>
    | ReturnType<typeof filesActions.updateDownloadStatus>
    | ReturnType<typeof filesActions.removeDownloadStatus>
    | ReturnType<typeof filesActions.checkForMissingFiles>
    | ReturnType<typeof connectionActions.setTorBootstrapProcess>
    | ReturnType<typeof connectionActions.setConnectionProcess>
    | ReturnType<typeof connectionActions.torBootstrapped>
    | ReturnType<typeof communitiesActions.clearInvitationCodes>
    | ReturnType<typeof identityActions.saveUserCsr>
    | ReturnType<typeof connectionActions.setTorInitialized>
    | ReturnType<typeof usersActions.setUserProfiles>
    | ReturnType<typeof appActions.loadMigrationData>
  >(emit => {
    // UPDATE FOR APP
    socket.on(SocketActionTypes.TOR_INITIALIZED, () => {
      emit(connectionActions.setTorInitialized())
    })
    socket.on(SocketActionTypes.CONNECTION_PROCESS_INFO, (payload: string) => {
      emit(connectionActions.setConnectionProcess(payload))
    })
    // Misc
    socket.on(SocketActionTypes.PEER_CONNECTED, (payload: { peers: string[] }) => {
      logger.info(`${SocketActionTypes.PEER_CONNECTED}`, payload)
      emit(networkActions.addConnectedPeers(payload.peers))
    })
    socket.on(SocketActionTypes.PEER_DISCONNECTED, (payload: NetworkDataPayload) => {
      emit(networkActions.removeConnectedPeer(payload.peer))
      emit(connectionActions.updateNetworkData(payload))
    })
    socket.on(SocketActionTypes.MIGRATION_DATA_REQUIRED, (keys: string[]) => {
      emit(appActions.loadMigrationData(keys))
    })
    // Files
    socket.on(SocketActionTypes.MESSAGE_MEDIA_UPDATED, (payload: FileMetadata) => {
      emit(filesActions.updateMessageMedia(payload))
    })
    socket.on(SocketActionTypes.FILE_UPLOADED, (payload: FileMetadata) => {
      emit(filesActions.broadcastHostedFile(payload))
    })
    socket.on(SocketActionTypes.DOWNLOAD_PROGRESS, (payload: DownloadStatus) => {
      emit(filesActions.updateDownloadStatus(payload))
    })
    socket.on(SocketActionTypes.REMOVE_DOWNLOAD_STATUS, (payload: RemoveDownloadStatus) => {
      emit(filesActions.removeDownloadStatus(payload))
    })
    // Channels
    socket.on(SocketActionTypes.CHANNELS_STORED, (payload: ChannelsReplicatedPayload) => {
      emit(publicChannelsActions.channelsReplicated(payload))
    })
    socket.on(SocketActionTypes.CHANNEL_SUBSCRIBED, (payload: ChannelSubscribedPayload) => {
      emit(publicChannelsActions.setChannelSubscribed(payload))
    })
    // Messages
    socket.on(SocketActionTypes.MESSAGE_IDS_STORED, (payload: ChannelMessageIdsResponse) => {
      emit(messagesActions.checkForMessages(payload))
    })
    socket.on(SocketActionTypes.MESSAGES_STORED, (payload: MessagesLoadedPayload) => {
      emit(messagesActions.removePendingMessageStatuses(payload))
      emit(messagesActions.addMessages(payload))
    })

    // Community

    socket.on(SocketActionTypes.COMMUNITY_LAUNCHED, (payload: ResponseLaunchCommunityPayload) => {
      emit(filesActions.checkForMissingFiles(payload.id))
      emit(networkActions.addInitializedCommunity(payload.id))
      emit(communitiesActions.clearInvitationCodes())
    })

    socket.on(SocketActionTypes.COMMUNITY_UPDATED, (payload: Community) => {
      emit(communitiesActions.updateCommunityData(payload))
    })

    // Errors
    socket.on(SocketActionTypes.ERROR, (payload: ErrorPayload) => {
      // FIXME: It doesn't look like log errors have the red error
      // color in the console, which makes them difficult to find.
      // Also when only printing the payload, the full trace is not
      // available.
      logger.error(payload, payload.trace)
      emit(errorsActions.handleError(payload))
    })
    // Certificates
    socket.on(SocketActionTypes.CSRS_STORED, (payload: SendCsrsResponse) => {
      logger.info(`${SocketActionTypes.CSRS_STORED}`)
      emit(usersActions.storeCsrs(payload))
    })
    socket.on(SocketActionTypes.CERTIFICATES_STORED, (payload: SendCertificatesResponse) => {
      logger.info(`${SocketActionTypes.CERTIFICATES_STORED}`)
      emit(usersActions.responseSendCertificates(payload))
    })

    // Identity
    socket.on(SocketActionTypes.IDENTITY_STORED, (payload: Identity) => {
      logger.info(`${SocketActionTypes.IDENTITY_STORED}`)
      emit(identityActions.updateIdentity(payload))
    })

    // User Profile

    socket.on(SocketActionTypes.USER_PROFILES_STORED, (payload: UserProfilesStoredEvent) => {
      logger.info(`${SocketActionTypes.USER_PROFILES_STORED}`)
      emit(usersActions.setUserProfiles(payload.profiles))
    })

    return () => undefined
  })
}

export function* handleActions(socket: Socket): Generator {
  logger.info('handleActions starting')
  try {
    const socketChannel = yield* call(subscribe, socket)
    yield takeEvery(socketChannel, function* (action) {
      yield put(action)
    })
  } finally {
    logger.info('handleActions stopping')
    if (yield cancelled()) {
      logger.info('handleActions cancelled')
    }
  }
}

export function* useIO(socket: Socket): Generator {
  logger.info('useIO starting')
  try {
    yield all([
      fork(handleActions, socket),
      fork(publicChannelsMasterSaga, socket),
      fork(messagesMasterSaga, socket),
      fork(filesMasterSaga, socket),
      fork(identityMasterSaga, socket),
      fork(communitiesMasterSaga, socket),
      fork(usersMasterSaga, socket),
      fork(appMasterSaga, socket),
      fork(connectionMasterSaga),
      fork(errorsMasterSaga),
    ])
  } finally {
    logger.info('useIO stopping')
    if (yield cancelled()) {
      logger.info('useIO cancelled')
    }
  }
}
