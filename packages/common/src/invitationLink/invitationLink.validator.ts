import {
  InvitationAuthData,
  InvitationData,
  InvitationDataV1,
  InvitationDataV2,
  InvitationDataVersion,
  InvitationLinkUrlNamedParamConfig,
  InvitationLinkUrlNamedParamConfigMap,
  InvitationLinkUrlNamedParamProcessorFun,
  InvitationLinkUrlNamedParamValidatorFun,
  InvitationPair,
  VersionedInvitationLinkUrlParamConfig,
} from '@quiet/types'
import {
  AUTH_DATA_KEY,
  AUTH_DATA_OBJECT_KEY,
  COMMUNITY_NAME_KEY,
  DEEP_URL_SCHEME_WITH_SEPARATOR,
  INVITATION_SEED_KEY,
  OWNER_ORBIT_DB_IDENTITY_PARAM_KEY,
  PEER_ADDRESS_KEY,
  PSK_PARAM_KEY,
} from './invitationLink.const'
import { isPSKcodeValid } from '../libp2p'
import { createLogger } from '../logger'

const logger = createLogger('invite:validator')

const ONION_ADDRESS_REGEX = /^[a-z0-9]{56}$/g
const PEER_ID_REGEX = /^[a-zA-Z0-9]{46}$/g
const INVITATION_SEED_REGEX = /^[a-zA-Z0-9]{16}$/g
const COMMUNITY_NAME_REGEX = /^[-a-zA-Z0-9 ]+$/g
const AUTH_DATA_REGEX = /^[A-Za-z0-9_-]+$/g

/**
 * Helper Error class for generating validation errors in a standard format
 */
export class UrlParamValidatorError extends Error {
  name = 'UrlParamValidatorError'

  constructor(key: string, value: string | null | undefined) {
    super(`Invalid value '${value}' for key '${key}' in invitation link`)
  }
}

/**
 * Encode an InvitationAuthData object as a base64url-encoded URL param string
 *
 * Example:
 *
 * {
 *   "communityName": "community-name",
 *   "seed": "4kgd5mwq5z4fmfwq"
 * }
 *
 * => c=community-name&s=4kgd5mwq5z4fmfwq => Yz1jb21tdW5pdHktbmFtZSZzPTRrZ2Q1bXdxNXo0Zm1md3E
 *
 * @param authData InvitationAuthData object to encode
 *
 * @returns {string} Base64url-encoded string
 */
export const encodeAuthData = (authData: InvitationAuthData): string => {
  const encodedAuthData = `${COMMUNITY_NAME_KEY}=${encodeURIComponent(authData.communityName)}&${INVITATION_SEED_KEY}=${encodeURIComponent(authData.seed)}`
  return Buffer.from(encodedAuthData, 'utf8').toString('base64url')
}

/**
 * Decodes a base64url-encoded string and creates a fake-URL for parsing and validation
 *
 * Example:
 *
 * Yz1jb21tdW5pdHktbmFtZSZzPTRrZ2Q1bXdxNXo0Zm1md3E => quiet://?c=community-name&s=4kgd5mwq5z4fmfwq
 *
 * @param authDataString Base64url-encoded string representing the InvitationAuthData of the invite link
 *
 * @returns {string} URL-encoded string of the InvitationAuthData object as URL with parameters
 */
export const decodeAuthData: InvitationLinkUrlNamedParamProcessorFun<string> = (authDataString: string): string => {
  return `${DEEP_URL_SCHEME_WITH_SEPARATOR}?${Buffer.from(authDataString, 'base64url').toString('utf8')}`
}

/**
 * Validate that the peer ID and onion address provided in the invite link are of the correct form
 *
 * @param peerData The peer ID and onion address to validate
 *
 * @returns {boolean} `true` if the data is valid, else false
 */
