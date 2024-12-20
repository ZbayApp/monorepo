import { Time, setEngine, CryptoEngine } from 'pkijs'
import { Crypto } from '@peculiar/webcrypto'
import { createRootCA, type RootCA } from '../createRootCA'
import { createUserCert, type UserCert } from '../createUserCert'
import { createUserCsr, type UserCsr } from '../createUserCsr'
import config from '../config'

export const userData = {
  nickname: 'userName',
  commonName: 'nqnw4kc4c77fb47lk52m5l57h4tcxceo7ymxekfn7yh5m66t4jv2olad.onion',
  peerId: '12D3KooWKCWstmqi5gaQvipT7xVneVGfWV7HYpCbmUu626R92hXx',
  signAlg: config.signAlg,
  hashAlg: config.hashAlg,
}

const notBeforeDate = new Date()
const notAfterDate = new Date(2030, 1, 1)

export async function createTestRootCA(commonName?: string): Promise<RootCA> {
  return await createRootCA(
    new Time({ type: 1, value: notBeforeDate }),
    new Time({ type: 1, value: notAfterDate }),
    commonName
  )
}

export async function createTestUserCsr(): Promise<UserCsr> {
  return await createUserCsr(userData)
}

export async function createTestUserCert(rootCert?: RootCA, userCsr?: UserCsr): Promise<UserCert> {
  const rootC = rootCert || (await createTestRootCA())
  const user = userCsr || (await createTestUserCsr())
  return await createUserCert(rootC.rootCertString, rootC.rootKeyString, user.userCsr, notBeforeDate, notAfterDate)
}

export function setupCrypto() {
  const webcrypto = new Crypto()
  setEngine(
    'newEngine',
    webcrypto,
    new CryptoEngine({
      name: '',
      crypto: webcrypto,
      subtle: webcrypto.subtle,
    })
  )
  global.crypto = webcrypto
}

export const createRootCertificateTestHelper = async (commonName: string): Promise<RootCA> => {
  return await createRootCA(
    new Time({ type: 0, value: notBeforeDate }),
    new Time({ type: 0, value: notAfterDate }),
    commonName
  )
}

export const createUserCertificateTestHelper = async (
  user: {
    nickname: string
    commonName: string
    peerId: string
  },
  rootCA?: Pick<RootCA, 'rootCertString' | 'rootKeyString'> | null
): Promise<{
  userCsr: UserCsr
  userCert?: UserCert
}> => {
  const userCsr = await createUserCsr({
    nickname: user.nickname,
    commonName: user.commonName,
    peerId: user.peerId,
    signAlg: config.signAlg,
    hashAlg: config.hashAlg,
  })

  let userCert

  if (rootCA) {
    userCert = await createUserCert(
      rootCA.rootCertString,
      rootCA.rootKeyString,
      userCsr.userCsr,
      notBeforeDate,
      notAfterDate
    )
  }

  return {
    userCsr,
    userCert,
  }
}
