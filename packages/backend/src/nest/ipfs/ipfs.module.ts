import { Module } from '@nestjs/common'
import { IpfsService } from './ipfs.service'
import { Libp2pModule } from '../libp2p/libp2p.module'

@Module({
  imports: [Libp2pModule],
  providers: [IpfsService],
  exports: [IpfsService],
})
export class IpfsModule {}
