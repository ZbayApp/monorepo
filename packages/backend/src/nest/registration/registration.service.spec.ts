import { jest } from '@jest/globals'

import { Test, TestingModule } from '@nestjs/testing'
import { TestModule } from '../common/test.module'
import { RegistrationModule } from './registration.module'
import { RegistrationService } from './registration.service'
import { configCrypto, createRootCA, createUserCsr, type RootCA, verifyUserCert, type UserCsr } from '@quiet/identity'
import { type DirResult } from 'tmp'
import { type PermsData, type SaveCertificatePayload } from '@quiet/types'
import { Time } from 'pkijs'
import { issueCertificate, extractPendingCsrs } from './registration.functions'
import { createPeerId, createTmpDir, libp2pInstanceParams } from '../common/utils'
import { RegistrationEvents } from './registration.types'
import { CertificatesStore } from '../storage/certificates/certificates.store'
import { StorageService } from '../storage/storage.service'
import { StorageModule } from '../storage/storage.module'
import { OrbitDbService } from '../storage/orbitDb/orbitDb.service'
import { createHelia } from 'helia'
import { Libp2pService } from '../libp2p/libp2p.service'
import { Libp2pModule } from '../libp2p/libp2p.module'
import { IpfsModule } from '../ipfs/ipfs.module'
import { IpfsService } from '../ipfs/ipfs.service'
import { sleep } from '../common/sleep'

