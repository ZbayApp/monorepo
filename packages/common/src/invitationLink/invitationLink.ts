import { InvitationData, InvitationDataV1, InvitationDataV2, InvitationDataVersion, InvitationPair } from '@quiet/types'
import { QUIET_JOIN_PAGE } from '../const'
import {
  AUTH_DATA_KEY,
  DEEP_URL_SCHEME,
  DEEP_URL_SCHEME_WITH_SEPARATOR,
  OWNER_ORBIT_DB_IDENTITY_PARAM_KEY,
  PEER_ADDRESS_KEY,
  PSK_PARAM_KEY,
} from './invitationLink.const'
import {
  encodeAuthData,
  PARAM_CONFIG_V1,
  PARAM_CONFIG_V2,
  validatePeerData,
  parseAndValidateUrlParams,
} from './invitationLink.validator'
import { createLibp2pAddress } from '../libp2p'
import { createLogger } from '../logger'

const logger = createLogger('invite')

interface ParseDeepUrlParams {
  url: string
  expectedProtocol?: string
}

/**
 * Parse and validate the URL parameters on a given V2 (LFA) invite link URL
 *
 * @param url V2 invite link URL to validate parameters on
 *
 * @returns {InvitationDataV2} Parsed V2 parameters
 */
const parseLinkV2 = (url: string): InvitationDataV2 => {
  /**
   * <peerid1>=<address1>&<peerid2>=<addresss2>...&k=<psk>&o=<ownerOrbitDbIdentity>&a=<base64url-encoded string
   * (decodes to `?c=<community name>&s=<base58 LFA invitation seed>`)
   */
  return parseAndValidateUrlParams(url, PARAM_CONFIG_V2)
}

/**
 * Parse and validate the URL parameters on a given V1 (non-LFA) invite link URL
 *
 * @param url V1 invite link URL to validate parameters on
 *
 * @returns {InvitationDataV1} Parsed V1 parameters
 */
const parseLinkV1 = (url: string): InvitationDataV1 => {
  /**
   * <peerid1>=<address1>&<peerid2>=<addresss2>...&k=<psk>&o=<ownerOrbitDbIdentity>
   */
  return parseAndValidateUrlParams(url, PARAM_CONFIG_V1)
}

/**
 * Extract invitation data from deep url.
 * Valid format: quiet://?<peerid1>=<address1>&<peerid2>=<addresss2>&k=<psk>
 *
 * @param deepUrlOptions Object containing the deep URL to parse and the URL protocol
 *
 * @returns {InvitationData} Parsed parameters
 */
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
  const authData = params.get(AUTH_DATA_KEY)
  if (!psk) throw new Error(`Invitation link does not match either v1 or v2 format '${url}'`)

  let data: InvitationData | null = null
  if (psk != null && authData == null) {
    data = parseLinkV1(_url)
  } else if (psk != null && authData != null) {
    data = parseLinkV2(_url)
  }

  if (!data) throw new Error(`Could not parse invitation data from deep url '${url}'`)

  logger.info(`Invitation data '${JSON.stringify(data)}' parsed`)
  return data
}

/**
 * Extract invitation data from deep url.
 * Valid format: quiet://?<peerid1>=<address1>&<peerid2>=<addresss2>&k=<psk>
 *
 * @param url V1 or V2 invite link URL to validate parameters on
 *
 * @returns {InvitationData} Parsed parameters
 */
export const parseInvitationLinkDeepUrl = (url: string): InvitationData => {
  return parseDeepUrl({ url })
}

/**
 * @param link <peerId1>=<address1>&<peerId2>=<address2>&k=<psk>
 *
 * @param url V1 or V2 invite link URL to validate parameters on
 *
 * @returns {InvitationData} Parsed parameters
 */
export const parseInvitationLink = (link: string): InvitationData => {
  return parseDeepUrl({ url: link, expectedProtocol: '' })
}

