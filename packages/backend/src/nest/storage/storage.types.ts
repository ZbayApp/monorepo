import { Certificates } from '@quiet/types'

export enum StorageEvents {
  // Public Channels
  CHANNEL_SUBSCRIBED = 'channelSubscribed',
  CHANNELS_STORED = 'channelsStored',
  MESSAGE_IDS_STORED = 'messageIdsStored',
  MESSAGES_STORED = 'messagesStored',
  // Files
  REMOVE_DOWNLOAD_STATUS = 'removeDownloadStatus',
  FILE_UPLOADED = 'fileUploaded',
  DOWNLOAD_PROGRESS = 'downloadProgress',
  MESSAGE_MEDIA_UPDATED = 'messageMediaUpdated',
  CHECK_FOR_MISSING_FILES = 'checkForMissingFiles',
  // Misc
  SEND_PUSH_NOTIFICATION = 'sendPushNotification',
  // Users
  CSRS_STORED = 'csrsStored',
  CERTIFICATES_STORED = 'certificatesStored',
  USER_PROFILES_STORED = 'userProfilesStored',
  IDENTITY_STORED = 'identityStored',
  // Community
  COMMUNITY_METADATA_STORED = 'communityMetadataStored',
  COMMUNITY_UPDATED = 'communityUpdated',
}

export interface CsrReplicatedPromiseValues {
  promise: Promise<unknown>
  resolveFunction: any
}

export interface DBOptions {
  replicate: boolean
}
