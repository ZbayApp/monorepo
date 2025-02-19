import { getCrypto } from 'pkijs'
import { type LogEntry, type EventsType, IPFSAccessController } from '@orbitdb/core'
import { NoCryptoEngineError } from '@quiet/types'
import { loadCSR, keyFromCertificate, CertFieldsTypes, getReqFieldValue } from '@quiet/identity'
import { StorageEvents } from '../storage.types'
import { validate } from 'class-validator'
import { UserCsrData } from '../../registration/registration.functions'
import { Injectable } from '@nestjs/common'
import { OrbitDbService } from '../orbitDb/orbitDb.service'
import { createLogger } from '../../common/logger'
import { EventStoreBase } from '../base.store'
import { EventsWithStorage } from '../orbitDb/eventsWithStorage'
import { SigChainService } from '../../auth/sigchain.service'
import { EncryptedAndSignedPayload, EncryptionScopeType } from '../../auth/services/crypto/types'

@Injectable()
export class CertificatesRequestsStore extends EventStoreBase<EncryptedAndSignedPayload | string> {
  protected readonly logger = createLogger(CertificatesRequestsStore.name)

  constructor(
    private readonly orbitDbService: OrbitDbService,
    private readonly chains: SigChainService
  ) {
    super()
  }

  public async init() {
    this.logger.info('Initializing certificates requests store')

    this.store = await this.orbitDbService.orbitDb.open<EventsType<EncryptedAndSignedPayload | string>>('csrs', {
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

  private async encryptEntry(payload: string): Promise<EncryptedAndSignedPayload> {
    try {
      const chain = this.chains.getActiveChain()
      const encryptedPayload = chain.crypto.encryptAndSign(
        payload,
        { type: EncryptionScopeType.TEAM },
        chain.localUserContext
      )
      return encryptedPayload
    } catch (err) {
      this.logger.error('Failed to encrypt user entry:', err)
      throw err
    }
  }

  private async decryptEntry(payload: EncryptedAndSignedPayload): Promise<string> {
    try {
      const chain = this.chains.getActiveChain()
      const decryptedPayload = chain.crypto.decryptAndVerify<string>(
        payload.encrypted,
        payload.signature,
        chain.localUserContext
      )
      return decryptedPayload.contents
    } catch (err) {
      this.logger.error('Failed to decrypt user entry:', err)
      throw err
    }
  }

  public async loadedCertificateRequests() {
    const csrs = await this.getEntries()
    this.emit(StorageEvents.CSRS_STORED, {
      csrs,
    })
  }

  public async addEntry(csr: string): Promise<string> {
    if (!this.store) {
      throw new Error('Store is not initialized')
    }
    const encryptedCsr = await this.encryptEntry(csr)
    this.logger.info('Adding CSR to database')
    await this.store.add(encryptedCsr)
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
    const allEntries: EncryptedAndSignedPayload[] = []
    for await (const x of this.getStore().iterator()) {
      allEntries.push(x.value)
    }

    this.logger.info('Total CSRs:', allEntries.length)

    await Promise.all(
      allEntries.map(async csr => {
        const decCsr = await this.decryptEntry(csr)
        const validation = await this.validateUserCsr(decCsr)
        if (!validation) {
          this.logger.warn(`Skipping csr due to validation error`, decCsr)
          return
        }
        const parsedCsr = await loadCSR(decCsr)
        const pubKey = keyFromCertificate(parsedCsr)

        if (filteredCsrsMap.has(pubKey)) {
          this.logger.warn(`Skipping csr due to existing pubkey`, pubKey)
          return
        }
        filteredCsrsMap.set(pubKey, decCsr)
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
