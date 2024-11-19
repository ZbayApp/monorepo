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

export type InvitationLinkUrlParamValidatorFun<T> = (
  value: string,
  processor?: InvitationLinkUrlParamProcessorFun<any>
) => Partial<T> | never
export type InvitationLinkUrlParamProcessorFun<T> = (value: string) => T

export type InvitationLinkUrlParamConfigMap<T> = Map<string, InvitationLinkUrlParamConfig<T | any>>

export type VersionedInvitationLinkUrlParamConfig<T extends InvitationData> = {
  version: InvitationDataVersion
  map: InvitationLinkUrlParamConfigMap<T | any>
}

export type InvitationLinkUrlParamConfig<T> = {
  required: boolean
  validator: InvitationLinkUrlParamValidatorFun<T | string>
  processor?: InvitationLinkUrlParamProcessorFun<any> | undefined
  nested?:
    | {
        key: string
        config: InvitationLinkUrlParamConfigMap<any>
      }
    | undefined
}
