import { Module } from '@nestjs/common'
import { SigChainService } from './sigchain.service'
import { LocalDbModule } from '../local-db/local-db.module'

@Module({
  providers: [SigChainService],
  exports: [SigChainService],
  imports: [LocalDbModule],
})
export class SigChainModule {}
