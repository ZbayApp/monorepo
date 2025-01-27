import { getCrypto } from 'pkijs'
import { type EventsType, IPFSAccessController, type LogEntry } from '@orbitdb/core'
import { StorageEvents } from '../storage.types'
import { CommunityMetadata, NoCryptoEngineError } from '@quiet/types'
import {
  keyFromCertificate,
  CertFieldsTypes,
  parseCertificate,
  getCertFieldValue,
  loadCertificate,
} from '@quiet/identity'
import { ConnectionProcessInfo, SocketActionTypes, UserData } from '@quiet/types'
import { validate } from 'class-validator'
import { CertificateData } from '../../registration/registration.functions'
import { OrbitDbService } from '../orbitDb/orbitDb.service'
import { Injectable } from '@nestjs/common'
import { createLogger } from '../../common/logger'
import { EventStoreBase } from '../base.store'
import { EventsWithStorage } from '../orbitDb/eventsWithStorage'

@Injectable()
export class CertificatesStore extends EventStoreBase<string> {
  protected readonly logger = createLogger(CertificatesStore.name)

  private metadata: CommunityMetadata | undefined
  private filteredCertificatesMapping: Map<string, Partial<UserData>>
  private usernameMapping: Map<string, string>

  constructor(private readonly orbitDbService: OrbitDbService) {
    super()
    this.filteredCertificatesMapping = new Map()
    this.usernameMapping = new Map()
  }

  public async init() {
    this.logger.info('Initializing certificates log store')

    this.store = await this.orbitDbService.orbitDb.open<EventsType<string>>('certificates', {
      type: 'events',
      sync: false,
      Database: EventsWithStorage(),
      AccessController: IPFSAccessController({ write: ['*'] }),
    })

    this.store.events.on('update', async (event: LogEntry) => {
      this.logger.info('Database update')
      this.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, ConnectionProcessInfo.CERTIFICATES_STORED)
      await this.loadedCertificates()
    })

    this.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, ConnectionProcessInfo.CERTIFICATES_STORED)

    this.logger.info('Initialized')
  }

  public async startSync() {
    await this.getStore().sync.start()
  }

  public async loadedCertificates() {
    this.emit(StorageEvents.CERTIFICATES_STORED, {
      certificates: await this.getEntries(),
    })
  }

  public async addEntry(certificate: string): Promise<string> {
    this.logger.info('Adding user certificate')
    await this.store?.add(certificate)
    return certificate
  }

  public updateMetadata(metadata: CommunityMetadata) {
    if (!metadata) return
    this.metadata = metadata
    // FIXME: Community metadata is required for validating
    // certificates, so we re-validate certificates once community
    // metadata is set. Currently the certificates store receives the
    // community metadata via an event. Is there a better way to
    // organize this so that the dependencies are clearer? Having
    // CertificateStore depend on CommunityMetadataStore directly?
    // Storing community metadata in LevelDB? Only initializing
    // certificate store after community metadata is available?
    if (this.store) {
      this.loadedCertificates()
    }
  }

  private async validateCertificate(certificate: string) {
    try {
      await this.validateCertificateAuthority(certificate)
      await this.validateCertificateFormat(certificate)
    } catch (err) {
      this.logger.error('Failed to validate user certificate:', certificate, err)
      return false
    }
    return true
  }

  private async validateCertificateAuthority(certificate: string) {
    const crypto = getCrypto()

    if (!crypto) {
      throw new NoCryptoEngineError()
    }

    if (!this.metadata) {
      throw new Error('Community metadata missing')
    }

    const parsedRootCertificate = loadCertificate(this.metadata.rootCa)
    const parsedCertificate = loadCertificate(certificate)
    const verification = await parsedCertificate.verify(parsedRootCertificate)

    return verification
  }

  private async validateCertificateFormat(certificate: string) {
    const certificateData = new CertificateData()
    certificateData.certificate = certificate
    const validationErrors = await validate(certificateData)
    return validationErrors
  }

  /*
   * Method returning store entries, filtered by validation result
   * as specified in the comment section of
   * https://github.com/TryQuiet/quiet/issues/1899
   */
  public async getEntries(): Promise<string[]> {
    this.logger.info('Getting certificates')

    const allCertificates: string[] = []

    for await (const x of this.getStore().iterator()) {
      allCertificates.push(x.value)
    }

    this.logger.info(`All certificates: ${allCertificates.length}`)

    const validCertificates = await Promise.all(
      allCertificates.map(async certificate => {
        if (this.filteredCertificatesMapping.has(certificate)) {
          return certificate // Only validate certificates
        }

        const validation = await this.validateCertificate(certificate)
        if (validation) {
          const parsedCertificate = parseCertificate(certificate)
          const pubkey = keyFromCertificate(parsedCertificate)

          const username = getCertFieldValue(parsedCertificate, CertFieldsTypes.nickName)

          // @ts-expect-error
          this.usernameMapping.set(pubkey, username)

          const data: Partial<UserData> = {
            // @ts-expect-error
            username: username,
          }

          this.filteredCertificatesMapping.set(certificate, data)

          return certificate
        }
      })
    )

    const validCerts = validCertificates.filter(i => i != undefined)
    this.logger.info(`Valid certificates: ${validCerts.length}`)
    // TODO: Why doesn't TS infer this properly?
    return validCerts as string[]
  }

  public async getCertificateUsername(pubkey: string) {
    const cache = this.usernameMapping.get(pubkey)
    if (cache) return cache

    // Perform cryptographic operations and populate cache
    await this.getEntries()

    // Return desired data from updated cache
    return this.usernameMapping.get(pubkey)
  }

  public clean() {
    this.logger.info('Cleaning certificates store')
    this.store = undefined
    this.metadata = undefined
    this.filteredCertificatesMapping = new Map()
    this.usernameMapping = new Map()
  }
}
