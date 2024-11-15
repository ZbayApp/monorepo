export enum LoadingPanelType {
  StartingApplication = 'Starting Quiet',
  Joining = 'Connecting to peers',
}

export type InvitationPair = {
  peerId: string
  onionAddress: string
}

export enum InvitationDataVersion {
  v1 = 'v1',
  v2 = 'v2',
}

export type InvitationDataP2P = {
  pairs: InvitationPair[]
  psk: string
  ownerOrbitDbIdentity: string
}

export type InvitationDataV1 = InvitationDataP2P & {
  version?: InvitationDataVersion.v1
}

export type InvitationDataV2 = InvitationDataP2P & {
  version?: InvitationDataVersion.v2
  communityName: string
  seed: string
}

export type InvitationData = InvitationDataV1 | InvitationDataV2
