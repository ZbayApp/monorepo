import { InvitationData, InvitationDataV1, InvitationDataV2, InvitationDataVersion, InvitationPair } from '@quiet/types'
import { QUIET_JOIN_PAGE } from './const'
import { createLibp2pAddress, isPSKcodeValid } from './libp2p'
// import { CID } from 'multiformats/cid' // Fixme: dependency issue
import { createLogger } from './logger'
const logger = createLogger('invite')

// V1 invitation code format (p2p without relay)
export const PSK_PARAM_KEY = 'k'
export const OWNER_ORBIT_DB_IDENTITY_PARAM_KEY = 'o'

// V2 invitation code format (relay support)
export const CID_PARAM_KEY = 'c'
export const TOKEN_PARAM_KEY = 't'
export const INVITER_ADDRESS_PARAM_KEY = 'i'
export const SERVER_ADDRESS_PARAM_KEY = 's'

// v3 invitation code format (v1 with LFA integration)
export const INVITATION_SEED_KEY = 'd'
export const COMMUNITY_NAME_KEY = 'n'

export const DEEP_URL_SCHEME_WITH_SEPARATOR = 'quiet://'
const DEEP_URL_SCHEME = 'quiet'
const ONION_ADDRESS_REGEX = /^[a-z0-9]{56}$/g
const PEER_ID_REGEX = /^[a-zA-Z0-9]{46}$/g
const INVITATION_SEED_REGEX = /^[a-zA-Z0-9]{16}$/g
const COMMUNITY_NAME_REGEX = /^[-a-zA-Z0-9 ]+$/g

interface ParseDeepUrlParams {
  url: string
  expectedProtocol?: string
}

const parseLinkV2 = (url: string): InvitationDataV2 => {
  /**
   * <peerid1>=<address1>&<peerid2>=<addresss2>...&k=<psk>&o=<ownerOrbitDbIdentity>&d=<LFA invitation seed>&n=<community name>
   */
  const params = new URL(url).searchParams
  const requiredParams = [PSK_PARAM_KEY, OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, INVITATION_SEED_KEY, COMMUNITY_NAME_KEY]

  const entries = validateUrlParams(params, requiredParams)

  const pairs: InvitationPair[] = []

  params.forEach((onionAddress, peerId) => {
    if (!peerDataValid({ peerId, onionAddress })) return
    pairs.push({
      peerId,
      onionAddress,
    })
  })

  if (pairs.length === 0) throw new Error(`No valid peer addresses found in invitation link '${url}'`)

  return {
    version: InvitationDataVersion.v2,
    pairs,
    psk: entries[PSK_PARAM_KEY],
    ownerOrbitDbIdentity: entries[OWNER_ORBIT_DB_IDENTITY_PARAM_KEY],
    seed: entries[INVITATION_SEED_KEY],
    communityName: entries[COMMUNITY_NAME_KEY],
  }
}

const parseLinkV1 = (url: string): InvitationDataV1 => {
  /**
   * <peerid1>=<address1>&<peerid2>=<addresss2>...&k=<psk>&o=<ownerOrbitDbIdentity>
   */
  const params = new URL(url).searchParams
  const requiredParams = [PSK_PARAM_KEY, OWNER_ORBIT_DB_IDENTITY_PARAM_KEY]

  const entries = validateUrlParams(params, requiredParams)

  const pairs: InvitationPair[] = []

  params.forEach((onionAddress, peerId) => {
    if (!peerDataValid({ peerId, onionAddress })) return
    pairs.push({
      peerId,
      onionAddress,
    })
  })

  if (pairs.length === 0) throw new Error(`No valid peer addresses found in invitation link '${url}'`)

  return {
    version: InvitationDataVersion.v1,
    pairs,
    psk: entries[PSK_PARAM_KEY],
    ownerOrbitDbIdentity: entries[OWNER_ORBIT_DB_IDENTITY_PARAM_KEY],
  }
}

