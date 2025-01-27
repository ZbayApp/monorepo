import { Injectable } from '@nestjs/common'
import { type LogEntry, type KeyValueType, IPFSAccessController } from '@orbitdb/core'
import { getCrypto } from 'pkijs'
import { sha256 } from 'multiformats/hashes/sha2'
import * as Block from 'multiformats/block'
import * as dagCbor from '@ipld/dag-cbor'
import { stringToArrayBuffer } from 'pvutils'
import { NoCryptoEngineError, UserProfile } from '@quiet/types'
import { keyObjectFromString, verifySignature } from '@quiet/identity'

import { createLogger } from '../../common/logger'
import { OrbitDbService } from '../orbitDb/orbitDb.service'
import { StorageEvents } from '../storage.types'
import { KeyValueIndexedValidated } from '../orbitDb/keyValueIndexedValidated'
import { validatePhoto } from './userProfile.utils'
import { KeyValueStoreBase } from '../base.store'

const logger = createLogger('UserProfileStore')

@Injectable()
export class UserProfileStore extends KeyValueStoreBase<UserProfile> {
  // Copying OrbitDB by using dag-cbor/sha256 for converting the
  // profile to a byte array for signing:
  // https://github.com/orbitdb/orbitdb/blob/3eee148510110a7b698036488c70c5c78f868cd9/src/oplog/entry.js#L75-L76
  // I think any encoding would work here.
  public static readonly codec = dagCbor
  public static readonly hasher = sha256

  constructor(private readonly orbitDbService: OrbitDbService) {
    super()
  }

  public async init() {
    logger.info('Initializing user profiles key/value store')

    this.store = await this.orbitDbService.orbitDb.open<KeyValueType<UserProfile>>('user-profiles', {
      type: 'KeyValueIndexedValidated',
      sync: false,
      Database: KeyValueIndexedValidated(UserProfileStore.validateUserProfileEntry),
      AccessController: IPFSAccessController({ write: ['*'] }),
    })

    this.store.events.on('update', async (entry: LogEntry) => {
      logger.info('Database update')
      this.emit(StorageEvents.USER_PROFILES_STORED, {
        profiles: await this.getUserProfiles(),
      })
    })

    this.emit(StorageEvents.USER_PROFILES_STORED, {
      profiles: await this.getUserProfiles(),
    })
  }

  public async startSync() {
    await this.getStore().sync.start()
  }

  public async getEntry(key: string): Promise<UserProfile> {
    throw new Error('Method not implemented.')
  }

  public async setEntry(key: string, userProfile: UserProfile) {
    logger.info('Adding user profile')
    try {
      if (!UserProfileStore.validateUserProfile(userProfile)) {
        // TODO: Send validation errors to frontend or replicate
        // validation on frontend?
        logger.error('Failed to add user profile, profile is invalid', userProfile.pubKey)
        throw new Error('Failed to add user profile')
      }
      await this.getStore().put(key, userProfile)
    } catch (err) {
      logger.error('Failed to add user profile', userProfile.pubKey, err)
      throw new Error('Failed to add user profile')
    }
    return userProfile
  }

  public static async validateUserProfile(userProfile: UserProfile) {
    // FIXME: Add additional validation to verify userProfile contains
    // required fields
    try {
      const crypto = getCrypto()
      if (!crypto) {
        throw new NoCryptoEngineError()
      }

      const profile = userProfile.profile
      const pubKey = await keyObjectFromString(userProfile.pubKey, crypto)
      const profileSig = stringToArrayBuffer(userProfile.profileSig)
      const { bytes } = await Block.encode({
        value: profile,
        codec: UserProfileStore.codec,
        hasher: UserProfileStore.hasher,
      })
      const verify = await verifySignature(profileSig, bytes, pubKey)

      if (!verify) {
        logger.error('User profile contains invalid signature', userProfile.pubKey)
        return false
      }

      if (!validatePhoto(profile.photo, userProfile.pubKey)) {
        return false
      }
    } catch (err) {
      logger.error('Failed to validate user profile:', userProfile.pubKey, err)
      return false
    }

    return true
  }

  public static async validateUserProfileEntry(entry: LogEntry<UserProfile>) {
    try {
      if (entry.payload.key !== (entry.payload.value as UserProfile).pubKey) {
        logger.error(`Failed to verify user profile entry: ${entry.hash} entry key != payload pubKey`)
        return false
      }

      return await UserProfileStore.validateUserProfile(entry.payload.value as UserProfile)
    } catch (err) {
      logger.error('Failed to validate user profile entry:', entry.hash, err)
      return false
    }
  }

  public async getUserProfiles(): Promise<UserProfile[]> {
    return (await this.getStore().all()).map(x => x.value)
  }

  clean(): void {
    logger.info('Cleaning user profiles store')
    this.store = undefined
  }
}
