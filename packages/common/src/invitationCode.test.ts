import { InvitationDataV1, InvitationDataVersion, InvitationPair } from '@quiet/types'
import {
  argvInvitationCode,
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
} from './invitationCode'
import { QUIET_JOIN_PAGE } from './const'
import { validInvitationDatav1, validInvitationDatav2 } from './tests'
import { createLibp2pAddress } from './libp2p'

describe(`Invitation code helper ${InvitationDataVersion.v1}`, () => {
  const address = 'gloao6h5plwjy4tdlze24zzgcxll6upq2ex2fmu2ohhyu4gtys4nrjad'
  const peerId = '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN4zF'
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

  it('retrieves invitation code from argv', () => {
    const result = argvInvitationCode(['something', 'quiet:/invalid', 'zbay://invalid', composeInvitationDeepUrl(data)])
    expect(result).toEqual(data)
  })

  it('returns null if argv do not contain any url with proper scheme', () => {
    const result = argvInvitationCode(['something', 'quiet:/invalid', 'zbay://invalid'])
    expect(result).toBeNull()
  })

  it('throws error if argv contains invalid invitation url', () => {
    expect(() => {
      argvInvitationCode(['something', 'quiet:/invalid', 'quiet://?param=invalid'])
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
      peerId: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN4zF',
      onionAddress: 'gloao6h5plwjy4tdlze24zzgcxll6upq2ex2fmu2ohhyu4gtys4nrjad',
    }
    const peerList = [
      createLibp2pAddress(pair.onionAddress, pair.peerId),
      'invalidAddress',
      createLibp2pAddress('somethingElse.onion', '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY'),
    ]
    expect(p2pAddressesToPairs(peerList)).toEqual([pair])
  })

  it('retrieves invitation codes from deep url', () => {
    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))

    const codes = parseInvitationLinkDeepUrl(url.href)
    expect(codes).toEqual({
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

  it('retrieves invitation codes from deep url with partly invalid addresses', () => {
    const urlParamsWithInvalidAddress = [
      [data.pairs[0].peerId, data.pairs[0].onionAddress],
      [data.pairs[1].peerId, data.pairs[1].onionAddress],
      ['12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN4zF', 'y7yczmugl2tekami7sbdz5pfaemvx7bahwthrdv'],
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

describe(`Invitation code helper ${InvitationDataVersion.v2}`, () => {
  const data = validInvitationDatav2[0]
  const urlParams = [
    [CID_PARAM_KEY, data.cid],
    [TOKEN_PARAM_KEY, data.token],
    [SERVER_ADDRESS_PARAM_KEY, data.serverAddress],
    [INVITER_ADDRESS_PARAM_KEY, data.inviterAddress],
  ]

  it('creates invitation share url based on invitation data', () => {
    const url = new URL(QUIET_JOIN_PAGE)
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))
    expect(composeInvitationShareUrl(data)).toEqual(url.href.replace('?', '#'))
  })

  it('composes proper invitation deep url', () => {
    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))
    expect(composeInvitationDeepUrl(data)).toEqual(url.href)
  })

  it('retrieves invitation codes from deep url v2', () => {
    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))
    const codes = parseInvitationLinkDeepUrl(url.href)
    expect(codes).toEqual({
      version: InvitationDataVersion.v2,
      cid: data.cid,
      token: data.token,
      serverAddress: data.serverAddress,
      inviterAddress: data.inviterAddress,
    })
  })

  it.each([
    // TODO: add check for invalid token
    [CID_PARAM_KEY, 'sth'],
    [SERVER_ADDRESS_PARAM_KEY, 'website.com'],
    [INVITER_ADDRESS_PARAM_KEY, 'abcd'],
  ])('parsing deep url throws error if data is invalid: %s=%s', (paramKey: string, paramValue: string) => {
    const url = new URL(DEEP_URL_SCHEME_WITH_SEPARATOR)
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))

    // Replace valid param value with invalid one
    url.searchParams.set(paramKey, paramValue)

    expect(() => {
      parseInvitationLinkDeepUrl(url.href)
    }).toThrow()
  })
})
