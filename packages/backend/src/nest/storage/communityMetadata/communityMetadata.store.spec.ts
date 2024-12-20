import { jest } from '@jest/globals'

import fs from 'fs'
import { TestConfig } from '../../const'
import { Test, TestingModule } from '@nestjs/testing'
import { TestModule } from '../../common/test.module'
import { StorageModule } from '../storage.module'
import { OrbitDbService } from '../orbitDb/orbitDb.service'
import { CommunityMetadataStore } from './communityMetadata.store'
import { Community, CommunityMetadata } from '@quiet/types'
import { LocalDbService } from '../../local-db/local-db.service'
import { Store, getFactory, prepareStore } from '@quiet/state-manager'
import { FactoryGirl } from 'factory-girl'
import { type IdentitiesType, type LogEntry, Entry } from '@orbitdb/core'
import { libp2pInstanceParams } from '../../common/utils'
import { Libp2pModule } from '../../libp2p/libp2p.module'
import { Libp2pService } from '../../libp2p/libp2p.service'
import { IpfsService } from '../../ipfs/ipfs.service'
import { IpfsModule } from '../../ipfs/ipfs.module'
import { createTestRootCA, createTestUserCert, createTestUserCsr } from '@quiet/identity'
import { createLogger } from '../../common/logger'

const metaValid = {
  id: 'anId',
  // These are valid certs and form a chain of trust
  rootCa:
    'MIIBaDCCAQ6gAwIBAgIBATAKBggqhkjOPQQDAjAZMRcwFQYDVQQDEw5xdWlldGNvbW11bml0eTAmGBMyMDI0MTAwNDE1NDY1My40ODNaGA8yMDMwMDIwMTA1MDAwMFowGTEXMBUGA1UEAxMOcXVpZXRjb21tdW5pdHkwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAR6hYpugDRODiuS3X83876ygKhivtCqZO/OnjTyGgNIfzhsG0TQjV/uVpM8okPMJxRXmANJIgjj0d2kifiICCntoz8wPTAPBgNVHRMECDAGAQH/AgEDMAsGA1UdDwQEAwIAhjAdBgNVHSUEFjAUBggrBgEFBQcDAgYIKwYBBQUHAwEwCgYIKoZIzj0EAwIDSAAwRQIgPjAmthGNzefL5oVPS0735LgCt/3ECJxaCb+STDkV7MACIQCC/BSxvR/heL2eFlFjd7o8+CrKuX9g4Ez9E+WtYRYwvA==',
  ownerCertificate:
    'MIICOjCCAeGgAwIBAgIGAZJYNmuzMAoGCCqGSM49BAMCMBkxFzAVBgNVBAMTDnF1aWV0Y29tbXVuaXR5MB4XDTI0MTAwNDE1NDY1M1oXDTMwMDIwMTA1MDAwMFowSTFHMEUGA1UEAxM+bnFudzRrYzRjNzdmYjQ3bGs1Mm01bDU3aDR0Y3hjZW83eW14ZWtmbjd5aDVtNjZ0NGp2Mm9sYWQub25pb24wWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAQL8e+VoMUh0oiSewbKQ0dNwEVObX5BWPQ2L04NZX5HPZRj9rL/CBa2FTogNeyTbtG7VqTfEWWOWjnj/xVaYOF6o4HkMIHhMAkGA1UdEwQCMAAwCwYDVR0PBAQDAgCAMB0GA1UdJQQWMBQGCCsGAQUFBwMCBggrBgEFBQcDATAYBgorBgEEAYOMGwIBBAoTCHVzZXJOYW1lMEMGCSsGAQIBDwMBAQQ2EzQxMkQzS29vV0tDV3N0bXFpNWdhUXZpcFQ3eFZuZVZHZldWN0hZcENibVV1NjI2UjkyaFh4MEkGA1UdEQRCMECCPm5xbnc0a2M0Yzc3ZmI0N2xrNTJtNWw1N2g0dGN4Y2VvN3lteGVrZm43eWg1bTY2dDRqdjJvbGFkLm9uaW9uMAoGCCqGSM49BAMCA0cAMEQCICZf4Fh9eBkocEmLMt7oJftEOve4w3qnnzRQWRSW5zF+AiAjskyYorG61BgClMVp8mjQGnSekMbqSN8stkzHIv/n/A==',
}

const logger = createLogger('test:communityMetadataStore')