export const validatePeerData = ({ peerId, onionAddress }: { peerId: string; onionAddress: string }): boolean => {
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

// TODO: TECH DEBT: Get rid of when we go to 3.0
/**
 * **** LEGACY - This is only here to handle older invite links ****
 *
 * Validate all peer data pairs on an invite link URL
 *
 * @param url Invite link URL to validate peer data on
 * @param unnamedParams Parameters that were not previously parsed and validated
 *
 * @returns {InvitationPair[]} Validated InvitationPairs
 */
const validatePeerPairsFromUrlParams = (url: string, unnamedParams: URLSearchParams): InvitationPair[] => {
  const pairs: InvitationPair[] = []

  unnamedParams.forEach((onionAddress, peerId) => {
    if (!validatePeerData({ peerId, onionAddress })) return
    pairs.push({
      peerId,
      onionAddress,
    })
  })

  if (pairs.length === 0) {
    throw new Error(`No valid peer addresses found in invitation link '${url}'`)
  }

  return pairs
}

/**
 * Validate the format of the provided PSK
 *
 * Example:
 *
 * BNlxfE2WBF7LrlpIX0CvECN5o1oZtA16PkAb7GYiwYw=
 *
 * =>
 *
 * {
 *  "psk": "BNlxfE2WBF7LrlpIX0CvECN5o1oZtA16PkAb7GYiwYw="
 * }
 *
 * @param value PSK string pulled from invite link
 *
 * @returns {Partial<InvitationData>} The processed PSK represented as a partial InvitationData object
 */
const validatePsk: InvitationLinkUrlNamedParamValidatorFun<InvitationDataV1> = (
  value: string
): Partial<InvitationDataV1> => {
  if (!isPSKcodeValid(value)) {
    logger.warn(`PSK is null or not a valid PSK code`)
    throw new UrlParamValidatorError(PSK_PARAM_KEY, value)
  }

  return {
    psk: value,
  }
}

/**
 * Validate the format of the provided owner's OrbitDB identity string
 *
 * NOTE: currently we do no actual validation on this parameter other than the non-null check in _parseAndValidateNamedParam
 *
 * Example:
 *
 * Yz1jb21tdW5pdHktbmFtZSZzPTRrZ2Q1bXdxNXo0Zm1md3E
 *
 * =>
 *
 * {
 *  "ownerOrbitDbIdentity": "018f9e87541d0b61cb4565af8df9699f658116afc54ae6790c31bbf6df3fc343b0"
 * }
 *
 * @param value Owner's OrbitDB identity string pulled from invite link
 *
 * @returns {Partial<InvitationData>} The processed owner OrbitDB identity represented as a partial InvitationData object
 */
const validateOwnerOrbitDbIdentity: InvitationLinkUrlNamedParamValidatorFun<InvitationDataV1> = (
  value: string
): Partial<InvitationDataV1> => {
  return {
    ownerOrbitDbIdentity: value,
  }
}

/**
 * Validate the format of the provided owner's OrbitDB identity string
 *
 * NOTE: currently we do no actual validation on this parameter other than the non-null check in _parseAndValidateNamedParam
 *
 * Example:
 *
 * Yz1jb21tdW5pdHktbmFtZSZzPTRrZ2Q1bXdxNXo0Zm1md3E
 *
 * =>
 *
 * {
 *  "ownerOrbitDbIdentity": "018f9e87541d0b61cb4565af8df9699f658116afc54ae6790c31bbf6df3fc343b0"
 * }
 *
 * @param value Owner's OrbitDB identity string pulled from invite link
 *
 * @returns {Partial<InvitationData>} The processed owner OrbitDB identity represented as a partial InvitationData object
 */
const validatePeerAddresses: InvitationLinkUrlNamedParamValidatorFun<InvitationDataV1> = (
  value: string
): Partial<InvitationDataV1> => {
  const pairs: InvitationPair[] = []

  const stringPairs = value.split(';')
  stringPairs.forEach(stringPair => {
    const [peerId, onionAddress] = stringPair.split(',')
    if (!validatePeerData({ peerId, onionAddress })) return
    pairs.push({
      peerId,
      onionAddress,
    })
  })

  if (pairs.length === 0) {
    logger.warn(`Peer address string contained no ID/address pairs`)
    throw new UrlParamValidatorError(PEER_ADDRESS_KEY, value)
  }

  return {
    pairs,
  }
}

/**
 * Parse and validate the provided auth data string
 *
 * Example:
 *
 * BNlxfE2WBF7LrlpIX0CvECN5o1oZtA16PkAb7GYiwYw=
 *
 * =>
 *
 * {
 *  "authData": {
 *    "communityName": "community-name",
 *    "seed": "4kgd5mwq5z4fmfwq"
 *  }
 * }
 *
 * @param value Auth data string pulled from invite link
 *
 * @returns {Partial<InvitationData>} The processed auth data represented as a partial InvitationData object
 */
const validateAuthData: InvitationLinkUrlNamedParamValidatorFun<string> = (value: string): string => {
  if (value.match(AUTH_DATA_REGEX) == null) {
    logger.warn(`Auth data string is not a valid base64url-encoded string`)
    throw new UrlParamValidatorError(AUTH_DATA_KEY, value)
  }
  return decodeAuthData(value)
}

/**
 * **** NESTED VALIDATOR ****
 *
 * Parse and validate the provided LFA invitation seed string
 *
 * Example:
 *
 * 4kgd5mwq5z4fmfwq
 *
 * =>
 *
 * {
 *   "seed": "4kgd5mwq5z4fmfwq"
 * }
 *
 * @param value Nested LFA invitation seed string pulled from the decoded auth data string
 *
 * @returns {Partial<InvitationAuthData>} The processed LFA invitation seed represented as a partial InvitationAuthData object
 */
const validateInvitationSeed: InvitationLinkUrlNamedParamValidatorFun<InvitationAuthData> = (
  value: string
): Partial<InvitationAuthData> => {
  if (value.match(INVITATION_SEED_REGEX) == null) {
    logger.warn(`Invitation seed ${value} is not a valid LFA seed`)
    throw new UrlParamValidatorError(`${AUTH_DATA_KEY}.${INVITATION_SEED_KEY}`, value)
  }
  return {
    seed: value,
  }
}

/**
 * **** NESTED VALIDATOR ****
 *
 * Parse and validate the provided community name string
 *
 * Example:
 *
 * community-name
 *
 * =>
 *
 * {
 *   "communityName": "community-name"
 * }
 *
 * @param value Nested community name string pulled from the decoded auth data string
 * @param processor Optional post-processor to run the validated value through
 *
 * @returns {Partial<InvitationAuthData>} The processed community name represented as a partial InvitationAuthData object
 */
const validateCommunityName: InvitationLinkUrlNamedParamValidatorFun<InvitationAuthData> = (
  value: string
): Partial<InvitationAuthData> => {
  if (value.match(COMMUNITY_NAME_REGEX) == null) {
    logger.warn(`Community name ${value} is not a valid Quiet community name`)
    throw new UrlParamValidatorError(`${AUTH_DATA_KEY}.${COMMUNITY_NAME_KEY}`, value)
  }
  return {
    communityName: value,
  }
}

/**
 * URL param validation config for V1 (non-LFA) invite links
 */
export const PARAM_CONFIG_V1: VersionedInvitationLinkUrlParamConfig<InvitationDataV1> = {
  version: InvitationDataVersion.v1,
  named: new Map(
    Object.entries({
      [PSK_PARAM_KEY]: {
        required: true,
        validator: validatePsk,
      },
      [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY]: {
        required: true,
        validator: validateOwnerOrbitDbIdentity,
      },
      [PEER_ADDRESS_KEY]: {
        required: false,
        validator: validatePeerAddresses,
      },
    })
  ),
}

/**
 * URL param validation config for V2 (LFA) invite links
 */
export const PARAM_CONFIG_V2: VersionedInvitationLinkUrlParamConfig<InvitationDataV2> = {
  version: InvitationDataVersion.v2,
  named: new Map(
    Object.entries({
      [PSK_PARAM_KEY]: {
        required: true,
        validator: validatePsk,
      },
      [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY]: {
        required: true,
        validator: validateOwnerOrbitDbIdentity,
      },
      [PEER_ADDRESS_KEY]: {
        required: false,
        validator: validatePeerAddresses,
      },
      [AUTH_DATA_KEY]: {
        required: true,
        validator: validateAuthData,
        nested: {
          key: AUTH_DATA_OBJECT_KEY,
          config: new Map(
            Object.entries({
              [COMMUNITY_NAME_KEY]: {
                required: true,
                validator: validateCommunityName,
              },
              [INVITATION_SEED_KEY]: {
                required: true,
                validator: validateInvitationSeed,
              },
            })
          ),
        },
      },
    })
  ),
}

/**
 * Parse and validate a given URL param from an invite link URL and put it into the form of an InvitationData object
 *
 * Example:
 *
 * Given a key-value pair `a=Yz1jb21tdW5pdHktbmFtZSZzPTRrZ2Q1bXdxNXo0Zm1md3E` the returned value would be
 *
 * {
 *  "authData": {
 *    "communityName": "community-name",
 *    "seed": "4kgd5mwq5z4fmfwq"
 *  }
 * }
 *
 * @param key URL param key
 * @param value Value of URL param with the given key
 * @param config The validation config for this param
 *
 * @returns {Partial<InvitationData>} The processed URL param represented as a partial InvitationData object
 */
const _parseAndValidateNamedParam = <T>(
  key: string,
  value: string | null | undefined,
  config: InvitationLinkUrlNamedParamConfig<T>
): any | undefined => {
  if (value == null) {
    if (config.required) throw new Error(`Missing required key '${key}' in invitation link`)
    return undefined
  }

  return config.validator(value)
}

/**
 * Parse and validate named URL parameters recursively
 *
 * Example:
 *
 * quiet://?QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wfFJDPPLsbKSE=y7yczmugl2tekami7sbdz5pfaemvx7bahwthrdvcbzw5vex2crsr26qd&QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wfFJDPPLsbKSE=gloao6h5plwjy4tdlze24zzgcxll6upq2ex2fmu2ohhyu4gtys4nrjad&k=BNlxfE2WBF7LrlpIX0CvECN5o1oZtA16PkAb7GYiwYw%3D&o=018f9e87541d0b61cb4565af8df9699f658116afc54ae6790c31bbf6df3fc343b0&a=Yz1jb21tdW5pdHktbmFtZSZzPTRrZ2Q1bXdxNXo0Zm1md3E
 *
 * The value of `a` is a base64url-encoded string that decodes to `c=community-name&s=4kgd5mwq5z4fmfwq` and _parseAndValidateUrlParams will recursively parse and validate the nested params
 *
 * @param params List of named URL params pulled from the invite link URL
 * @param paramConfigMap Map of URL params that are expected on this invite URL
 *
 * @returns { output: Partial<T>; params: URLSearchParams } Object built from all named URL parameters and the remaining parameters
 */
const _parseAndValidateNamedUrlParams = <T>(
  params: URLSearchParams,
  paramConfigMap: InvitationLinkUrlNamedParamConfigMap<T>
): { output: Partial<T>; params: URLSearchParams } => {
  let output: Partial<T> = {}
  for (const pc of paramConfigMap.entries()) {
    const [key, config] = pc
    let value = _parseAndValidateNamedParam(key, params.get(key), config)
    if (value == null) {
      continue
    }

    if (config.nested) {
      const nestedParams = new URL(value).searchParams
      const { output: nestedValue } = _parseAndValidateNamedUrlParams(nestedParams, config.nested.config)
      value = {
        [config.nested.key]: nestedValue,
      }
    }
    output = {
      ...output,
      ...value,
    }
    params.delete(key)
  }

  return {
    output,
    params,
  }
}

/**
 * Parse and validate URL parameters on an invitation link URL
 *
 * @param url Invite link URL
 * @param paramConfigMap Map of named URL params that are expected on this invite URL
 *
 * @returns {InvitationData} Parsed URL params
 */
export const parseAndValidateUrlParams = <T extends InvitationData>(
  url: string,
  paramConfigMap: VersionedInvitationLinkUrlParamConfig<T>
): T => {
  const params = new URL(url).searchParams
  const { output, params: remainingParams } = _parseAndValidateNamedUrlParams<InvitationData>(
    params,
    paramConfigMap.named
  )

  // TODO: TECH DEBT: Get rid of when we go to 3.0
  // To keep this backwards compatible we should check if peer pairs were found using the named key and try to pull them from
  // dynamic params instead
  let pairs: InvitationPair[] | undefined = output.pairs
  if (pairs == null && paramConfigMap.named.get(PEER_ADDRESS_KEY) != null) {
    pairs = validatePeerPairsFromUrlParams(url, remainingParams)
  }

  return {
    ...output,
    pairs,
    version: paramConfigMap.version,
  } as T
}
