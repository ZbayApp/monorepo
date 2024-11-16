import { Module } from '@nestjs/common'
import { SigChainService } from './sigchain.service'

@Module({
  providers: [SigChainService],
  exports: [SigChainService],
})
export class SigChainModule {}