const parseDeepUrl = ({ url, expectedProtocol = `${DEEP_URL_SCHEME}:` }: ParseDeepUrlParams): InvitationData => {
  let _url = url
  let validUrl: URL | null = null

  if (!expectedProtocol) {
    // Create a full url to be able to use the same URL parsing mechanism
    expectedProtocol = `${DEEP_URL_SCHEME}:`
    _url = `${DEEP_URL_SCHEME_WITH_SEPARATOR}?${url}`
  }

  try {
    validUrl = new URL(_url)
  } catch (e) {
    logger.error(`Could not retrieve invitation data from deep url '${url}'. Reason: ${e.message}`)
    throw e
  }
  if (!validUrl || validUrl.protocol !== expectedProtocol) {
    logger.error(`Could not retrieve invitation data from deep url '${url}'`)
    throw new Error(`Invalid url`)
  }

  const params = validUrl.searchParams

  const psk = params.get(PSK_PARAM_KEY)
  const cid = params.get(CID_PARAM_KEY)
  const seed = params.get(INVITATION_SEED_KEY)
  if (!psk && !cid) throw new Error(`Invitation link does not match either v1 or v2 format '${url}'`)

  let data: InvitationData | null = null
  if (psk != null && seed == null) {
    data = parseLinkV1(_url)
  } else if (psk != null && seed != null) {
    data = parseLinkV2(_url)
  }

  if (!data) throw new Error(`Could not parse invitation data from deep url '${url}'`)

  logger.info(`Invitation data '${JSON.stringify(data)}' parsed`)
  return data
}

/**
 * Extract invitation data from deep url.
 * Valid format: quiet://?<peerid1>=<address1>&<peerid2>=<addresss2>&k=<psk>
 */
export const parseInvitationLinkDeepUrl = (url: string): InvitationData => {
  return parseDeepUrl({ url })
}

/**
 * @param link <peerId1>=<address1>&<peerId2>=<address2>&k=<psk>
 */
export const parseInvitationLink = (link: string): InvitationData => {
  return parseDeepUrl({ url: link, expectedProtocol: '' })
}

export const p2pAddressesToPairs = (addresses: string[]): InvitationPair[] => {
  /**
   * @arg {string[]} addresses - List of peer's p2p addresses
   */
  const pairs: InvitationPair[] = []
  for (const peerAddress of addresses) {
    let peerId: string
    let onionAddress: string
    try {
      peerId = peerAddress.split('/p2p/')[1]
    } catch (e) {
      logger.error(`Could not add peer address '${peerAddress}' to invitation url.`, e)
      continue
    }
    try {
      onionAddress = peerAddress.split('/tcp/')[0].split('/dns4/')[1]
    } catch (e) {
      logger.error(`Could not add peer address '${peerAddress}' to invitation url.`, e)
      continue
    }

    if (!peerId || !onionAddress) {
      logger.error(`No peerId or address in ${peerAddress}`)
      continue
    }
    const rawAddress = onionAddress.endsWith('.onion') ? onionAddress.split('.')[0] : onionAddress
    if (!peerDataValid({ peerId, onionAddress: rawAddress })) continue

    pairs.push({ peerId: peerId, onionAddress: rawAddress })
  }
  return pairs
}

export const pairsToP2pAddresses = (pairs: InvitationPair[]): string[] => {
  const addresses: string[] = []
  for (const pair of pairs) {
    addresses.push(createLibp2pAddress(pair.onionAddress, pair.peerId))
  }
  return addresses
}

export const composeInvitationShareUrl = (data: InvitationData) => {
  /**
   * @returns {string} - Complete shareable invitation link, e.g.
   * https://tryquiet.org/join/#<peerid1>=<address1>&<peerid2>=<addresss2>&k=<psk>&o=<ownerOrbitDbIdentity>
   */
  return composeInvitationUrl(`${QUIET_JOIN_PAGE}`, data).replace('?', '#')
}

export const composeInvitationDeepUrl = (data: InvitationData): string => {
  return composeInvitationUrl(`${DEEP_URL_SCHEME_WITH_SEPARATOR}`, data)
}

