import { Injectable, OnModuleInit } from '@nestjs/common'
import { EventEmitter } from 'events'
import { extractPendingCsrs, issueCertificate } from './registration.functions'
import {
  ErrorCodes,
  ErrorMessages,
  PermsData,
  RegisterOwnerCertificatePayload,
  type SavedOwnerCertificatePayload,
  SocketActionTypes,
} from '@quiet/types'
import { RegistrationEvents } from './registration.types'
import { createLogger } from '../common/logger'
import { StorageService } from '../storage/storage.service'

/*
Manages the registration of certificates for users and the owner of a
community
*/
@Injectable()
export class RegistrationService extends EventEmitter implements OnModuleInit {
  private readonly logger = createLogger(RegistrationService.name)
  private permsData: PermsData
  private storageService: StorageService
  private registrationEvents: { csrs: string[] }[] = []
  private registrationEventInProgress = false

  constructor() {
    super()
  }

  onModuleInit() {
    this.on(RegistrationEvents.REGISTER_USER_CERTIFICATE, async (payload: { csrs: string[] }) => {
      // Save the registration event and then try to process it, but
      // since we only process a single event at a time, it might not
      // get processed until other events have been processed.
      this.registrationEvents.push(payload)
      await this.tryIssueCertificates()
    })
  }

  public init(storageService: StorageService) {
    this.storageService = storageService
  }

  public setPermsData(permsData: PermsData) {
    this.permsData = permsData
  }

  public async tryIssueCertificates() {
    this.logger.info('Trying to process registration event')
    // Process only a single registration event at a time so that we
    // do not register two certificates with the same name.
    if (!this.registrationEventInProgress) {
      // Get the next event.
      const event = this.registrationEvents.shift()
      if (event) {
        this.logger.info('Processing registration event')
        // Event processing in progress
        this.registrationEventInProgress = true

        // Await the processing function and make sure everything that
        // needs to be done in order is awaited inside this function.
        await this.issueCertificates({
          ...event,
          certificates: (await this.storageService?.loadAllCertificates()) as string[],
        })

        this.logger.info('Finished processing registration event')
        // Event processing finished
        this.registrationEventInProgress = false

        // Re-run this function if there are more events to process
        if (this.registrationEvents.length > 0) {
          setTimeout(this.tryIssueCertificates.bind(this), 0)
        }
      }
    } else {
      this.logger.warn('Registration event processing already in progress')
    }
  }

  private async issueCertificates(payload: { csrs: string[]; certificates: string[] }) {
    // Lack of permsData means that we are not the owner of the
    // community in the official model of the app, however anyone can
    // modify the source code, put malicious permsData here, issue
    // false certificates and try to trick other users. To prevent
    // that, peers verify that anything that is written to the
    // certificate store is signed by the owner.
    //
    // NOTE: There may be a race condition here if we try to issue
    // certs before permsData is set. We may want to refactor this or
    // add the ability to retry.
    if (!this.permsData) {
      this.logger.warn('Not issuing certificates due to missing perms data')
      return
    }

    const pendingCsrs = await extractPendingCsrs(payload)
    this.logger.info(`Issuing certificates`)
    await Promise.all(
      pendingCsrs.map(async csr => {
        await this.registerUserCertificate(csr)
      })
    )
    this.logger.info('Total certificates issued:', pendingCsrs.length)
  }

  // TODO: This doesn't save the owner's certificate in OrbitDB, so perhaps we
  // should rename it or look into refactoring so that it does save to OrbitDB.
  // However, currently, this is called before the storage service is
  // initialized.
  public async registerOwnerCertificate(
    payload: RegisterOwnerCertificatePayload
  ): Promise<SavedOwnerCertificatePayload> {
    this.permsData = payload.permsData
    const result = await issueCertificate(payload.userCsr.userCsr, this.permsData)
    if (result?.cert) {
      return {
        communityId: payload.communityId,
        network: { certificate: result.cert },
      }
    } else {
      throw new Error('Failed to register owner certificate')
    }
  }

  public async registerUserCertificate(csr: string): Promise<void> {
    const result = await issueCertificate(csr, this.permsData)
    if (result?.cert) {
      // Save certificate (awaited) so that we are sure that the certs
      // are saved before processing the next round of CSRs.
      // Otherwise, we could issue a duplicate certificate.

      // @ts-ignore
      await this.storageService?.saveCertificate({ certificate: result.cert })
    }
  }
}
