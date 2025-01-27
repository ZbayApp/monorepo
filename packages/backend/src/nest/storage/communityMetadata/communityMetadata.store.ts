import {
  Entry,
  type LogEntry,
  type IdentityProvider,
  type IdentitiesType,
  IPFSAccessController,
  type KeyValueType,
} from '@orbitdb/core'
import { CommunityMetadata } from '@quiet/types'
import { loadCertificate } from '@quiet/identity'
import { StorageEvents } from '../storage.types'
import { KeyValueIndexedValidated } from '../orbitDb/keyValueIndexedValidated'
import { LocalDbService } from '../../local-db/local-db.service'
import { OrbitDbService } from '../orbitDb/orbitDb.service'
import { Injectable } from '@nestjs/common'
import { createLogger } from '../../common/logger'
import { KeyValueStoreBase } from '../base.store'

const logger = createLogger('communityMetadataStore')

@Injectable()
export class CommunityMetadataStore extends KeyValueStoreBase<CommunityMetadata> {
  constructor(
    private readonly orbitDbService: OrbitDbService,
    private readonly localDbService: LocalDbService
  ) {
    super()
  }

  public async init() {
    logger.info('Initializing community metadata key/value store')

    // If the owner initializes the CommunityMetadataStore, then the
    // ID would be undefined at this point when they first create the
    // community. This would mean that they wouldn't be able to to
    // validate an entry's ownership when writing or replicating.
    //
    // As a quick solution, we dynamically retrieve the owner's
    // identity in the validation function. So after the owner sets it
    // when calling updateCommunityMetadata, the validation function
    // could then retrieve it. In our case, this is probably fine,
    // because only the owner would be in the network by the time they
    // first call updateCommunityMetadata.
    //
    // However, I think it might be simpler to pass the owner's
    // OrbitDB identity when creating the store. For this we need to
    // know at the time of initialization whether or not someone is
    // the owner.

    this.store = await this.orbitDbService.orbitDb.open<KeyValueType<CommunityMetadata>>('community-metadata', {
      sync: false,
      Database: KeyValueIndexedValidated(
        CommunityMetadataStore.validateCommunityMetadataEntry.bind(
          null,
          this.localDbService,
          this.orbitDbService.identities
        )
      ),
      AccessController: IPFSAccessController({ write: ['*'] }),
    })

    this.store.events.on('update', async () => {
      logger.info('Replicated community metadata')
      const meta = await this.getEntry()
      if (meta) {
        this.emit(StorageEvents.COMMUNITY_METADATA_STORED, meta)
      }
    })

    const meta = await this.getEntry()
    if (meta) {
      this.emit(StorageEvents.COMMUNITY_METADATA_STORED, meta)
    }
    logger.info('Loaded community metadata to memory')
  }

  public async startSync() {
    await this.getStore().sync.start()
  }

  public async setEntry(key: string, value: CommunityMetadata): Promise<CommunityMetadata> {
    try {
      // TODO: Also check OrbitDB identity when updating community metadata
      const valid = await CommunityMetadataStore.validateCommunityMetadata(value)
      if (!valid) {
        // TODO: Send validation errors to frontend or replicate
        // validation on frontend?
        logger.error('Failed to set community metadata. Metadata is invalid')
        throw new Error('Failed to set community metadata')
      }

      logger.info(`About to update community metadata`, value?.id)
      if (!value.id) throw new Error('Community metadata id is missing')

      // FIXME: update community metadata if it has changed (so that
      // we can migrate community metadata easily)
      const oldMeta = await this.getStore().get(key)
      if (oldMeta?.ownerCertificate && oldMeta?.rootCa) {
        return oldMeta
      }

      logger.info(`Updating community metadata`)
      const ownerOrbitDbIdentity = this.orbitDbService.orbitDb.identity.id
      const meta: CommunityMetadata = {
        ...oldMeta,
        ...value,
        ownerOrbitDbIdentity,
      }

      // Updating this here before store.put because the store's KeyValueIndex
      // then uses the updated Community object.
      const community = await this.localDbService.getCurrentCommunity()
      if (community) {
        await this.localDbService.setCommunity({ ...community, ownerOrbitDbIdentity })
      } else {
        throw new Error('Current community missing')
      }

      // FIXME: I think potentially there is a subtle developer
      // experience bug here. Internally OrbitDB will call
      // validateCommunityMetadataEntry and so validation may pass in
      // this method, but still the entry is not added to the internal
      // index. How can we detect that?
      await this.getStore().put(key, meta)

      return meta
    } catch (err) {
      logger.error('Failed to add community metadata', key, err)
      throw new Error('Failed to add community metadata')
    }
  }

  public async getEntry(_key?: string): Promise<CommunityMetadata | null> {
    const metadata = (await this.getStore().all()).map(x => x.value)

    return metadata.length > 0 ? metadata[0] : null
  }

  public static async validateCommunityMetadata(communityMetadata: CommunityMetadata): Promise<boolean> {
    // FIXME: Add additional validation to verify communityMetadata
    // contains required fields.

    try {
      // TODO: Should we sign community metadata with root private key
      // and verify? I'm not sure it matters that much.

      const rootCert = loadCertificate(communityMetadata.rootCa)
      const ownerCert = loadCertificate(communityMetadata.ownerCertificate)

      // Verify that owner certificate is signed by root certificate
      return await ownerCert.verify(rootCert)
    } catch (err) {
      logger.error('Failed to validate community metadata:', communityMetadata.id, err)
      return false
    }
  }

  public static async validateCommunityMetadataEntry(
    localDbService: LocalDbService,
    identities: IdentitiesType,
    entry: LogEntry<CommunityMetadata>
  ): Promise<boolean> {
    try {
      if (entry.payload.value && entry.payload.key !== entry.payload.value.id) {
        logger.error('Failed to verify community metadata entry:', entry.hash, 'entry key != payload id')
        return false
      }

      const community = await localDbService.getCurrentCommunity()
      const ownerOrbitDbIdentity = community?.ownerOrbitDbIdentity
      if (!ownerOrbitDbIdentity) {
        logger.error('Failed to verify community metadata entry:', entry.hash, 'owner identity is invalid')
        return false
      }

      const entryIdentity = await identities.getIdentity(entry.identity)
      if (entryIdentity.id !== ownerOrbitDbIdentity) {
        logger.error('Failed to verify community metadata entry:', entry.hash, 'entry identity != owner identity')
        return false
      }

      const entryVerified = await Entry.verify(identities, entry)
      if (!entryVerified) {
        logger.error('Failed to verify community metadata entry:', entry.hash, 'invalid entry signature')
        return false
      }

      const writerIdentity = await identities.getIdentity(entry.identity)
      const identityVerified = await identities.verifyIdentity(writerIdentity)
      if (!identityVerified) {
        logger.error('Failed to verify community metadata entry:', entry.hash, 'entry identity verification failed')
        return false
      }

      if (entry.payload.value) {
        return await CommunityMetadataStore.validateCommunityMetadata(entry.payload.value)
      } else {
        return true
      }
    } catch (err) {
      logger.error('Failed to verify community metadata entry:', entry.hash, err)
      return false
    }
  }

  public clean() {
    logger.info('Cleaning metadata store')
    this.store = undefined
  }
}
