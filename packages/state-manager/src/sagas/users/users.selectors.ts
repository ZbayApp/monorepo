import { createSelector } from '@reduxjs/toolkit'
import { getCertFieldValue, getReqFieldValue, keyFromCertificate, loadCertificate } from '@quiet/identity'
import { CertFieldsTypes } from './const/certFieldTypes'
import { StoreKeys } from '../store.keys'
import { certificatesAdapter } from './users.adapter'
import { type Certificate } from 'pkijs'
import { type CreatedSelectors, type StoreState } from '../store.types'
import { type UserData, User } from '@quiet/types'
import { ownerCertificate } from '../communities/communities.selectors'
import { createLogger } from '../../utils/logger'

const logger = createLogger('usersSelectors')

const usersSlice: CreatedSelectors[StoreKeys.Users] = (state: StoreState) => state[StoreKeys.Users]

export const certificates = createSelector(usersSlice, reducerState =>
  certificatesAdapter.getSelectors().selectEntities(reducerState.certificates)
)

export const csrs = createSelector(usersSlice, reducerState =>
  certificatesAdapter.getSelectors().selectEntities(reducerState.csrs)
)

export const certificatesMapping = createSelector(certificates, certs => {
  const mapping: Record<string, UserData> = {}
  Object.keys(certs).map(pubKey => {
    const certificate = certs[pubKey]
    if (!certificate || certificate.subject.typesAndValues.length < 1) {
      return
    }

    const username = getCertFieldValue(certificate, CertFieldsTypes.nickName)
    const onionAddress = getCertFieldValue(certificate, CertFieldsTypes.commonName)
    const peerId = getCertFieldValue(certificate, CertFieldsTypes.peerId)

    if (!username || !onionAddress || !peerId) {
      logger.error(`Could not parse certificate for pubkey ${pubKey}`)
      return
    }

    return (mapping[pubKey] = {
      username,
      onionAddress,
      peerId,
    })
  })
  return mapping
})

export const csrsMapping = createSelector(csrs, csrs => {
  const mapping: Record<string, UserData> = {}

  Object.keys(csrs).map(pubKey => {
    const csr = csrs[pubKey]
    if (!csr || csr.subject.typesAndValues.length < 1) {
      return
    }

    const username = getReqFieldValue(csr, CertFieldsTypes.nickName)
    const onionAddress = getReqFieldValue(csr, CertFieldsTypes.commonName)
    const peerId = getReqFieldValue(csr, CertFieldsTypes.peerId)

    if (!username || !onionAddress || !peerId) {
      logger.error(`Could not parse certificate for pubkey ${pubKey}`)
      return
    }

    return (mapping[pubKey] = {
      username,
      onionAddress,
      peerId,
    })
  })

  return mapping
})

export const registeredUsernames = createSelector(
  certificatesMapping,
  mapping => new Set(Object.values(mapping).map(u => u.username))
)

// TODO: We can move most of this to the backend.
export const allUsers = createSelector(csrsMapping, certificatesMapping, (csrs, certs) => {
  const users: Record<string, User> = {}
  const allUsernames: string[] = Object.values(csrs).map(u => u.username)
  const duplicatedUsernames: string[] = allUsernames.filter((val, index) => allUsernames.indexOf(val) !== index)

  // Temporary backward compatiblility! Old communities do not have csrs
  Object.keys(certs).map(pubKey => {
    users[pubKey] = {
      ...certs[pubKey],
      isRegistered: true,
      isDuplicated: false,
      pubKey,
    }
  })

  Object.keys(csrs).map(pubKey => {
    if (users[pubKey]) return
    const username = csrs[pubKey].username

    let isDuplicated: boolean
    if (certs[pubKey]?.username) {
      isDuplicated = false
    } else {
      isDuplicated = duplicatedUsernames.includes(username)
    }

    const isRegistered = Boolean(certs[pubKey])

    users[pubKey] = {
      ...csrs[pubKey],
      isRegistered,
      isDuplicated,
      pubKey,
    }
  })
  return users
})

export const getUserByPubKey = (pubKey: string) => createSelector(allUsers, users => users[pubKey])

// Perhaps we should move this to communities.selectors.ts?
export const ownerData = createSelector(ownerCertificate, ownerCertificate => {
  if (!ownerCertificate) return null
  const ownerCert = loadCertificate(ownerCertificate)
  const username = getCertFieldValue(ownerCert, CertFieldsTypes.nickName)
  const onionAddress = getCertFieldValue(ownerCert, CertFieldsTypes.commonName)
  const peerId = getCertFieldValue(ownerCert, CertFieldsTypes.peerId)
  const pubKey = keyFromCertificate(ownerCert)

  return {
    username,
    onionAddress,
    peerId,
    pubKey,
  }
})

export const duplicateCerts = createSelector(certificatesMapping, certs => {
  const allUsernames: string[] = Object.values(certs).map(u => u.username)
  const uniqueUsernames = [...new Set(allUsernames)]
  return Boolean(allUsernames.length !== uniqueUsernames.length)
})

export const areCertificatesLoaded = createSelector(
  certificatesMapping,
  certificates => Object.values(certificates).length > 0
)

export const usersSelectors = {
  certificates,
  csrs,
  certificatesMapping,
  csrsMapping,
  registeredUsernames,
  allUsers,
  getUserByPubKey,
  ownerData,
  duplicateCerts,
  areCertificatesLoaded,
}