const composeInvitationUrl = (baseUrl: string, data: InvitationDataV1 | InvitationDataV2): string => {
  const url = new URL(baseUrl)

  if (!data.version) data.version = InvitationDataVersion.v1

  switch (data.version) {
    case InvitationDataVersion.v1:
      for (const pair of data.pairs) {
        url.searchParams.append(pair.peerId, pair.onionAddress)
      }
      url.searchParams.append(PSK_PARAM_KEY, data.psk)
      url.searchParams.append(OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity)
      break
    case InvitationDataVersion.v2:
      for (const pair of data.pairs) {
        url.searchParams.append(pair.peerId, pair.onionAddress)
      }
      url.searchParams.append(PSK_PARAM_KEY, data.psk)
      url.searchParams.append(OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity)
      url.searchParams.append(COMMUNITY_NAME_KEY, data.communityName)
      url.searchParams.append(INVITATION_SEED_KEY, data.seed)
  }
  return url.href
}

/**
 * Extract invitation codes from deep url if url is present in argv
 */
export const argvInvitationLink = (argv: string[]): InvitationData | null => {
  let invitationData: InvitationData | null = null
  for (const arg of argv) {
    if (!arg.startsWith(DEEP_URL_SCHEME_WITH_SEPARATOR)) {
      logger.warn('Not a deep url, not parsing', arg)
      continue
    }
    logger.info('Parsing deep url', arg)
    invitationData = parseInvitationLinkDeepUrl(arg)
    switch (invitationData.version) {
      case InvitationDataVersion.v1:
      case InvitationDataVersion.v2:
        if (invitationData.pairs.length > 0) {
          break
        } else {
          invitationData = null
        }
    }
  }
  return invitationData
}

const peerDataValid = ({ peerId, onionAddress }: { peerId: string; onionAddress: string }): boolean => {
  if (!peerId.match(PEER_ID_REGEX)) {
    // TODO: test it more properly e.g with PeerId.createFromB58String(peerId.trim())
    logger.warn(`PeerId ${peerId} is not valid`)
    return false
  }
  if (!onionAddress.trim().match(ONION_ADDRESS_REGEX)) {
    logger.warn(`Onion address ${onionAddress} is not valid`)
    return false
  }
  return true
}

const invitationSeedValid = (seed: string): boolean => {
  if (seed.match(INVITATION_SEED_REGEX) == null) {
    logger.warn(`Invitation seed ${seed} is not valid`)
    return false
  }
  return true
}

const communityNameValid = (communityName: string): boolean => {
  if (communityName.match(COMMUNITY_NAME_REGEX) == null) {
    logger.warn(`Community name ${communityName} is not valid`)
    return false
  }
  return true
}

const validateUrlParams = (params: URLSearchParams, requiredParams: string[]) => {
  const entries = Object.fromEntries(params)

  requiredParams.forEach(key => {
    const value = params.get(key)
    if (!value) {
      throw new Error(`Missing key '${key}' in invitation link`)
    }
    entries[key] = decodeURIComponent(value)
    if (!isParamValid(key, entries[key])) {
      throw new Error(`Invalid value '${value}' for key '${key}' in invitation link`)
    }
    params.delete(key)
  })
  return entries
}

const isParamValid = (param: string, value: string) => {
  logger.info(`Validating param ${param} with value ${value}`)
  switch (param) {
    case CID_PARAM_KEY:
      // try {
      //   CID.parse(value)
      // } catch (e) {
      //   logger.error(e.message)
      //   return false
      // }
      return Boolean(value.match(PEER_ID_REGEX))

    case TOKEN_PARAM_KEY:
      // TODO: validate token format
      return true

    case SERVER_ADDRESS_PARAM_KEY:
      try {
        new URL(value)
      } catch (e) {
        logger.error(e.message)
        return false
      }
      return true

    case INVITER_ADDRESS_PARAM_KEY:
      return Boolean(value.trim().match(ONION_ADDRESS_REGEX))

    case PSK_PARAM_KEY:
      return isPSKcodeValid(value)

    case OWNER_ORBIT_DB_IDENTITY_PARAM_KEY:
      // TODO: validate orbit db identity format?
      return true

    case COMMUNITY_NAME_KEY:
      return communityNameValid(value)

    case INVITATION_SEED_KEY:
      return invitationSeedValid(value)

    default:
      return false
  }
}