describe('CommmunityMetadataStore', () => {
  let metaValidWithOwnerId: CommunityMetadata
  let entryValid: LogEntry<CommunityMetadata>

  let module: TestingModule
  let libp2pService: Libp2pService
  let ipfsService: IpfsService
  let communityMetadataStore: CommunityMetadataStore
  let orbitDbService: OrbitDbService
  let localDbService: LocalDbService

  let store: Store
  let factory: FactoryGirl
  let community: Community

  const mockLocalDbService = {
    setCommunity: jest.fn(),
    getCurrentCommunity: jest.fn(() => {
      return {
        // @ts-ignore - OrbitDB's type definition doesn't include identity
        ownerOrbitDbIdentity: orbitDbService.orbitDb.identity.id,
      }
    }),
  }

  beforeAll(async () => {
    store = prepareStore().store
    factory = await getFactory(store)
    community = await factory.create<Community>('Community')

    // const rootCa = await createTestRootCA()
    //   const csr = await createTestUserCsr()
    //   const cert = await createTestUserCert(rootCa, csr)

    //   logger.warn(rootCa.rootCertString)
    //   logger.warn(rootCa.)
    //   logger.warn(csr.userCsr)
    //   logger.warn(cert.userCertString)
  })

  beforeEach(async () => {
    jest.clearAllMocks()

    module = await Test.createTestingModule({
      imports: [TestModule, StorageModule, Libp2pModule, IpfsModule],
    })
      .overrideProvider(LocalDbService)
      .useValue(mockLocalDbService)
      .compile()

    libp2pService = await module.resolve(Libp2pService)
    const libp2pParams = await libp2pInstanceParams()
    await libp2pService.createInstance(libp2pParams)

    ipfsService = await module.resolve(IpfsService)
    await ipfsService.createInstance()

    orbitDbService = await module.resolve(OrbitDbService)
    localDbService = await module.resolve(LocalDbService)

    await orbitDbService.create(libp2pParams.peerId, ipfsService.ipfsInstance!)

    communityMetadataStore = await module.resolve(CommunityMetadataStore)
    await communityMetadataStore.init()

    metaValidWithOwnerId = {
      ...metaValid,
      // @ts-ignore
      ownerOrbitDbIdentity: orbitDbService.orbitDb.identity.id,
    }

    const op = { op: 'PUT', key: metaValidWithOwnerId.id, value: metaValidWithOwnerId }

    entryValid = await Entry.create<CommunityMetadata>(
      orbitDbService.orbitDb.identity,
      // @ts-ignore
      communityMetadataStore.store.log.id,
      op
    )
  })

  afterEach(async () => {
    await communityMetadataStore.close()
    await orbitDbService.stop()
    await ipfsService.stop()
    await libp2pService.close()
    if (fs.existsSync(TestConfig.ORBIT_DB_DIR)) {
      fs.rmSync(TestConfig.ORBIT_DB_DIR, { recursive: true })
    }
  })

  const mockIdentities = (verifyIdentityRes: boolean, verifyRes: boolean): IdentitiesType => {
    return {
      verifyIdentity: jest.fn(() => verifyIdentityRes),
      getIdentity: jest.fn(() => orbitDbService.orbitDb.identity),
      verify: jest.fn(() => verifyRes),
    } as unknown as IdentitiesType
  }

  describe('updateCommunityMetadata', () => {
    test('updates community metadata if the metadata is valid', async () => {
      const ret = await communityMetadataStore.setEntry(metaValid.id, metaValid)
      const meta = await communityMetadataStore.getEntry()

      expect(ret).toStrictEqual(metaValidWithOwnerId)
      expect(meta).toStrictEqual(metaValidWithOwnerId)
    })

    test('does not update community metadata if the metadata is invalid', async () => {
      const metaInvalid = {
        ...metaValid,
        rootCa: 'Something invalid!',
      }
      expect(communityMetadataStore.setEntry(metaInvalid.id, metaInvalid)).rejects.toThrow()
      const meta = await communityMetadataStore.getEntry()
      expect(meta).toEqual(null)
    })
  })

  describe('validateCommunityMetadataEntry', () => {
    test('returns true if the owner ID is expected and entry is otherwise valid', async () => {
      const ret = await CommunityMetadataStore.validateCommunityMetadataEntry(
        localDbService,
        mockIdentities(true, true),
        entryValid
      )

      expect(ret).toEqual(true)
    })

    test('returns false if verify returns false and entry is otherwise valid', async () => {
      const ret = await CommunityMetadataStore.validateCommunityMetadataEntry(
        localDbService,
        mockIdentities(true, false),
        entryValid
      )

      expect(ret).toEqual(false)
    })

    test('returns false if verifyIdentity returns false and entry is otherwise valid', async () => {
      const ret = await CommunityMetadataStore.validateCommunityMetadataEntry(
        localDbService,
        mockIdentities(false, true),
        entryValid
      )

      expect(ret).toEqual(false)
    })

    test('returns false if the owner ID is unexpected and entry is otherwise valid', async () => {
      const op = { op: 'PUT', key: metaValidWithOwnerId.id, value: metaValidWithOwnerId }

      try {
        const entryInvalid = await Entry.create<CommunityMetadata>(
          {
            ...orbitDbService.orbitDb.identity,
            // NOTE: This is where the entry identity is defined!
            id: 'Not the owner!',
          },
          // @ts-ignore
          communityMetadataStore.store.log.id,
          op
        )
        // this should throw an error so if we make it here something is wrong
        expect(entryInvalid).not.toBeTruthy()
      } catch (e) {
        expect(e).toBeTruthy()
        // packages/backend/node_modules/@orbitdb/core/src/identities/identities.js - sign
        expect(e.message).toEqual('Private signing key not found from KeyStore')
      }
    })

    test('returns false if the owner cert is unexpected and entry is otherwise valid', async () => {
      const metaInvalid = {
        ...metaValidWithOwnerId,
        rootCa: 'Something invalid!',
      }
      const opInvalid = { op: 'PUT', key: metaInvalid.id, value: metaInvalid }
      const entryInvalid = await Entry.create<CommunityMetadata>(
        orbitDbService.orbitDb.identity,
        // @ts-ignore
        communityMetadataStore.store.log.id,
        opInvalid
      )

      const ret = await CommunityMetadataStore.validateCommunityMetadataEntry(
        localDbService,
        mockIdentities(true, true),
        entryInvalid
      )

      expect(ret).toEqual(false)
    })
  })
})
