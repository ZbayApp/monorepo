import { jest } from '@jest/globals'

import fs from 'fs'
import { TestConfig } from '../../const'
import { Test, TestingModule } from '@nestjs/testing'
import { TestModule } from '../../common/test.module'
import { StorageModule } from '../storage.module'
import { OrbitDbService } from '../orbitDb/orbitDb.service'
import { CertificatesStore } from './certificates.store'
import { CommunityMetadata } from '@quiet/types'
import { libp2pInstanceParams } from '../../common/utils'
import { Libp2pModule } from '../../libp2p/libp2p.module'
import { IpfsModule } from '../../ipfs/ipfs.module'
import { Libp2pService } from '../../libp2p/libp2p.service'
import { IpfsService } from '../../ipfs/ipfs.service'

const communityMetadata: CommunityMetadata = {
  id: '39F7485441861F4A2A1A512188F1E0AA',
  rootCa:
    'MIIBUDCB+KADAgECAgEBMAoGCCqGSM49BAMCMBIxEDAOBgNVBAMTB3JvY2tldHMwHhcNMTAxMjI4MTAxMDEwWhcNMzAxMjI4MTAxMDEwWjASMRAwDgYDVQQDEwdyb2NrZXRzMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE/ESHf6rXksyiuxSKpQgtiSAhVWNtx4vbFgW6knWfH7MR4dPyxiCNgSeCzRfreuhqVpVtv3U49tcwsqDGkoWHsKM/MD0wDwYDVR0TBAgwBgEB/wIBAzALBgNVHQ8EBAMCAIYwHQYDVR0lBBYwFAYIKwYBBQUHAwIGCCsGAQUFBwMBMAoGCCqGSM49BAMCA0cAMEQCIHrYMhgU/RluSsWoO205EjCQ8pE5MeBZ4Cp8PTgNkOW7AiA690+KIgobiObH6/1JDuS82R0NPO84Ttc8PY886AoKbA==',
  ownerCertificate:
    'MIIDeTCCAx6gAwIBAgIGAYwVp42mMAoGCCqGSM49BAMCMBIxEDAOBgNVBAMTB3JvY2tldHMwHhcNMjMxMTI4MTExOTExWhcNMzAwMTMxMjMwMDAwWjBJMUcwRQYDVQQDEz5jYXJhaTJ0d2phem50aW56bndtcnlqdzNlNzVmdXF0Z2xrd2hsemo2d3RlcWx4ano2NnRsZnhpZC5vbmlvbjBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABNMUauWsTJiuDGt4zoj4lKGgHMkTH96M11fCxMwIInhan0RUB5sv+PtGKbfEfawGjhSQiUaTLdwUGjyIdMs3OMWjggInMIICIzAJBgNVHRMEAjAAMAsGA1UdDwQEAwIAgDAdBgNVHSUEFjAUBggrBgEFBQcDAgYIKwYBBQUHAwEwggFHBgkqhkiG9w0BCQwEggE4BIIBNBETZ2k8vszIRvkuOUk/cNtOb8JcGmw5yVhs45/+e7To4t51nwcdAODj5juVi6+SpLCcHCHhE+g7KswEkC1ScFrW6CRinSgrNBOAUIjOtvWZ/GvK6lI4WTMf7xAaRaJSCF6H0m4cFoUY3JpklJleHhzj0re+NmFZEJ/hNRKochGFy4Xq9Z7StvPpGBlfxhmR7X2t/+HtZaAAbLRLLgbHtCQ7fecg0Qb9Ej58uc+T4Gd2+8ptWvebtOQVU70VAL7uT6aLkFXaDibgSt3kDNvGrwn3AxWlESgROTh5+OWWbfYIbFxjf0PkPDdUSAIOKS9qbYZ+bSYfVq+/0JFyZAa0zhPtgW8wjj0gDCLVm5joyW5Hz2eZ36W7u3cxFME2qmT9G2Dh6NGLn7G19ulVzoTkVmP5/tGPMBUGCisGAQQBg4wbAgEEBxMFZGF2aWQwPQYJKwYBAgEPAwEBBDATLlFtZE5GVjc3dXZOcTJBaWlqUEY0dzY2OU1ucWdiYVdMR1VhZlh0WTdlZjNRRFMwSQYDVR0RBEIwQII+Y2FyYWkydHdqYXpudGluem53bXJ5anczZTc1ZnVxdGdsa3dobHpqNnd0ZXFseGp6NjZ0bGZ4aWQub25pb24wCgYIKoZIzj0EAwIDSQAwRgIhAOafgBe5T0EFjyy0tCRrTHJ1+5ri0W6kAUfc6eRKHIZAAiEA7rFEfPDU+D8MiOF+w0QOdp46dqaWsHFjrDHYPSYGxQA=',
}

