import { Test, TestingModule } from '@nestjs/testing'
import { TestModule } from '../common/test.module'
import { libp2pInstanceParams } from '../common/utils'
import { Libp2pModule } from '../libp2p/libp2p.module'
import { Libp2pService } from '../libp2p/libp2p.service'
import { LocalDbModule } from '../local-db/local-db.module'
import { SocketModule } from '../socket/socket.module'
import { IpfsModule } from './ipfs.module'
import { IpfsService } from './ipfs.service'

describe('IpfsService', () => {
  let module: TestingModule
  let ipfsService: IpfsService
  let libp2pService: Libp2pService

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [TestModule, IpfsModule, SocketModule, Libp2pModule, LocalDbModule],
    }).compile()

    libp2pService = await module.resolve(Libp2pService)
    const params = await libp2pInstanceParams()

    await libp2pService.createInstance(params)
    expect(libp2pService.libp2pInstance).not.toBeNull()

    ipfsService = await module.resolve(IpfsService)
  })

  afterEach(async () => {
    await libp2pService.libp2pInstance?.stop()
    await ipfsService.ipfsInstance?.stop()
    await module.close()
  })

  it('Create IPFS instance', async () => {
    await ipfsService.createInstance()
    const ipfsInstance = ipfsService.ipfsInstance
    expect(ipfsInstance).not.toBeNull()
  })

  it('destory instance IPFS', async () => {
    await ipfsService.createInstance()
    await ipfsService.destoryInstance()
    expect(ipfsService.ipfsInstance).toBeNull()
  })
})
