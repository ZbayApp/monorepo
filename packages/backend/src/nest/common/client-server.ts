import { configCrypto, createRootCA, type RootCA, createUserCert, createUserCsr } from '@quiet/identity'
import { Time } from 'pkijs'

export const createUsersCerts = async (
  onion: string,
  rootCert: RootCA
): Promise<{ userCert: string; userKey: string }> => {
  const userData = {
    nickname: 'dev99damian1',
    commonName: onion,
    peerId: '12D3KooWKCWstmqi5gaQvipT7xVneVGfWV7HYpCbmUu626R92hXx',
    signAlg: configCrypto.signAlg,
    hashAlg: configCrypto.hashAlg,
  }

  const notBeforeDate = new Date(Date.UTC(2010, 11, 28, 10, 10, 10))
  const notAfterDate = new Date(Date.UTC(2030, 11, 28, 10, 10, 10))

  const user = await createUserCsr(userData)
  const userCert = await createUserCert(
    rootCert.rootCertString,
    rootCert.rootKeyString,
    user.userCsr,
    notBeforeDate,
    notAfterDate
  )

  return {
    userCert: userCert.userCertString,
    userKey: user.userKey,
  }
}

export const createCertificatesTestHelper = async (onion1: string, onion2: string) => {
  const notBeforeDate = new Date(Date.UTC(2010, 11, 28, 10, 10, 10))
  const notAfterDate = new Date(Date.UTC(2030, 11, 28, 10, 10, 10))
  const rootCert = await createRootCA(
    new Time({ type: 0, value: notBeforeDate }),
    new Time({ type: 0, value: notAfterDate })
  )

  const userData1 = await createUsersCerts(onion1, rootCert)
  const userData2 = await createUsersCerts(onion2, rootCert)

  const pems = {
    ca: rootCert.rootCertString,
    ca_key: rootCert.rootKeyString,

    servCert: userData1.userCert,
    servKey: userData1.userKey,

    userCert: userData2.userCert,
    userKey: userData2.userKey,
  }
  return pems
}