/**
 * Convert an array of peer addresses to an array of peer ID/onion address pairs
 *
 * @param addresses Array of peer addresses to parse and validate
 *
 * @returns {InvitationPair[]} Parsed and validated peer data
 */
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
    if (!validatePeerData({ peerId, onionAddress: rawAddress })) continue

    pairs.push({ peerId: peerId, onionAddress: rawAddress })
  }
  return pairs
}

/**
 * Convert an array of InvitationPair objects to an array of complete peer addresses
 *
 * @param pairs Array of InvitationPair objects
 *
 * @returns {string[]} Peer addresses formed from InvitationPairs
 */
export const pairsToP2pAddresses = (pairs: InvitationPair[]): string[] => {
  const addresses: string[] = []
  for (const pair of pairs) {
    addresses.push(createLibp2pAddress(pair.onionAddress, pair.peerId))
  }
  return addresses
}

/**
 * Convert an InvitationData object to valid invite link URL parameters and return a completed shareable invite link
 *
 * Example: https://tryquiet.org/join/#<peerid1>=<address1>&<peerid2>=<addresss2>&k=<psk>&o=<ownerOrbitDbIdentity>
 *
 * @param data InvitationData object representing the URL parameters on a new invite link URL
 *
 * @returns {string} Complete shareable invitation link
 */
export const composeInvitationShareUrl = (data: InvitationData): string => {
  return composeInvitationUrl(`${QUIET_JOIN_PAGE}`, data).replace('?', '#')
}

/**
 * Convert an InvitationData object to valid invite link URL parameters and return a completed deep invite link
 *
 * Example: quiet://?<peerid1>=<address1>&<peerid2>=<addresss2>&k=<psk>&o=<ownerOrbitDbIdentity>
 *
 * @param data InvitationData object representing the URL parameters on a new invite link URL
 *
 * @returns {string} Complete shareable invitation link
 */
export const composeInvitationDeepUrl = (data: InvitationData): string => {
  return composeInvitationUrl(`${DEEP_URL_SCHEME_WITH_SEPARATOR}`, data)
}

export const peerPairsToUrlParamString = (pairs: InvitationPair[]): string => {
  const commaSeparatedPairs: string[] = []
  for (const pair of pairs) {
    commaSeparatedPairs.push(`${pair.peerId},${pair.onionAddress}`)
  }
  return commaSeparatedPairs.join(';')
}

/**
 * Given a base URL (e.g. `quiet://`) and an InvitationData object determine the version of the invite data and
 * convert to URL parameters and return the completed invite link
 *
 * @param baseUrl Base URL for shareable or deep invite link URLs
 * @param data InvitationData object representing the URL parameters on a new invite link URL
 *
 * @returns {string} Complete invite link URL
 */
const composeInvitationUrl = (baseUrl: string, data: InvitationDataV1 | InvitationDataV2): string => {
  const url = new URL(baseUrl)

  if (!data.version) data.version = InvitationDataVersion.v1

  switch (data.version) {
    case InvitationDataVersion.v1:
      url.searchParams.append(PEER_ADDRESS_KEY, peerPairsToUrlParamString(data.pairs))
      url.searchParams.append(PSK_PARAM_KEY, data.psk)
      url.searchParams.append(OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity)
      break
    case InvitationDataVersion.v2:
      url.searchParams.append(PEER_ADDRESS_KEY, peerPairsToUrlParamString(data.pairs))
      url.searchParams.append(PSK_PARAM_KEY, data.psk)
      url.searchParams.append(OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity)
      url.searchParams.append(AUTH_DATA_KEY, encodeAuthData(data.authData))
  }
  return url.href
}

/**
 * Extract invitation codes from deep url if url is present in argv
 *
 * @param argv Command line arguments to parse
 *
 * @returns {InvitationData | null} Parsed and validated invite link URL parameters as InvitationData (if invite link present in args)
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
