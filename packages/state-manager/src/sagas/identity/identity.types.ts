import { PeerId } from '@quiet/types'

export interface CertData {
  publicKey: any
  privateKey: any
  pkcs10: any
}

export interface UserCsr {
  userCsr: string
  userKey: string
  pkcs10: CertData
}

export interface HiddenService {
  onionAddress: string
  privateKey: string
}

export interface Identity {
  id: string
  nickname: string
  hiddenService: HiddenService
  peerId: PeerId
  userCsr: UserCsr | null
  userCertificate: string | null
  joinTimestamp: number | null
}

export interface CreateUserCsrPayload {
  nickname: string
  commonName: string
  peerId: string
  signAlg: string
  hashAlg: string
}

export interface RegisterCertificatePayload {
  communityId: string
  nickname: string
  userCsr: UserCsr
}

export interface RegisterUserCertificatePayload {
  communityId: string
  userCsr: string
  serviceAddress: string
}

export interface StoreUserCertificatePayload {
  userCertificate: string
  communityId: string
}
