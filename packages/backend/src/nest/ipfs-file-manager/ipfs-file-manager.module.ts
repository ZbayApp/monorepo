import { Module } from '@nestjs/common'
import { IpfsFileManagerService } from './ipfs-file-manager.service'
import { IpfsModule } from '../ipfs/ipfs.module'
import { SigChainModule } from '../auth/sigchain.service.module'

@Module({
  imports: [IpfsModule, SigChainModule],
  providers: [IpfsFileManagerService],
  exports: [IpfsFileManagerService],
})
export class IpfsFileManagerModule {}
