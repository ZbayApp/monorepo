export type CommunityId = string

export type ConnectedPeers = string[]

// FIXME: We can rename this to something like PeerConnInfo or
// PeerDisconnectedPayload if it's only used for the PEER_DISCONNECTED
// event.
export interface NetworkDataPayload {
  peer: string
  connectionDuration: number
  lastSeen: number
}

export interface NetworkStats {
  peerId: string
  lastSeen: number
  connectionTime: number
}

export enum ConnectionProcessInfo {
  REGISTERING_USER_CERTIFICATE = 'Registering user certificate',
  LAUNCHING_COMMUNITY = 'Launching community',
  SPAWNING_HIDDEN_SERVICE = 'Spawning hidden service for community',
  INITIALIZING_STORAGE = 'Initializing storage',
  INITIALIZING_LIBP2P = 'Initializing libp2p',
  INITIALIZING_IPFS = 'Initializing IPFS',
  DBS_INITIALIZED = 'Initialized DBs',
  COMMUNITY_LAUNCHED = 'Launched community',
  CHANNELS_STORED = 'Channels replicated',
  CERTIFICATES_STORED = 'Certificates replicated',

  CONNECTION_STARTED = 'Connecting process started',
  LOADING_MESSAGES = 'Loading messages',
  BACKEND_MODULES = 'Initializing backend',
  REGISTERING_OWNER_CERTIFICATE = 'Registering owner certificate',
  CONNECTING_TO_COMMUNITY = 'Connecting to community members via Tor',
}

export const TOR_BOOTSTRAP_COMPLETE = 'Bootstrapped 100% (done)'