type CertificateData = {
  certificate: string
  pubkey: string
  username: string
}

const validCertificates: CertificateData[] = [
  {
    certificate:
      'MIIDeTCCAx6gAwIBAgIGAYwVp42mMAoGCCqGSM49BAMCMBIxEDAOBgNVBAMTB3JvY2tldHMwHhcNMjMxMTI4MTExOTExWhcNMzAwMTMxMjMwMDAwWjBJMUcwRQYDVQQDEz5jYXJhaTJ0d2phem50aW56bndtcnlqdzNlNzVmdXF0Z2xrd2hsemo2d3RlcWx4ano2NnRsZnhpZC5vbmlvbjBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABNMUauWsTJiuDGt4zoj4lKGgHMkTH96M11fCxMwIInhan0RUB5sv+PtGKbfEfawGjhSQiUaTLdwUGjyIdMs3OMWjggInMIICIzAJBgNVHRMEAjAAMAsGA1UdDwQEAwIAgDAdBgNVHSUEFjAUBggrBgEFBQcDAgYIKwYBBQUHAwEwggFHBgkqhkiG9w0BCQwEggE4BIIBNBETZ2k8vszIRvkuOUk/cNtOb8JcGmw5yVhs45/+e7To4t51nwcdAODj5juVi6+SpLCcHCHhE+g7KswEkC1ScFrW6CRinSgrNBOAUIjOtvWZ/GvK6lI4WTMf7xAaRaJSCF6H0m4cFoUY3JpklJleHhzj0re+NmFZEJ/hNRKochGFy4Xq9Z7StvPpGBlfxhmR7X2t/+HtZaAAbLRLLgbHtCQ7fecg0Qb9Ej58uc+T4Gd2+8ptWvebtOQVU70VAL7uT6aLkFXaDibgSt3kDNvGrwn3AxWlESgROTh5+OWWbfYIbFxjf0PkPDdUSAIOKS9qbYZ+bSYfVq+/0JFyZAa0zhPtgW8wjj0gDCLVm5joyW5Hz2eZ36W7u3cxFME2qmT9G2Dh6NGLn7G19ulVzoTkVmP5/tGPMBUGCisGAQQBg4wbAgEEBxMFZGF2aWQwPQYJKwYBAgEPAwEBBDATLlFtZE5GVjc3dXZOcTJBaWlqUEY0dzY2OU1ucWdiYVdMR1VhZlh0WTdlZjNRRFMwSQYDVR0RBEIwQII+Y2FyYWkydHdqYXpudGluem53bXJ5anczZTc1ZnVxdGdsa3dobHpqNnd0ZXFseGp6NjZ0bGZ4aWQub25pb24wCgYIKoZIzj0EAwIDSQAwRgIhAOafgBe5T0EFjyy0tCRrTHJ1+5ri0W6kAUfc6eRKHIZAAiEA7rFEfPDU+D8MiOF+w0QOdp46dqaWsHFjrDHYPSYGxQA=',
    pubkey: 'BNMUauWsTJiuDGt4zoj4lKGgHMkTH96M11fCxMwIInhan0RUB5sv+PtGKbfEfawGjhSQiUaTLdwUGjyIdMs3OMU=',
    username: 'david',
  },
  {
    certificate:
      'MIIDdjCCAx2gAwIBAgIGAYwVqZ/fMAoGCCqGSM49BAMCMBIxEDAOBgNVBAMTB3JvY2tldHMwHhcNMjMxMTI4MTEyMTI3WhcNMzAwMTMxMjMwMDAwWjBJMUcwRQYDVQQDEz52cnB1ZGdnNGF4cmxobG1jN3c0dmdheTJta292ZGN6dnRtbTVoMjJ0ajZobWR3eXV1NDdhc3l5ZC5vbmlvbjBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABE2KvinBVv6mALtFfw2xIVJXu48q6Vaxsz1GJNUe1K6ysJT0hjyed3l0OOP8KGzUAc0OacEZuzSbDnkdP/gbmMOjggImMIICIjAJBgNVHRMEAjAAMAsGA1UdDwQEAwIAgDAdBgNVHSUEFjAUBggrBgEFBQcDAgYIKwYBBQUHAwEwggFHBgkqhkiG9w0BCQwEggE4BIIBNBHLSx5u5At8mlxe6cM+tnpx1rhcVQC8dA3M5OXIB1BO4NzM0o71IqL1mwlviMd9EeSTiqM3mOBJzGS/sG3m62ppdfSuxV2OfjILYF17NpHBY45y0nmQUer4geLlBxtvEZ6e0CiK/uD2oGks7BG78AsclP/97lXNf8ElH8DT+AskO91Zd1zS+8IQxmOr8/EpCnjR+7VMzpgIG57C6pdmZdmLLCJlKcr26XL91hH5cY/i1s2Yf36ScOJKSgz0GEzul0uoW2f+Oags6WYzcY527pGwFJTItmWZQHlC5weaX8mtqgl1/4Wb4lXB4ToMe0Kwj5z55fggG+OLbMkzMUimWJKmb7IcXfYZaZqKWL4jPeMahywxS88vuOYRjIbv5h3/7sdbClGWs7sFbBXaG++rRMINIFp0MBQGCisGAQQBg4wbAgEEBhMEam9objA9BgkrBgECAQ8DAQEEMBMuUW1aZnBpVnU2cnFEaTQ5QTR5Sk15elE3a25HdERGTllneWc4R1BKbjlnODRtZzBJBgNVHREEQjBAgj52cnB1ZGdnNGF4cmxobG1jN3c0dmdheTJta292ZGN6dnRtbTVoMjJ0ajZobWR3eXV1NDdhc3l5ZC5vbmlvbjAKBggqhkjOPQQDAgNHADBEAiBnUY9HiL5w3OM6Y5vVmOQD/GEYKgHZIYpTD9g3DDj+cgIgTULiWXUb6GSRZIQx1Lm0eqiwKZvp0MmwmhR+MyzXEW4=',
    pubkey: 'BE2KvinBVv6mALtFfw2xIVJXu48q6Vaxsz1GJNUe1K6ysJT0hjyed3l0OOP8KGzUAc0OacEZuzSbDnkdP/gbmMM=',
    username: 'john',
  },
]

