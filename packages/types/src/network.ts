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

export type InvitationAuthData = {
  communityName: string
  seed: string
}

export type InvitationDataV2 = InvitationDataP2P & {
  version?: InvitationDataVersion.v2
  authData: InvitationAuthData
}

export type InvitationData = InvitationDataV1 | InvitationDataV2

/**
 * Validation types
 */

// Named parameters

export type InvitationLinkUrlNamedParamValidatorFun<T> = (value: string) => Partial<T> | never
export type InvitationLinkUrlNamedParamProcessorFun<T> = (value: string) => T
export type InvitationLinkUrlNamedParamConfigMap<T> = Map<string, InvitationLinkUrlNamedParamConfig<T | any>>

export type InvitationLinkUrlNamedParamConfig<T> = {
  required: boolean
  validator: InvitationLinkUrlNamedParamValidatorFun<T | string>
  nested?:
    | {
        key: string
        config: InvitationLinkUrlNamedParamConfigMap<any>
      }
    | undefined
}

// Parent type

export type VersionedInvitationLinkUrlParamConfig<T extends InvitationData> = {
  version: InvitationDataVersion
  named: InvitationLinkUrlNamedParamConfigMap<T | any>
}
