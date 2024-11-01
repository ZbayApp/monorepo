import { type Socket as IOSocket } from 'socket.io-client'
import { type messagesActions } from './sagas/messages/messages.slice'
import { type publicChannelsActions } from './sagas/publicChannels/publicChannels.slice'
import {
  type SaveCSRPayload,
  type CancelDownloadPayload,
  type Community,
  type CreateChannelPayload,
  type CreateChannelResponse,
  type DeleteFilesFromChannelSocketPayload,
  type DownloadFilePayload,
  type GetMessagesPayload,
  type InitCommunityPayload,
  type MessagesLoadedPayload,
  type NetworkInfo,
  type RegisterOwnerCertificatePayload,
  type RegisterUserCertificatePayload,
  type SaveOwnerCertificatePayload,
  type SendMessagePayload,
  type SocketActionTypes,
  type UploadFilePayload,
  type CommunityMetadata,
  type PermsData,
  type UserProfile,
  type DeleteChannelResponse,
  type Identity,
} from '@quiet/types'

interface EventsMap {
  [event: string]: (...args: any[]) => void
}

type EmitEvent<Payload, Callback = (response: any) => void> = (payload: Payload, callback?: Callback) => void

export interface EmitEvents {
  // ====== Application ======
  [SocketActionTypes.START]: () => void
  [SocketActionTypes.CLOSE]: () => void
  // ====== Communities ======
  [SocketActionTypes.LAUNCH_COMMUNITY]: EmitEvent<InitCommunityPayload, (response: Community | undefined) => void>
  [SocketActionTypes.CREATE_COMMUNITY]: EmitEvent<InitCommunityPayload, (response: Community | undefined) => void>
  [SocketActionTypes.LEAVE_COMMUNITY]: () => void
  // ====== Messages ======
  [SocketActionTypes.DOWNLOAD_FILE]: EmitEvent<DownloadFilePayload>
  [SocketActionTypes.SEND_MESSAGE]: EmitEvent<SendMessagePayload>
  [SocketActionTypes.CANCEL_DOWNLOAD]: EmitEvent<CancelDownloadPayload>
  [SocketActionTypes.UPLOAD_FILE]: EmitEvent<UploadFilePayload>
  [SocketActionTypes.GET_MESSAGES]: EmitEvent<GetMessagesPayload, (response?: MessagesLoadedPayload) => void>
  [SocketActionTypes.CREATE_CHANNEL]: EmitEvent<CreateChannelPayload, (response?: CreateChannelResponse) => void>
  [SocketActionTypes.DELETE_CHANNEL]: EmitEvent<
    ReturnType<typeof publicChannelsActions.deleteChannel>['payload'],
    (response: DeleteChannelResponse) => void
  >
  [SocketActionTypes.DELETE_FILES_FROM_CHANNEL]: EmitEvent<DeleteFilesFromChannelSocketPayload>
  // ====== Identity ======
  [SocketActionTypes.REGISTER_USER_CERTIFICATE]: EmitEvent<RegisterUserCertificatePayload>
  [SocketActionTypes.CREATE_NETWORK]: EmitEvent<string, (response: NetworkInfo | undefined) => void>
  [SocketActionTypes.CREATE_IDENTITY]: EmitEvent<string, (response: Identity | undefined) => void>
  [SocketActionTypes.CREATE_USER_CSR]: EmitEvent<string, (response: Identity | undefined) => void>
  // ====== User Profiles ======
  [SocketActionTypes.ADD_CSR]: EmitEvent<SaveCSRPayload>
  [SocketActionTypes.SET_USER_PROFILE]: EmitEvent<UserProfile>
  [SocketActionTypes.LOAD_MIGRATION_DATA]: EmitEvent<Record<string, any>>
}

export type Socket = IOSocket<EventsMap, EmitEvents>

export type ApplyEmitParams<T extends keyof EmitEvents, P> = [a: T, p: P]

export const applyEmitParams = <T extends keyof EmitEvents, P>(eventType: T, payload: P): ApplyEmitParams<T, P> => [
  eventType,
  payload,
]