const foreignCertificate =
  'MIIDezCCAyCgAwIBAgIGAYwV+8kZMAoGCCqGSM49BAMCMBQxEjAQBgNVBAMTCWV4cGxvcmVyczAeFw0yMzExMjgxMjUxMTFaFw0zMDAxMzEyMzAwMDBaMEkxRzBFBgNVBAMTPnJ2azZkbmJ0Y2hucmpyczN4aml6ZnR3ZTJ3M3ZhMmttZTRsNjdkcmhvcG9pdnZxcjc3NWlwYnlkLm9uaW9uMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEx+78UmEHMbmBGP/9qnG2traRP3+38Aa5DpDQ/wQmEL0rkv/w3yZuCQRuUlna+NxeQq7zPO+lU5bx1/0jHY2fD6OCAicwggIjMAkGA1UdEwQCMAAwCwYDVR0PBAQDAgCAMB0GA1UdJQQWMBQGCCsGAQUFBwMCBggrBgEFBQcDATCCAUcGCSqGSIb3DQEJDASCATgEggE0JYcYxDr6VMiwA7g5BECx3lw2hQxFy0v2eB5SKSpadSGvI3en3sE/RQYq8jPn9az/zKDu4IzPZ9/wd+/OwvVPx8ZpfWy7JhOZXX6a3DSvtQo0VvWhDdMG4ruHp8W7+FOtvVRzp7kOz+JDIqL90s7GxC+IcN4lMgZVpnLmfHruuAd/Q88C6RGoS9NwGs+gSeWhcQfxQrUxY+e5TaJoaZAidNjZJdPt+pLxXi8lBr6ASc7UoHK5ZUf9UdzeoWLmIx+P2ihC/KtT+oHPZ1ovzFVRpXWK15/OX37uLCZzUBw3+VB0yH/KZ1ahieysksEZiQ+i3BYLzu5p1ofvZrLw62Py6S8Cwk7+Bn+Nh5Vq8zwvxx/xoM10fxTL6zzACMSvANOXEBvY2V7/yB9P7z6ngruGVHBPUPwwFQYKKwYBBAGDjBsCAQQHEwVkb3VnaDA9BgkrBgECAQ8DAQEEMBMuUW1jaW1iZHhjQTdSTWtVYXY5cXg1Nm9Ma1NGZUZTWlJ4SGNwYkF5ZEhCUm5paDBJBgNVHREEQjBAgj5ydms2ZG5idGNobnJqcnMzeGppemZ0d2UydzN2YTJrbWU0bDY3ZHJob3BvaXZ2cXI3NzVpcGJ5ZC5vbmlvbjAKBggqhkjOPQQDAgNJADBGAiEAwHKTNCKgVpOpCrTQXvIl9kfQ95VCnwW/pLMSgKPEQq0CIQD1w45OPg+nWHC+oKhe0pRb4GGH9oV0ZwonC8oFPa4Pjw=='

