import {
  InvitationAuthData,
  InvitationData,
  InvitationDataV1,
  InvitationDataV2,
  InvitationDataVersion,
  InvitationLinkUrlParamConfig,
  InvitationLinkUrlParamConfigMap,
  InvitationLinkUrlParamProcessorFun,
  InvitationLinkUrlParamValidatorFun,
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
  PSK_PARAM_KEY,
} from './invitationLink.const'
import { isPSKcodeValid } from './libp2p'
import { createLogger } from './logger'

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
 * @returns Base64url-encoded string
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
 * @returns URL-encoded string of the InvitationAuthData object as URL with parameters
 */
export const decodeAuthData: InvitationLinkUrlParamProcessorFun<string> = (authDataString: string): string => {
  return `${DEEP_URL_SCHEME_WITH_SEPARATOR}?${Buffer.from(authDataString, 'base64url').toString('utf8')}`
}

/**
 * Validate that the peer ID and onion address provided in the invite link are of the correct form
 *
 * @param peerData The peer ID and onion address to validate
 *
 * @returns `true` if the data is valid, else false
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

/**
 * Validate all peer data pairs on an invite link URL
 *
 * @param url Invite link URL to validate peer data on
 * @param unnamedParams Parameters that were not previously parsed and validated
 *
 * @returns Validated InvitationPair objects
 */
const validatePeerPairs = (url: string, unnamedParams: URLSearchParams): InvitationPair[] => {
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
 * @param processor Optional post-processor to run the validated value through
 *
 * @returns The processed PSK represented as a partial InvitationData object
 */
const validatePsk: InvitationLinkUrlParamValidatorFun<InvitationDataV1> = (
  value: string,
  processor?: InvitationLinkUrlParamProcessorFun<string>
): Partial<InvitationDataV1> => {
  if (!isPSKcodeValid(value)) {
    logger.warn(`PSK is null or not a valid PSK code`)
    throw new UrlParamValidatorError(PSK_PARAM_KEY, value)
  }

  return {
    psk: processor != null ? processor(value) : value,
  }
}

/**
 * Validate the format of the provided owner's OrbitDB identity string
 *
 * NOTE: currently we do no actual validation on this parameter other than the non-null check in _parseAndValidateParam
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
 * @param processor Optional post-processor to run the validated value through
 *
 * @returns The processed owner OrbitDB identity represented as a partial InvitationData object
 */
const validateOwnerOrbitDbIdentity: InvitationLinkUrlParamValidatorFun<InvitationDataV1> = (
  value: string,
  processor?: InvitationLinkUrlParamProcessorFun<string>
): Partial<InvitationDataV1> => {
  return {
    ownerOrbitDbIdentity: processor != null ? processor(value) : (value ?? undefined),
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
 * @param processor Optional post-processor to run the validated value through
 *
 * @returns The processed auth data represented as a partial InvitationData object
 */
const validateAuthData: InvitationLinkUrlParamValidatorFun<string> = (
  value: string,
  processor?: InvitationLinkUrlParamProcessorFun<string>
): string => {
  if (value.match(AUTH_DATA_REGEX) == null) {
    logger.warn(`Auth data string is not a valid base64url-encoded string`)
    throw new UrlParamValidatorError(AUTH_DATA_KEY, value)
  }
  return processor != null ? processor(value) : value
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
 * @param processor Optional post-processor to run the validated value through
 *
 * @returns The processed LFA invitation seed represented as a partial InvitationAuthData object
 */
const validateInvitationSeed: InvitationLinkUrlParamValidatorFun<InvitationAuthData> = (
  value: string,
  processor?: InvitationLinkUrlParamProcessorFun<string>
): Partial<InvitationAuthData> => {
  if (value.match(INVITATION_SEED_REGEX) == null) {
    logger.warn(`Invitation seed ${value} is not a valid LFA seed`)
    throw new UrlParamValidatorError(`${AUTH_DATA_KEY}.${INVITATION_SEED_KEY}`, value)
  }
  return {
    seed: processor != null ? processor(value) : value,
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
 * @returns The processed community name represented as a partial InvitationAuthData object
 */
const validateCommunityName: InvitationLinkUrlParamValidatorFun<InvitationAuthData> = (
  value: string,
  processor?: InvitationLinkUrlParamProcessorFun<string>
): Partial<InvitationAuthData> => {
  if (value.match(COMMUNITY_NAME_REGEX) == null) {
    logger.warn(`Community name ${value} is not a valid Quiet community name`)
    throw new UrlParamValidatorError(`${AUTH_DATA_KEY}.${COMMUNITY_NAME_KEY}`, value)
  }
  return {
    communityName: processor != null ? processor(value) : value,
  }
}

/**
 * URL param validation config for V1 (non-LFA) invite links
 */
export const PARAM_CONFIG_V1: VersionedInvitationLinkUrlParamConfig<InvitationDataV1> = {
  version: InvitationDataVersion.v1,
  map: new Map(
    Object.entries({
      [PSK_PARAM_KEY]: {
        required: true,
        validator: validatePsk,
      },
      [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY]: {
        required: true,
        validator: validateOwnerOrbitDbIdentity,
      },
    })
  ),
}

/**
 * URL param validation config for V2 (LFA) invite links
 */
export const PARAM_CONFIG_V2: VersionedInvitationLinkUrlParamConfig<InvitationDataV2> = {
  version: InvitationDataVersion.v2,
  map: new Map(
    Object.entries({
      [PSK_PARAM_KEY]: {
        required: true,
        validator: validatePsk,
      },
      [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY]: {
        required: true,
        validator: validateOwnerOrbitDbIdentity,
      },
      [AUTH_DATA_KEY]: {
        required: true,
        validator: validateAuthData,
        processor: decodeAuthData,
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
 * @returns The processed URL param represented as a partial InvitationData object
 */
const _parseAndValidateParam = <T>(
  key: string,
  value: string | null | undefined,
  config: InvitationLinkUrlParamConfig<T>
): any => {
  if (value == null && config.required) {
    throw new Error(`Missing required key '${key}' in invitation link`)
  }

  let output: any
  try {
    output = config.validator(value, config.processor)
  } catch (e) {
    if (e.name === UrlParamValidatorError.name) {
      if (config.required) throw e
    } else {
      throw e
    }
  }
  return output
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
 * @returns Object built from all named URL parameters and the remaining parameters
 */
const _parseAndValidateUrlParams = <T>(
  params: URLSearchParams,
  paramConfigMap: InvitationLinkUrlParamConfigMap<T>
): { output: Partial<T>; params: URLSearchParams } => {
  let output: Partial<T> = {}
  for (const pc of paramConfigMap.entries()) {
    const [key, config] = pc
    let value = _parseAndValidateParam(key, params.get(key), config)
    if (config.nested) {
      const nestedParams = new URL(value).searchParams
      const { output: nestedValue } = _parseAndValidateUrlParams(nestedParams, config.nested.config)
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
 * @returns InvitationData object of parsed URL params
 */
export const parseAndValidateUrlParams = <T extends InvitationData>(
  url: string,
  paramConfigMap: VersionedInvitationLinkUrlParamConfig<T>
): T => {
  const params = new URL(url).searchParams
  const { output, params: remainingParams } = _parseAndValidateUrlParams(params, paramConfigMap.map)
  return {
    ...output,
    pairs: validatePeerPairs(url, remainingParams),
    version: paramConfigMap.version,
  } as T
}
