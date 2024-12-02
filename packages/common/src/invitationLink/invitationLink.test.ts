import { InvitationDataV1, InvitationDataV2, InvitationDataVersion, InvitationPair } from '@quiet/types'
import {
  argvInvitationLink,
  composeInvitationDeepUrl,
  composeInvitationShareUrl,
  parseInvitationLinkDeepUrl,
  p2pAddressesToPairs,
  peerPairsToUrlParamString,
} from './invitationLink'
import {
  PSK_PARAM_KEY,
  OWNER_ORBIT_DB_IDENTITY_PARAM_KEY,
  DEEP_URL_SCHEME_WITH_SEPARATOR,
  AUTH_DATA_KEY,
  PEER_ADDRESS_KEY,
} from './invitationLink.const'
import { QUIET_JOIN_PAGE } from '../const'
import { validInvitationDatav1, validInvitationDatav2 } from '../tests'
import { createLibp2pAddress } from '../libp2p'
import { encodeAuthData } from './invitationLink.validator'

describe(`Invitation link helper ${InvitationDataVersion.v1}`, () => {
  const address = 'gloao6h5plwjy4tdlze24zzgcxll6upq2ex2fmu2ohhyu4gtys4nrjad'
  const peerId = 'QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wfFJDPPLsbKSE'
  const data: InvitationDataV1 = {
    ...validInvitationDatav1[0],
    pairs: [...validInvitationDatav1[0].pairs, { peerId: peerId, onionAddress: address }],
  }
  const urlParams = [
    [PEER_ADDRESS_KEY, peerPairsToUrlParamString([data.pairs[0], data.pairs[1]])],
    [PSK_PARAM_KEY, data.psk],
    [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity],
  ]

  it('retrieves invitation link from argv', () => {
    const result = argvInvitationLink(['something', 'quiet:/invalid', 'zbay://invalid', composeInvitationDeepUrl(data)])
    expect(result).toEqual(data)
  })

  it('returns null if argv do not contain any url with proper scheme', () => {
    const result = argvInvitationLink(['something', 'quiet:/invalid', 'zbay://invalid'])
    expect(result).toBeNull()
  })

  it('throws error if argv contains invalid invitation url', () => {
    expect(() => {
      argvInvitationLink(['something', 'quiet:/invalid', 'quiet://?param=invalid'])
    }).toThrow()
  })

  it('composes proper invitation deep url', () => {
    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))
    expect(composeInvitationDeepUrl(data)).toEqual(url.href)
  })

  it('creates invitation share url based on invitation data', () => {
    const url = new URL(QUIET_JOIN_PAGE)
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))
    expect(composeInvitationShareUrl(data)).toEqual(url.href.replace('?', '#'))
  })

  it('converts list of p2p addresses to invitation pairs', () => {
    const pair: InvitationPair = {
      peerId: 'QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wfFJDPPLsbKSE',
      onionAddress: 'gloao6h5plwjy4tdlze24zzgcxll6upq2ex2fmu2ohhyu4gtys4nrjad',
    }
    const peerList = [
      createLibp2pAddress(pair.onionAddress, pair.peerId),
      'invalidAddress',
      createLibp2pAddress('somethingElse.onion', 'QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wfFJDPPLsbKSA'),
    ]
    expect(p2pAddressesToPairs(peerList)).toEqual([pair])
  })

  it('retrieves invitation data from deep url', () => {
    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))

    const parsed = parseInvitationLinkDeepUrl(url.href)
    expect(parsed).toEqual({
      version: InvitationDataVersion.v1,
      ...data,
    })
  })

  it.each([
    [PSK_PARAM_KEY, '12345'],
    [PSK_PARAM_KEY, 'a2FzemE='],
    [PSK_PARAM_KEY, 'a2FycGllIHcgZ2FsYXJlY2llIGVjaWUgcGVjaWUgYWxlIGkgdGFrIHpqZWNpZQ=='],
  ])('parsing deep url throws error if data is invalid: %s=%s', (paramKey: string, paramValue: string) => {
    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))

    // Replace valid param value with invalid one
    url.searchParams.set(paramKey, paramValue)

    expect(() => {
      parseInvitationLinkDeepUrl(url.href)
    }).toThrow()
  })

  it('retrieves invitation data from deep url with partly invalid addresses', () => {
    const urlParamsWithInvalidAddress = [
      [data.pairs[0].peerId, data.pairs[0].onionAddress],
      [data.pairs[1].peerId, data.pairs[1].onionAddress],
      ['QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wf', 'y7yczmugl2tekami7sbdz5pfaemvx7bahwthrdv'],
      [PSK_PARAM_KEY, data.psk],
      [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity],
    ]

    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    urlParamsWithInvalidAddress.forEach(([key, value]) => url.searchParams.append(key, value))

    const parsed = parseInvitationLinkDeepUrl(url.href)
    expect(parsed).toEqual({
      version: InvitationDataVersion.v1,
      ...data,
    })
  })
})