describe('CertificatesStore', () => {
  let module: TestingModule
  let certificatesStore: CertificatesStore
  let orbitDb: OrbitDbService
  let libp2pService: Libp2pService
  let ipfsService: IpfsService

  beforeEach(async () => {
    jest.clearAllMocks()

    module = await Test.createTestingModule({
      imports: [TestModule, StorageModule, Libp2pModule, IpfsModule],
    }).compile()

    libp2pService = await module.resolve(Libp2pService)
    const libp2pParams = await libp2pInstanceParams()
    await libp2pService.createInstance(libp2pParams)

    ipfsService = await module.resolve(IpfsService)
    await ipfsService.createInstance()

    orbitDb = await module.resolve(OrbitDbService)
    await orbitDb.create(libp2pParams.peerId, ipfsService.ipfsInstance!)

    certificatesStore = await module.resolve(CertificatesStore)
    await certificatesStore.init()
  })

  afterEach(async () => {
    await orbitDb.stop()
    await ipfsService.stop()
    await certificatesStore.close()
    await libp2pService.close()
    if (fs.existsSync(TestConfig.ORBIT_DB_DIR)) {
      fs.rmSync(TestConfig.ORBIT_DB_DIR, { recursive: true })
    }
  })

  test('update metadata property', async () => {
    certificatesStore.updateMetadata(communityMetadata)
    // @ts-expect-error - metadata property is private
    expect(certificatesStore.metadata).toEqual(communityMetadata)
  })

  test('do not update metadata property with invalid value', async () => {
    // @ts-expect-error - null is not a proper value
    certificatesStore.updateMetadata(null)
    // @ts-expect-error - metadata property is private
    const metadata = certificatesStore.metadata
    expect(metadata).not.toEqual(null)
  })

  test('validate certificate against root certificate (positive case)', async () => {
    const { certificate } = validCertificates[1]

    certificatesStore.updateMetadata(communityMetadata)

    // @ts-expect-error - validateCertificate is private
    const res = await certificatesStore.validateCertificateAuthority(certificate)

    expect(res).toBeTruthy()
  })

  test('validate certificate against root certificate (negative case)', async () => {
    const certificate = foreignCertificate

    certificatesStore.updateMetadata(communityMetadata)

    // @ts-expect-error - validateCertificate is private
    const res = await certificatesStore.validateCertificateAuthority(certificate)

    expect(res).toBeFalsy()
  })

  test('validates certificate format properly (positive case)', async () => {
    const { certificate } = validCertificates[1]

    // @ts-expect-error - validateCertificate is private
    const res = await certificatesStore.validateCertificateFormat(certificate)

    expect(res).toEqual([])
  })

  test('validates certificate format properly (negative case)', async () => {
    const certificate = 'certificate'

    // @ts-expect-error - validateCertificate is private
    const res = await certificatesStore.validateCertificateFormat(certificate)

    expect(res).not.toEqual([])
  })

  test('should add and get a valid certificate from the store', async () => {
    const { certificate } = validCertificates[1]

    certificatesStore.updateMetadata(communityMetadata)

    await certificatesStore.addEntry(certificate)

    const certificates = await certificatesStore.getEntries()

    expect(certificates).toContain(certificate)
  })

  // Let's wait for actual validation
  test('should not get invalid certificate form the store', async () => {
    const certificate = 'certificate'

    certificatesStore.updateMetadata(communityMetadata)

    await certificatesStore.addEntry(certificate)

    const certificates = await certificatesStore.getEntries()

    expect(certificates).not.toContain(certificate)
  })

  test('should load all certificates from the store', async () => {
    const { certificate: certificate1 } = validCertificates[0]
    const { certificate: certificate2 } = validCertificates[1]

    certificatesStore.updateMetadata(communityMetadata)

    jest.spyOn(certificatesStore, 'getEntries').mockResolvedValue([certificate1, certificate2])

    const certificates = await certificatesStore.getEntries()

    expect(certificates).toContain(certificate1)
    expect(certificates).toContain(certificate2)
  })

  test('should get the username for a given public key', async () => {
    const { certificate, pubkey, username } = validCertificates[1]

    certificatesStore.updateMetadata(communityMetadata)

    await certificatesStore.addEntry(certificate)

    const result = await certificatesStore.getCertificateUsername(pubkey)
    expect(result).toBe(username)
  })
})
