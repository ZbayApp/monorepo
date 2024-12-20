import { Module } from '@nestjs/common'
import { StorageService } from './storage.service'
import { LocalDbModule } from '../local-db/local-db.module'
import { IpfsFileManagerModule } from '../ipfs-file-manager/ipfs-file-manager.module'
import { OrbitDbService } from './orbitDb/orbitDb.service'
import { CertificatesRequestsStore } from './certifacteRequests/certificatesRequestsStore'
import { CertificatesStore } from './certificates/certificates.store'
import { CommunityMetadataStore } from './communityMetadata/communityMetadata.store'
import { UserProfileStore } from './userProfile/userProfile.store'
import { IpfsModule } from '../ipfs/ipfs.module'

@Module({
  imports: [LocalDbModule, IpfsModule, IpfsFileManagerModule],
  providers: [
    StorageService,
    OrbitDbService,
    CertificatesStore,
    CommunityMetadataStore,
    CertificatesRequestsStore,
    UserProfileStore,
  ],
  exports: [StorageService],
})
export class StorageModule {}
