import { InvitationData, InvitationDataV1, InvitationDataV2, InvitationDataVersion } from '@quiet/types'
import { composeInvitationDeepUrl, composeInvitationShareUrl } from './invitationLink/invitationLink'
import { QUIET_JOIN_PAGE } from './const'

export const validInvitationDatav1: InvitationDataV1[] = [
  {
    pairs: [
      {
        onionAddress: 'y7yczmugl2tekami7sbdz5pfaemvx7bahwthrdvcbzw5vex2crsr26qd',
        peerId: 'QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wfFJDPPLsbKSE',
      },
    ],
    psk: 'BNlxfE2WBF7LrlpIX0CvECN5o1oZtA16PkAb7GYiwYw=',
    ownerOrbitDbIdentity: '018f9e87541d0b61cb4565af8df9699f658116afc54ae6790c31bbf6df3fc343b0',
  },
  {
    pairs: [
      {
        onionAddress: 'pgzlcstu4ljvma7jqyalimcxlvss5bwlbba3c3iszgtwxee4qjdlgeqd',
        peerId: 'QmaRchXhkPWq8iLiMZwFfd2Yi4iESWhAYYJt8cTCVXSwpG',
      },
    ],
    psk: '5T9GBVpDoRpKJQK4caDTz5e5nym2zprtoySL2oLrzr4=',
    ownerOrbitDbIdentity: '028f9e87541d0b61cb4565af8df9699f658116afc54ae6790c31bbf6df3fc343b0',
  },
]

export const validInvitationDatav2: InvitationDataV2[] = [
  {
    version: InvitationDataVersion.v2,
    pairs: [
      {
        onionAddress: 'y7yczmugl2tekami7sbdz5pfaemvx7bahwthrdvcbzw5vex2crsr26qd',
        peerId: 'QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wfFJDPPLsbKSE',
      },
    ],
    psk: 'BNlxfE2WBF7LrlpIX0CvECN5o1oZtA16PkAb7GYiwYw=',
    ownerOrbitDbIdentity: '018f9e87541d0b61cb4565af8df9699f658116afc54ae6790c31bbf6df3fc343b0',
    authData: {
      communityName: 'community-name',
      seed: '4kgd5mwq5z4fmfwq',
    },
  },
  {
    version: InvitationDataVersion.v2,
    pairs: [
      {
        onionAddress: 'pgzlcstu4ljvma7jqyalimcxlvss5bwlbba3c3iszgtwxee4qjdlgeqd',
        peerId: 'QmaRchXhkPWq8iLiMZwFfd2Yi4iESWhAYYJt8cTCVXSwpG',
      },
    ],
    psk: '5T9GBVpDoRpKJQK4caDTz5e5nym2zprtoySL2oLrzr4=',
    ownerOrbitDbIdentity: '028f9e87541d0b61cb4565af8df9699f658116afc54ae6790c31bbf6df3fc343b0',
    authData: {
      communityName: 'other-community-name',
      seed: '6k6damwb3z1emfqw',
    },
  },
]

export const validInvitationCodeTestData: InvitationData[] = [...validInvitationDatav1]

type TestData<T> = {
  shareUrl: () => string
  deepUrl: () => string
  code: () => string
  data: T
}

export function getValidInvitationUrlTestData<T extends InvitationData>(data: T): TestData<T> {
  return {
    shareUrl: () => composeInvitationShareUrl(data),
    deepUrl: () => composeInvitationDeepUrl(data),
    code: () => composeInvitationShareUrl(data).split(QUIET_JOIN_PAGE + '#')[1],
    data: data,
  }
}

// export const getValidInvitationUrlTestData = (data: InvitationData) => {
//   return {
//     shareUrl: () => composeInvitationShareUrl(data),
//     deepUrl: () => composeInvitationDeepUrl(data),
//     code: () => composeInvitationShareUrl(data).split(QUIET_JOIN_PAGE + '#')[1],
//     data: data,
//   }
// }
