/**
 * Backend API event types. Currently, these are divided into two
 * groups: pure events and actions. Pure events are emitted from the
 * backend to notify the frontend of something and are generally named
 * with the past tense (e.g. COMMUNITY_LAUNCHED) or as a noun (e.g.
 * CONNECTION_PROCESS_INFO), while actions are emitted from the
 * frontend in order to invoke the backend to do something on it's
 * behalf and are generally named as a command (e.g.
 * CREATE_COMMUNITY). Events generally don't expect a response, while
 * actions tend to have a callback for returning data (using Socket.IO
 * acknowledgements feature to reduce the amount of events like
 * EVENT_REQUEST/EVENT_RESPONSE).
 *
 * NOTE: I've been adding docstrings to document the events here.
 */
export enum SocketActionTypes {
  // ====== Community ======

  COMMUNITY_LAUNCHED = 'communityLaunched',
  COMMUNITY_UPDATED = 'communityUpdated',
  CREATE_COMMUNITY = 'createCommunity',
  LAUNCH_COMMUNITY = 'launchCommunity',
  LEAVE_COMMUNITY = 'leaveCommunity',

  // ====== Identity ======
  CREATE_IDENTITY = 'createIdentity',
  IDENTITY_STORED = 'identityStored',
  CREATE_USER_CSR = 'storeUserCertificate',

  // ====== Channels ======

  CHANNEL_SUBSCRIBED = 'channelSubscribed',
  CHANNELS_STORED = 'channelsStored',
  CREATE_CHANNEL = 'createChannel',
  DELETE_CHANNEL = 'deleteChannel',
  DELETE_FILES_FROM_CHANNEL = 'deleteFilesFromChannel',

  // ====== Messages ======

  GET_MESSAGES = 'getMessages',
  MESSAGE_IDS_STORED = 'messageIdsStored',
  MESSAGE_MEDIA_UPDATED = 'messageMediaUpdated',
  MESSAGES_STORED = 'messagesStored',
  SEND_MESSAGE = 'sendMessage',

  // ====== User ======

  SET_USER_PROFILE = 'updateUserProfile',
  USER_PROFILES_STORED = 'userProfilesStored',

  // ====== Files ======

  CANCEL_DOWNLOAD = 'cancelDownload',
  CHECK_FOR_MISSING_FILES = 'checkForMissingFiles',
  DOWNLOAD_FILE = 'downloadFile',
  DOWNLOAD_PROGRESS = 'downloadProgress',
  FILE_UPLOADED = 'fileUploaded',
  REMOVE_DOWNLOAD_STATUS = 'removeDownloadStatus',
  UPLOAD_FILE = 'uploadFile',

  // ====== Certificates ======

  ADD_CSR = 'addCsr',
  CERTIFICATES_STORED = 'certificatesStored',
  CSRS_STORED = 'csrsStored',
  REGISTER_USER_CERTIFICATE = 'registerUserCertificate',

  // ====== Network ======

  CLOSE = 'close',
  CONNECTED_PEERS = 'connectedPeers',
  CONNECTION = 'connection',
  CONNECTION_PROCESS_INFO = 'connectionProcess',
  CREATE_NETWORK = 'createNetwork',
  LIBP2P_PSK_STORED = 'libp2pPskStored',
  PEER_CONNECTED = 'peerConnected',
  PEER_DISCONNECTED = 'peerDisconnected',
  TOR_INITIALIZED = 'torInitialized',
  REDIAL_PEERS = 'redialPeers',

  // ====== Misc ======

  /**
   * For moving data from the frontend to the backend. Load migration
   * data into the backend.
   */
  LOAD_MIGRATION_DATA = 'loadMigrationData',
  /**
   * For moving data from the frontend to the backend. The backend may
   * require frontend data for migrations when loading an existing
   * community from storage.
   */
  MIGRATION_DATA_REQUIRED = 'migrationDataRequired',
  PUSH_NOTIFICATION = 'pushNotification',
  ERROR = 'error',
  /**
   * Start the backend. Currently, the frontend depends on events
   * emitted from the backend, so we wait to start the backend until
   * the frontend is connected and listening.
   */
  START = 'start',
}