describe('RegistrationService', () => {
  let module: TestingModule
  let registrationService: RegistrationService

  let tmpDir: DirResult
  let certRoot: RootCA
  let permsData: PermsData
  let userCsr: UserCsr
  let invalidUserCsr: any

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [TestModule, RegistrationModule],
    }).compile()

    registrationService = await module.resolve(RegistrationService)

    jest.clearAllMocks()
    tmpDir = createTmpDir()
    certRoot = await createRootCA(
      new Time({ type: 1, value: new Date() }),
      new Time({ type: 1, value: new Date(2030, 1, 1) }),
      'testRootCA'
    )
    permsData = { certificate: certRoot.rootCertString, privKey: certRoot.rootKeyString }
    userCsr = await createUserCsr({
      nickname: 'userName',
      commonName: 'nqnw4kc4c77fb47lk52m5l57h4tcxceo7ymxekfn7yh5m66t4jv2olad.onion',
      peerId: '12D3KooWCXzUw71ovvkDky6XkV57aCWUV9JhJoKhoqXa1gdhFNoL',
      signAlg: configCrypto.signAlg,
      hashAlg: configCrypto.hashAlg,
    })
    invalidUserCsr = 'invalidUserCsr'
  })

  afterEach(async () => {
    tmpDir.removeCallback()
    await module.close()
  })

  afterAll(async () => {
    await sleep(10_000)
  })

  it('registerUser should return cert if csr is valid and cert should pass the verification', async () => {
    const responseData = await issueCertificate(userCsr.userCsr, permsData)
    expect(responseData.cert).toBeTruthy()
    if (!responseData.cert) return null
    const isProperUserCert = await verifyUserCert(certRoot.rootCertString, responseData.cert)
    expect(isProperUserCert.result).toBe(true)
  })

  it('registrar should return errors array if csr is not valid and should not return any cert', async () => {
    const responseData = await issueCertificate(invalidUserCsr, permsData)
    expect(responseData.cert).toBeFalsy()
    expect(responseData.error.length).toBeTruthy()
  })

  it('extractPendingCsrs should return all csrs if there are no certificates and csrs do not contain duplicate usernames', async () => {
    const certificates: string[] = []
    const csrs: string[] = [userCsr.userCsr]
    const payload: { certificates: string[]; csrs: string[] } = {
      certificates: certificates,
      csrs: csrs,
    }
    const pendingCsrs = await extractPendingCsrs(payload)
    expect(pendingCsrs).toEqual(csrs)
  })

  it('extractPendingCsrs should return all csrs if there are certificates, and csrs do not contain any name that is in certificates already', async () => {
    const aliceCsr = await createUserCsr({
      nickname: 'alice',
      commonName: 'nqnw4kc4c77fb47lk52m5l57h4tcxceo7ymxekfn7yh5m66t4jv2olad.onion',
      peerId: '12D3KooWCXzUw71ovvkDky6XkV57aCWUV9JhJoKhoqXa1gdhFNoL',
      signAlg: configCrypto.signAlg,
      hashAlg: configCrypto.hashAlg,
    })
    const aliceCert = await issueCertificate(aliceCsr.userCsr, permsData)
    if (!aliceCert.cert) return
    const certificates: string[] = [aliceCert.cert]
    const csrs: string[] = [userCsr.userCsr]
    const payload: { certificates: string[]; csrs: string[] } = {
      certificates: certificates,
      csrs: csrs,
    }
    const pendingCsrs = await extractPendingCsrs(payload)
    expect(pendingCsrs).toEqual(csrs)
  })

  it('extractPendingCsrs should return filtered csrs, excluding those that tries to claim username already present in certificate', async () => {
    const userCert = await issueCertificate(userCsr.userCsr, permsData)
    if (!userCert.cert) return
    const certificates: string[] = [userCert.cert]
    const csrs: string[] = [userCsr.userCsr]
    const payload: { certificates: string[]; csrs: string[] } = {
      certificates: certificates,
      csrs: csrs,
    }
    const pendingCsrs = await extractPendingCsrs(payload)
    expect(pendingCsrs.length).toEqual(0)
  })

  it('extractPendingCsrs should return all csrs if there are no duplicates in requested usernames', async () => {
    const userCsr2 = await createUserCsr({
      nickname: 'userName2',
      commonName: 'nqnw4kc4c77fb47lk52m5l57h4tcxceo7ymxekfn7yh5m66t4jv2olad.onion',
      peerId: '12D3KooWCXzUw71ovvkDky6XkV57aCWUV9JhJoKhoqXa1gdhFNoL',
      signAlg: configCrypto.signAlg,
      hashAlg: configCrypto.hashAlg,
    })
    const csrs: string[] = [userCsr.userCsr, userCsr2.userCsr]
    const pendingCsrs = await extractPendingCsrs({ certificates: [], csrs: csrs })
    expect(pendingCsrs.length).toEqual(csrs.length)
  })

  it('Extract pending csrs should return only csrs that have unique usernames', async () => {
    const userCsr = await createUserCsr({
      nickname: 'karol',
      commonName: 'nqnw4kc4c77fb47lk52m5l57h4tcxceo7ymxekfn7yh5m66t4jv2olad.onion',
      peerId: '12D3KooWCXzUw71ovvkDky6XkV57aCWUV9JhJoKhoqXa1gdhFNoL',
      signAlg: configCrypto.signAlg,
      hashAlg: configCrypto.hashAlg,
    })
    const userCsr2 = await createUserCsr({
      nickname: 'karol',
      commonName: 'nnnnnnc4c77fb47lk52m5l57h4tcxceo7ymxekfn7yh5m66t4jv2olad.onion',
      peerId: '12D3KooWKCWstmqi5gaQvipT7xVneVGfWV7HYpCbmUu626R92hXx',
      signAlg: configCrypto.signAlg,
      hashAlg: configCrypto.hashAlg,
    })
    const csrs: string[] = [userCsr.userCsr, userCsr2.userCsr]
    const pendingCsrs = await extractPendingCsrs({ certificates: [], csrs: csrs })
    expect(pendingCsrs.length).toEqual(1)
    expect(pendingCsrs[0]).toBe(userCsr.userCsr)
  })

  it('only issues one group of certs at a time', async () => {
    const module = await Test.createTestingModule({
      imports: [TestModule, StorageModule, Libp2pModule, IpfsModule],
    }).compile()
    const libp2pService = await module.resolve(Libp2pService)
    const libp2pParams = await libp2pInstanceParams()
    await libp2pService.createInstance(libp2pParams)

    const ipfsService = await module.resolve(IpfsService)
    await ipfsService.createInstance()

    const orbitDbService = await module.resolve(OrbitDbService)
    await orbitDbService.create(libp2pParams.peerId, ipfsService.ipfsInstance!)

    const certificatesStore = await module.resolve(CertificatesStore)
    await certificatesStore.init()

    const loadAllCertificates = async () => {
      return await certificatesStore.getEntries()
    }
    const saveCertificate = async (payload: SaveCertificatePayload) => {
      await certificatesStore.addEntry(payload.certificate)
    }

    certificatesStore.updateMetadata({
      id: '39F7485441861F4A2A1A512188F1E0AA',
      rootCa:
        'MIIBUDCB+KADAgECAgEBMAoGCCqGSM49BAMCMBIxEDAOBgNVBAMTB3JvY2tldHMwHhcNMTAxMjI4MTAxMDEwWhcNMzAxMjI4MTAxMDEwWjASMRAwDgYDVQQDEwdyb2NrZXRzMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE/ESHf6rXksyiuxSKpQgtiSAhVWNtx4vbFgW6knWfH7MR4dPyxiCNgSeCzRfreuhqVpVtv3U49tcwsqDGkoWHsKM/MD0wDwYDVR0TBAgwBgEB/wIBAzALBgNVHQ8EBAMCAIYwHQYDVR0lBBYwFAYIKwYBBQUHAwIGCCsGAQUFBwMBMAoGCCqGSM49BAMCA0cAMEQCIHrYMhgU/RluSsWoO205EjCQ8pE5MeBZ4Cp8PTgNkOW7AiA690+KIgobiObH6/1JDuS82R0NPO84Ttc8PY886AoKbA==',
      ownerCertificate:
        'MIIDeTCCAx6gAwIBAgIGAYwVp42mMAoGCCqGSM49BAMCMBIxEDAOBgNVBAMTB3JvY2tldHMwHhcNMjMxMTI4MTExOTExWhcNMzAwMTMxMjMwMDAwWjBJMUcwRQYDVQQDEz5jYXJhaTJ0d2phem50aW56bndtcnlqdzNlNzVmdXF0Z2xrd2hsemo2d3RlcWx4ano2NnRsZnhpZC5vbmlvbjBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABNMUauWsTJiuDGt4zoj4lKGgHMkTH96M11fCxMwIInhan0RUB5sv+PtGKbfEfawGjhSQiUaTLdwUGjyIdMs3OMWjggInMIICIzAJBgNVHRMEAjAAMAsGA1UdDwQEAwIAgDAdBgNVHSUEFjAUBggrBgEFBQcDAgYIKwYBBQUHAwEwggFHBgkqhkiG9w0BCQwEggE4BIIBNBETZ2k8vszIRvkuOUk/cNtOb8JcGmw5yVhs45/+e7To4t51nwcdAODj5juVi6+SpLCcHCHhE+g7KswEkC1ScFrW6CRinSgrNBOAUIjOtvWZ/GvK6lI4WTMf7xAaRaJSCF6H0m4cFoUY3JpklJleHhzj0re+NmFZEJ/hNRKochGFy4Xq9Z7StvPpGBlfxhmR7X2t/+HtZaAAbLRLLgbHtCQ7fecg0Qb9Ej58uc+T4Gd2+8ptWvebtOQVU70VAL7uT6aLkFXaDibgSt3kDNvGrwn3AxWlESgROTh5+OWWbfYIbFxjf0PkPDdUSAIOKS9qbYZ+bSYfVq+/0JFyZAa0zhPtgW8wjj0gDCLVm5joyW5Hz2eZ36W7u3cxFME2qmT9G2Dh6NGLn7G19ulVzoTkVmP5/tGPMBUGCisGAQQBg4wbAgEEBxMFZGF2aWQwPQYJKwYBAgEPAwEBBDATLlFtZE5GVjc3dXZOcTJBaWlqUEY0dzY2OU1ucWdiYVdMR1VhZlh0WTdlZjNRRFMwSQYDVR0RBEIwQII+Y2FyYWkydHdqYXpudGluem53bXJ5anczZTc1ZnVxdGdsa3dobHpqNnd0ZXFseGp6NjZ0bGZ4aWQub25pb24wCgYIKoZIzj0EAwIDSQAwRgIhAOafgBe5T0EFjyy0tCRrTHJ1+5ri0W6kAUfc6eRKHIZAAiEA7rFEfPDU+D8MiOF+w0QOdp46dqaWsHFjrDHYPSYGxQA=',
    })

    registrationService.setPermsData(permsData)
    registrationService.onModuleInit()
    registrationService.init({ certificatesStore, saveCertificate, loadAllCertificates } as unknown as StorageService)

    const userCsr = await createUserCsr({
      nickname: 'alice',
      commonName: 'nqnw4kc4c77fb47lk52m5l57h4tcxceo7ymxekfn7yh5m66t4jv2olad.onion',
      peerId: '12D3KooWCXzUw71ovvkDky6XkV57aCWUV9JhJoKhoqXa1gdhFNoL',
      signAlg: configCrypto.signAlg,
      hashAlg: configCrypto.hashAlg,
    })

    const userCsr2 = await createUserCsr({
      nickname: 'alice',
      commonName: 'nnnnnnc4c77fb47lk52m5l57h4tcxceo7ymxekfn7yh5m66t4jv2olad.onion',
      peerId: '12D3KooWKCWstmqi5gaQvipT7xVneVGfWV7HYpCbmUu626R92hXx',
      signAlg: configCrypto.signAlg,
      hashAlg: configCrypto.hashAlg,
    })

    registrationService.emit(RegistrationEvents.REGISTER_USER_CERTIFICATE, { csrs: [userCsr.userCsr] })

    registrationService.emit(RegistrationEvents.REGISTER_USER_CERTIFICATE, { csrs: [userCsr2.userCsr] })

    await new Promise(r => setTimeout(r, 2000))

    expect((await certificatesStore.getEntries()).length).toEqual(1)

    await orbitDbService.stop()
    await ipfsService.stop()
    await certificatesStore.close()
    await libp2pService.close()
  })
})