describe(`Invitation link helper ${InvitationDataVersion.v2}`, () => {
  const address = 'gloao6h5plwjy4tdlze24zzgcxll6upq2ex2fmu2ohhyu4gtys4nrjad'
  const peerId = 'QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wfFJDPPLsbKSE'
  const data: InvitationDataV2 = {
    ...validInvitationDatav2[0],
    pairs: [...validInvitationDatav1[0].pairs, { peerId: peerId, onionAddress: address }],
  }
  const urlParams = [
    [PEER_ADDRESS_KEY, peerPairsToUrlParamString([data.pairs[0], data.pairs[1]])],
    [PSK_PARAM_KEY, data.psk],
    [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity],
    [AUTH_DATA_KEY, encodeAuthData(data.authData)],
  ]

  it('retrieves invitation link from argv', () => {
    const result = argvInvitationLink(['something', 'quiet:/invalid', 'zbay://invalid', composeInvitationDeepUrl(data)])
    expect(result).toEqual(data)
  })

  it('returns null if argv do not contain any url with proper scheme', () => {
    const result = argvInvitationLink(['something', 'quiet:/invalid', 'zbay://invalid'])
    expect(result).toBeNull()
  })

  it('throws error if argv contains invalid invitation url', () => {
    expect(() => {
      argvInvitationLink(['something', 'quiet:/invalid', 'quiet://?param=invalid'])
    }).toThrow()
  })

  it('composes proper invitation deep url', () => {
    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))
    expect(composeInvitationDeepUrl(data)).toEqual(url.href)
  })

  it('creates invitation share url based on invitation data', () => {
    const url = new URL(QUIET_JOIN_PAGE)
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))
    expect(composeInvitationShareUrl(data)).toEqual(url.href.replace('?', '#'))
  })

  it('converts list of p2p addresses to invitation pairs', () => {
    const pair: InvitationPair = {
      peerId: 'QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wfFJDPPLsbKSE',
      onionAddress: 'gloao6h5plwjy4tdlze24zzgcxll6upq2ex2fmu2ohhyu4gtys4nrjad',
    }
    const peerList = [
      createLibp2pAddress(pair.onionAddress, pair.peerId),
      'invalidAddress',
      createLibp2pAddress('somethingElse.onion', 'QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wfFJDPPLsbKSA'),
    ]
    expect(p2pAddressesToPairs(peerList)).toEqual([pair])
  })

  it('retrieves invitation data from deep url', () => {
    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))

    const parsed = parseInvitationLinkDeepUrl(url.href)
    expect(parsed).toEqual({
      version: InvitationDataVersion.v2,
      ...data,
    })
  })

  it('throw error if auth data string is invalid', () => {
    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    const urlParams = [
      [PEER_ADDRESS_KEY, peerPairsToUrlParamString([data.pairs[0], data.pairs[1]])],
      [PSK_PARAM_KEY, data.psk],
      [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity],
      [AUTH_DATA_KEY, '()_*'],
    ]
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))

    try {
      const parsed = parseInvitationLinkDeepUrl(url.href)
      expect(parsed).toBe(null)
    } catch (e) {
      expect(e.message).toBe(`Invalid value '()_*' for key 'a' in invitation link`)
    }
  })

  it('throw error if peer address param is present but no valid addresses are found', () => {
    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    const urlParams = [
      [PEER_ADDRESS_KEY, 'foobar'],
      [PSK_PARAM_KEY, data.psk],
      [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity],
      [AUTH_DATA_KEY, encodeAuthData(data.authData)],
    ]
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))

    try {
      const parsed = parseInvitationLinkDeepUrl(url.href)
      expect(parsed).toBe(null)
    } catch (e) {
      expect(e.message).toContain(`Invalid value 'foobar' for key 'p' in invitation link`)
    }
  })

  // TODO: TECH DEBT: Get rid of when we go to 3.0
  it('LEGACY - throw error if no peer pairs are found as named param or dynamic params', () => {
    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    const urlParams = [
      [PSK_PARAM_KEY, data.psk],
      [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity],
      [AUTH_DATA_KEY, encodeAuthData(data.authData)],
    ]
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))

    try {
      const parsed = parseInvitationLinkDeepUrl(url.href)
      expect(parsed).toBe(null)
    } catch (e) {
      expect(e.message).toContain(`No valid peer addresses found in invitation link`)
    }
  })

  it('throw error if community name is invalid', () => {
    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    const urlParams = [
      [PEER_ADDRESS_KEY, peerPairsToUrlParamString([data.pairs[0], data.pairs[1]])],
      [PSK_PARAM_KEY, data.psk],
      [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity],
      [
        AUTH_DATA_KEY,
        encodeAuthData({
          ...data.authData,
          communityName: '()_*',
        }),
      ],
    ]
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))

    try {
      const parsed = parseInvitationLinkDeepUrl(url.href)
      expect(parsed).toBe(null)
    } catch (e) {
      expect(e.message).toBe(`Invalid value '()_*' for key 'a.c' in invitation link`)
    }
  })

  it('throw error if seed is invalid', () => {
    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    const urlParams = [
      [PEER_ADDRESS_KEY, peerPairsToUrlParamString([data.pairs[0], data.pairs[1]])],
      [PSK_PARAM_KEY, data.psk],
      [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity],
      [
        AUTH_DATA_KEY,
        encodeAuthData({
          ...data.authData,
          seed: 'ABC!@#!@#!@#!#!@',
        }),
      ],
    ]
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))

    try {
      const parsed = parseInvitationLinkDeepUrl(url.href)
      expect(parsed).toBe(null)
    } catch (e) {
      expect(e.message).toBe(`Invalid value 'ABC!@#!@#!@#!#!@' for key 'a.s' in invitation link`)
    }
  })

  it.each([
    [PSK_PARAM_KEY, '12345'],
    [PSK_PARAM_KEY, 'a2FzemE='],
    [PSK_PARAM_KEY, 'a2FycGllIHcgZ2FsYXJlY2llIGVjaWUgcGVjaWUgYWxlIGkgdGFrIHpqZWNpZQ=='],
  ])('parsing deep url throws error if data is invalid: %s=%s', (paramKey: string, paramValue: string) => {
    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))

    // Replace valid param value with invalid one
    url.searchParams.set(paramKey, paramValue)

    expect(() => {
      parseInvitationLinkDeepUrl(url.href)
    }).toThrow()
  })

  it('retrieves invitation data from deep url with partly invalid addresses', () => {
    const urlParamsWithInvalidAddress = [
      [
        PEER_ADDRESS_KEY,
        peerPairsToUrlParamString([
          data.pairs[0],
          data.pairs[1],
          {
            peerId: 'QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wf',
            onionAddress: 'y7yczmugl2tekami7sbdz5pfaemvx7bahwthrdv',
          },
        ]),
      ],
      [PSK_PARAM_KEY, data.psk],
      [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity],
      [AUTH_DATA_KEY, encodeAuthData(data.authData)],
    ]

    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    urlParamsWithInvalidAddress.forEach(([key, value]) => url.searchParams.append(key, value))

    const parsed = parseInvitationLinkDeepUrl(url.href)
    expect(parsed).toEqual({
      version: InvitationDataVersion.v2,
      ...data,
    })
  })

  // TODO: TECH DEBT: Get rid of when we go to 3.0
  it('LEGACY - retrieves invitation data from url with dynamic peer address params', () => {
    const urlParamsWithDynamicPeerParams = [
      [data.pairs[0].peerId, data.pairs[0].onionAddress],
      [data.pairs[1].peerId, data.pairs[1].onionAddress],
      [PSK_PARAM_KEY, data.psk],
      [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity],
      [AUTH_DATA_KEY, encodeAuthData(data.authData)],
    ]

    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    urlParamsWithDynamicPeerParams.forEach(([key, value]) => url.searchParams.append(key, value))

    const parsed = parseInvitationLinkDeepUrl(url.href)
    expect(parsed).toEqual({
      version: InvitationDataVersion.v2,
      ...data,
    })
  })
})
