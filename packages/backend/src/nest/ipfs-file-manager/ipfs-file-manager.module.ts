import { Module } from '@nestjs/common'
import { IpfsFileManagerService } from './ipfs-file-manager.service'
import { IpfsModule } from '../ipfs/ipfs.module'

@Module({
  imports: [IpfsModule],
  providers: [IpfsFileManagerService],
  exports: [IpfsFileManagerService],
})
export class IpfsFileManagerModule {}
