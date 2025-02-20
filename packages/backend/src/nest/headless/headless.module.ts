import { Module } from '@nestjs/common'
import { ConnectionsManagerModule } from '../connections-manager/connections-manager.module'
import { LocalDbModule } from '../local-db/local-db.module'
import { HeadlessService } from './headless.service'

@Module({
  imports: [LocalDbModule, ConnectionsManagerModule],
  providers: [HeadlessService],
  exports: [HeadlessService],
})
export class HeadlessModule {}
