export enum LocalDBKeys {
  // Record of Community objects
  COMMUNITIES = 'communities',
  // ID of current community
  CURRENT_COMMUNITY_ID = 'currentCommunityId',
  // Record of peer details
  PEERS = 'peers',

  IDENTITIES = 'identities',

  // TODO: Deprecate this once we move the Identity data model to the backend
  // (and delete the data from LevelDB).
  COMMUNITY = 'community',
  // TODO: Deprecate this soon (and delete the data from LevelDB). This data
  // exists in the Community object.
  PSK = 'psk',
  // TODO: Deprecate this soon (and delete the data from LevelDB). This data
  // exists in the Community object.
  OWNER_ORBIT_DB_IDENTITY = 'ownerOrbitDbIdentity',

  SIGCHAINS = 'sigchains:',
  USER_CONTEXTS = 'userContexts',
  KEYRINGS = 'keyrings',
}
export type LocalDbStatus = 'opening' | 'open' | 'closing' | 'closed'
