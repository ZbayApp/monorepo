import { getCrypto } from 'pkijs'
import { type LogEntry, type EventsType, IPFSAccessController } from '@orbitdb/core'
import { NoCryptoEngineError } from '@quiet/types'
import { loadCSR, keyFromCertificate } from '@quiet/identity'
import { StorageEvents } from '../storage.types'
import { validate } from 'class-validator'
import { UserCsrData } from '../../registration/registration.functions'
import { Injectable } from '@nestjs/common'
import { OrbitDbService } from '../orbitDb/orbitDb.service'
import { createLogger } from '../../common/logger'
import { EventStoreBase } from '../base.store'
import { EventsWithStorage } from '../orbitDb/eventsWithStorage'

@Injectable()
export class CertificatesRequestsStore extends EventStoreBase<string> {
  protected readonly logger = createLogger(CertificatesRequestsStore.name)

  constructor(private readonly orbitDbService: OrbitDbService) {
    super()
  }

  public async init() {
    this.logger.info('Initializing certificates requests store')

    this.store = await this.orbitDbService.orbitDb.open<EventsType<string>>('csrs', {
      type: 'events',
      sync: false,
      Database: EventsWithStorage(),
      AccessController: IPFSAccessController({ write: ['*'] }),
    })

    this.store.events.on('update', async (entry: LogEntry) => {
      this.logger.info('Database update')
      this.loadedCertificateRequests()
    })

    this.logger.info('Initialized')
  }

  public async startSync() {
    await this.getStore().sync.start()
  }

  public async loadedCertificateRequests() {
    this.emit(StorageEvents.CSRS_STORED, {
      csrs: await this.getEntries(),
    })
  }

  public async addEntry(csr: string): Promise<string> {
    if (!this.store) {
      throw new Error('Store is not initialized')
    }
    this.logger.info('Adding CSR to database')
    await this.getStore().add(csr)
    this.loadedCertificateRequests()
    return csr
  }

  public async validateUserCsr(csr: string) {
    try {
      const crypto = getCrypto()
      if (!crypto) {
        throw new NoCryptoEngineError()
      }
      const parsedCsr = await loadCSR(csr)
      await parsedCsr.verify()
      await this.validateCsrFormat(csr)
    } catch (err) {
      this.logger.error('Failed to validate user CSR:', csr, err)
      return false
    }
    return true
  }

  public async validateCsrFormat(csr: string) {
    const userData = new UserCsrData()
    userData.csr = csr
    const validationErrors = await validate(userData)
    return validationErrors
  }

  public async getEntries() {
    const filteredCsrsMap: Map<string, string> = new Map()
    const allEntries: string[] = []

    for await (const x of this.getStore().iterator()) {
      allEntries.push(x.value)
    }

    this.logger.info('Total CSRs:', allEntries.length)

    const allCsrsUnique = [...new Set(allEntries)]
    await Promise.all(
      allCsrsUnique
        .filter(async csr => {
          const validation = await this.validateUserCsr(csr)
          if (validation) return true
          return false
        })
        .map(async csr => {
          const parsedCsr = await loadCSR(csr)
          const pubKey = keyFromCertificate(parsedCsr)

          if (filteredCsrsMap.has(pubKey)) {
            filteredCsrsMap.delete(pubKey)
          }
          filteredCsrsMap.set(pubKey, csr)
        })
    )
    const validCsrs = [...filteredCsrsMap.values()]
    this.logger.info('Valid CSRs:', validCsrs.length)
    return validCsrs
  }

  public clean() {
    this.logger.info('Cleaning certificates requests store')
    this.store = undefined
  }
}
