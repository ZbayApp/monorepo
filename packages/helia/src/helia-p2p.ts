import { Helia, type HeliaInit } from '@helia/utils'
import type { BlockBroker } from './index.js'
import type { Libp2p } from '@libp2p/interface'
import type { Blockstore } from 'interface-blockstore'
import type { Datastore } from 'interface-datastore'

export interface HeliaP2PInit<T extends Libp2p = Libp2p> extends HeliaInit {
  libp2p: T
  blockstore: Blockstore
  datastore: Datastore
  blockBrokers: Array<(components: any) => BlockBroker>
}

export class HeliaP2P<T extends Libp2p> extends Helia {
  public libp2p: T

  constructor(init: HeliaP2PInit<T>) {
    super({
      ...init,
      components: {
        libp2p: init.libp2p,
      },
    })

    this.libp2p = init.libp2p
  }

  async start(): Promise<void> {
    await super.start()
    await this.libp2p.start()
  }

  async stop(): Promise<void> {
    await super.stop()
    await this.libp2p.stop()
  }
}
