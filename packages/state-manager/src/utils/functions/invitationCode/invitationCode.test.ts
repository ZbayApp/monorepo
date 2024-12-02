import { InvitationDataV1, InvitationDataVersion } from '@quiet/types'
import { getInvitationLinks } from './invitationCode'
import { OWNER_ORBIT_DB_IDENTITY_PARAM_KEY, PSK_PARAM_KEY, QUIET_JOIN_PAGE, validInvitationDatav1 } from '@quiet/common'

const getUrlParamsPart = (url: string) => url.split(QUIET_JOIN_PAGE + '?')[1]

describe('Invitation link helper', () => {
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

  // TODO: https://github.com/TryQuiet/quiet/issues/2628
  // const datav2 = validInvitationDatav2[0]
  // const urlParamsv2 = [
  //   [CID_PARAM_KEY, datav2.cid],
  //   [TOKEN_PARAM_KEY, datav2.token],
  //   [SERVER_ADDRESS_PARAM_KEY, datav2.serverAddress],
  //   [INVITER_ADDRESS_PARAM_KEY, datav2.inviterAddress],
  // ]

  it('retrieves invitation data if url is a proper share url', () => {
    const url = new URL(QUIET_JOIN_PAGE)
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))
    const result = getInvitationLinks(url.href.replace('?', '#'))
    expect(result).toEqual({
      version: InvitationDataVersion.v1,
      ...data,
    })
  })

  it('throws error if link is not a proper share url nor a code', () => {
    expect(() => getInvitationLinks('invalidCode')).toThrow()
  })

  it('throws error if link does not contain psk', () => {
    const url = new URL(QUIET_JOIN_PAGE)
    url.searchParams.append(urlParams[0][0], urlParams[0][1])
    url.searchParams.append(urlParams[1][0], urlParams[1][1])
    expect(() => getInvitationLinks(getUrlParamsPart(url.href))).toThrow()
  })

  it('throws error if psk has invalid format', () => {
    const url = new URL(QUIET_JOIN_PAGE)
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))
    url.searchParams.set(PSK_PARAM_KEY, '12345')
    expect(() => getInvitationLinks(getUrlParamsPart(url.href))).toThrow()
  })

  it('retrieves invitation data if url is a proper link', () => {
    const url = new URL(QUIET_JOIN_PAGE)
    urlParams.forEach(([key, value]) => url.searchParams.append(key, value))
    const result = getInvitationLinks(getUrlParamsPart(url.href))
    expect(result).toEqual({
      version: InvitationDataVersion.v1,
      ...data,
    })
  })

  // TODO: https://github.com/TryQuiet/quiet/issues/2628
  // it('retrieves invitation code if url is a proper v2 code', () => {
  //   const url = new URL(QUIET_JOIN_PAGE)
  //   urlParamsv2.forEach(([key, value]) => url.searchParams.append(key, value))
  //   const result = getInvitationCodes(getUrlParamsPart(url.href))
  //   expect(result).toEqual(datav2)
  // })
})
