import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import * as dagCbor from '@ipld/dag-cbor'
import { arrayBufferToString } from 'pvutils'
import { getCrypto, PublicKeyInfo } from 'pkijs'

import { NoCryptoEngineError, UserProfile } from '@quiet/types'
import { configCrypto, generateKeyPair, sign } from '@quiet/identity'

import { UserProfileStore } from './userProfile.store'

const getUserProfile = async ({
  pngByteArray,
  signature,
  photoUrl,
}: {
  pngByteArray?: Uint8Array
  signature?: string
  photoUrl?: string
}): Promise<UserProfile> => {
  const crypto = getCrypto()
  if (!crypto) throw new NoCryptoEngineError()

  const keyPair = await generateKeyPair({ signAlg: configCrypto.signAlg })

  // Bytes in decimal copied out of a PNG file
  // e.g. od -t u1 ~/Pictures/test.png | less
  const png = pngByteArray || new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
  const pngBase64 = 'data:image/png;base64,' + Buffer.from(png).toString('base64')
  const profile = { photo: photoUrl || pngBase64 }

  const codec = dagCbor
  const hasher = sha256
  const { bytes } = await Block.encode({ value: profile, codec: codec, hasher: hasher })
  const signatureArrayBuffer = await sign(bytes, keyPair.privateKey)
  signature = signature || arrayBufferToString(signatureArrayBuffer)

  const pubKeyInfo = new PublicKeyInfo()
  await pubKeyInfo.importKey(keyPair.publicKey)
  const pubKeyDer = Buffer.from(pubKeyInfo.subjectPublicKey.valueBlock.valueHex).toString('base64')

  return {
    profile: profile,
    profileSig: signature,
    pubKey: pubKeyDer,
  }
}

describe('UserProfileStore/validateUserProfile', () => {
  test('returns false if signature is invalid', async () => {
    // Valid PNG
    const pngByteArray = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
    const signature = '1234'
    const userProfile = await getUserProfile({ pngByteArray, signature })
    expect(await UserProfileStore.validateUserProfile(userProfile)).toBeFalsy()
  })

  test('returns false if photo is not PNG', async () => {
    // Changed the first byte from 137 to 136
    const pngByteArray = new Uint8Array([136, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
    const userProfile = await getUserProfile({ pngByteArray })
    expect(await UserProfileStore.validateUserProfile(userProfile)).toBeFalsy()
  })

  test('returns false if photo is larger than 200KB', async () => {
    // 204,800 extra decimal bytes (200KB) with values 1 - 254
    const extraData = Array.from({ length: 204_800 }, () => Math.floor(Math.random() * (255 - 1) + 1))
    // Valid PNG header
    const pngArray = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82].concat(extraData)
    const pngByteArray = new Uint8Array(pngArray)

    const userProfile = await getUserProfile({ pngByteArray })
    expect(await UserProfileStore.validateUserProfile(userProfile)).toBeFalsy()
  })

  test('returns true if photo is less than 200KB', async () => {
    // 200,000 extra decimal bytes with values 1 - 254
    const extraData = Array.from({ length: 200_000 }, () => Math.floor(Math.random() * (255 - 1) + 1))
    // Valid PNG header
    const pngArray = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82].concat(extraData)
    const pngByteArray = new Uint8Array(pngArray)

    const userProfile = await getUserProfile({ pngByteArray })
    expect(await UserProfileStore.validateUserProfile(userProfile)).toBeTruthy()
  })

  test('returns false if photo URL prefix is unexpected', async () => {
    const pngArray = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]
    // Capitalized I in image
    const pngBase64 = 'data:Image/png;base64,' + Buffer.from(pngArray).toString('base64')
    const userProfile = await getUserProfile({ photoUrl: pngBase64 })
    expect(await UserProfileStore.validateUserProfile(userProfile)).toBeFalsy()
  })

  test('returns false if photo URL prefix is unexpected (trailing comma)', async () => {
    const pngArray = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]
    // Missing trailing comma
    const pngBase64 = 'data:image/png;base64' + Buffer.from(pngArray).toString('base64')
    const userProfile = await getUserProfile({ photoUrl: pngBase64 })
    expect(await UserProfileStore.validateUserProfile(userProfile)).toBeFalsy()
  })

  test('returns false if photo URL prefix is unexpected (invalid content-type)', async () => {
    const pngArray = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]
    // Invalid content-type
    const pngBase64 = 'data:text/html,' + Buffer.from(pngArray).toString('base64')
    const userProfile = await getUserProfile({ photoUrl: pngBase64 })
    expect(await UserProfileStore.validateUserProfile(userProfile)).toBeFalsy()
  })

  test('returns true if photo URL prefix is expected', async () => {
    const pngArray = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]
    const pngBase64 = 'data:image/png;base64,' + Buffer.from(pngArray).toString('base64')
    const userProfile = await getUserProfile({ photoUrl: pngBase64 })
    expect(await UserProfileStore.validateUserProfile(userProfile)).toBeTruthy()
  })
})

describe('UserProfileStore/validateUserProfileEntry', () => {
  test("returns false entry key doesn't match profile pubKey", async () => {
    // Valid PNG
    const pngByteArray = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
    const userProfile = await getUserProfile({ pngByteArray })
    const userProfileEntry = {
      id: '',
      payload: { op: 'PUT', key: 'incorrect key', value: userProfile },
      next: [''],
      refs: [''],
      clock: {
        id: '',
        time: 1,
      },
      v: 1,
      key: '',
      identity: '',
      sig: '',
      hash: '',
    }
    expect(await UserProfileStore.validateUserProfileEntry(userProfileEntry)).toBeFalsy()
  })

  test('returns true if user profile entry is valid', async () => {
    // Valid PNG
    const pngByteArray = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
    const userProfile = await getUserProfile({ pngByteArray })
    const userProfileEntry = {
      id: '',
      payload: { op: 'PUT', key: userProfile.pubKey, value: userProfile },
      next: [''],
      refs: [''],
      clock: {
        id: '',
        time: 1,
      },
      v: 1,
      key: '',
      identity: '',
      sig: '',
      hash: '',
    }
    expect(await UserProfileStore.validateUserProfileEntry(userProfileEntry)).toBeTruthy()
  })
})
