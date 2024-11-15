import { InvitationDataV1, InvitationDataV2, InvitationDataVersion, InvitationPair } from '@quiet/types'
import {
  argvInvitationLink,
  composeInvitationDeepUrl,
  composeInvitationShareUrl,
  parseInvitationLinkDeepUrl,
  PSK_PARAM_KEY,
  OWNER_ORBIT_DB_IDENTITY_PARAM_KEY,
  p2pAddressesToPairs,
  CID_PARAM_KEY,
  TOKEN_PARAM_KEY,
  SERVER_ADDRESS_PARAM_KEY,
  INVITER_ADDRESS_PARAM_KEY,
  DEEP_URL_SCHEME_WITH_SEPARATOR,
  COMMUNITY_NAME_KEY,
  INVITATION_SEED_KEY,
} from './invitationLink'
import { QUIET_JOIN_PAGE } from './const'
import { validInvitationDatav1, validInvitationDatav2 } from './tests'
import { createLibp2pAddress } from './libp2p'

describe(`Invitation link helper ${InvitationDataVersion.v1}`, () => {
  const address = 'gloao6h5plwjy4tdlze24zzgcxll6upq2ex2fmu2ohhyu4gtys4nrjad'
  const peerId = 'QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wfFJDPPLsbKSE'
  const data: InvitationDataV1 = {
    ...validInvitationDatav1[0],
    pairs: [...validInvitationDatav1[0].pairs, { peerId: peerId, onionAddress: address }],
  }
  const urlParams = [
    [data.pairs[0].peerId, data.pairs[0].onionAddress],
    [data.pairs[1].peerId, data.pairs[1].onionAddress],
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
    [data.pairs[0].peerId, data.pairs[0].onionAddress],
    [data.pairs[1].peerId, data.pairs[1].onionAddress],
    [PSK_PARAM_KEY, data.psk],
    [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity],
    [COMMUNITY_NAME_KEY, data.communityName],
    [INVITATION_SEED_KEY, data.seed],
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

  it('throw error if community name is invalid', () => {
    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    const urlParams = [
      [data.pairs[0].peerId, data.pairs[0].onionAddress],
      [data.pairs[1].peerId, data.pairs[1].onionAddress],
      [PSK_PARAM_KEY, data.psk],
      [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity],
      [COMMUNITY_NAME_KEY, '()_*'],
      [INVITATION_SEED_KEY, data.seed],
    ]
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))

    try {
      const parsed = parseInvitationLinkDeepUrl(url.href)
      expect(parsed).toBe(null)
    } catch (e) {
      expect(e.message).toBe(`Invalid value '()_*' for key 'n' in invitation link`)
    }
  })

  it('throw error if seed is invalid', () => {
    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    const urlParams = [
      [data.pairs[0].peerId, data.pairs[0].onionAddress],
      [data.pairs[1].peerId, data.pairs[1].onionAddress],
      [PSK_PARAM_KEY, data.psk],
      [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity],
      [COMMUNITY_NAME_KEY, data.communityName],
      [INVITATION_SEED_KEY, 'ABC!@#!@#!@#!#!@'],
    ]
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))

    try {
      const parsed = parseInvitationLinkDeepUrl(url.href)
      expect(parsed).toBe(null)
    } catch (e) {
      expect(e.message).toBe(`Invalid value 'ABC!@#!@#!@#!#!@' for key 'd' in invitation link`)
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
      [data.pairs[0].peerId, data.pairs[0].onionAddress],
      [data.pairs[1].peerId, data.pairs[1].onionAddress],
      ['QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wf', 'y7yczmugl2tekami7sbdz5pfaemvx7bahwthrdv'],
      [PSK_PARAM_KEY, data.psk],
      [OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, data.ownerOrbitDbIdentity],
      [COMMUNITY_NAME_KEY, data.communityName],
      [INVITATION_SEED_KEY, data.seed],
    ]

    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    urlParamsWithInvalidAddress.forEach(([key, value]) => url.searchParams.append(key, value))

    const parsed = parseInvitationLinkDeepUrl(url.href)
    expect(parsed).toEqual({
      version: InvitationDataVersion.v2,
      ...data,
    })
  })
})
