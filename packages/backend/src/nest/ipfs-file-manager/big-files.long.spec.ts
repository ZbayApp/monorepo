import { jest } from '@jest/globals'

import { Test, TestingModule } from '@nestjs/testing'
import { DownloadState, FileMetadata } from '@quiet/types'
import { DirResult } from 'tmp'
import waitForExpect from 'wait-for-expect'
import { TestModule } from '../common/test.module'
import { createArbitraryFile, createTmpDir, libp2pInstanceParams } from '../common/utils'
import { IpfsModule } from '../ipfs/ipfs.module'
import { IpfsService } from '../ipfs/ipfs.service'
import { Libp2pModule } from '../libp2p/libp2p.module'
import { Libp2pService } from '../libp2p/libp2p.service'
import { SocketModule } from '../socket/socket.module'
import { StorageEvents } from '../storage/storage.types'
import { IpfsFileManagerModule } from './ipfs-file-manager.module'
import { IpfsFileManagerService } from './ipfs-file-manager.service'
import fs from 'fs'
import { createLogger } from '../common/logger'
import { SigChainService } from '../auth/sigchain.service'
import { SigChainModule } from '../auth/sigchain.service.module'

const logger = createLogger('bigFiles:test')
const BIG_FILE_SIZE = 2097152000

describe('IpfsFileManagerService', () => {
  let module: TestingModule
  let ipfsFileManagerService: IpfsFileManagerService
  let ipfsService: IpfsService
  let libp2pService: Libp2pService
  let sigChainService: SigChainService

  let tmpDir: DirResult
  let filePath: string

  beforeAll(async () => {
    tmpDir = createTmpDir()
    filePath = new URL('./testUtils/large-file.bin', import.meta.url).pathname
    // Generate 2.1GB file
    await createArbitraryFile(filePath, BIG_FILE_SIZE)
    module = await Test.createTestingModule({
      imports: [TestModule, IpfsFileManagerModule, IpfsModule, SocketModule, Libp2pModule, SigChainModule],
    }).compile()

    sigChainService = await module.resolve(SigChainService)
    await sigChainService.createChain('community', 'username', true)

    ipfsFileManagerService = await module.resolve(IpfsFileManagerService)

    libp2pService = await module.resolve(Libp2pService)
    const params = await libp2pInstanceParams()
    await libp2pService.createInstance(params)
    expect(libp2pService.libp2pInstance).not.toBeNull()

    ipfsService = await module.resolve(IpfsService)
    await ipfsService.createInstance()
    expect(ipfsService.ipfsInstance).not.toBeNull()

    await ipfsFileManagerService.init()
  })

  afterAll(async () => {
    tmpDir.removeCallback()
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath)
    }
    await libp2pService.close()
    await ipfsService.stop()
    await ipfsFileManagerService.stop()
    await module.close()
  })
  it('uploads large files', async () => {
    // Uploading
    const eventSpy = jest.spyOn(ipfsFileManagerService, 'emit')
    const copyFileSpy = jest.spyOn(ipfsFileManagerService, 'copyFile')
    const metadata: FileMetadata = {
      path: filePath,
      name: 'test-large-file',
      ext: '.bin',
      cid: 'uploading_id',
      message: {
        id: 'id',
        channelId: 'channelId',
      },
    }
    await waitForExpect(
      () => {
        expect(fs.statSync(filePath).size).toBe(BIG_FILE_SIZE)
      },
      100000,
      100
    )
    if (metadata.path) {
      logger.info(`Uploading file ${metadata.path} of size ${fs.statSync(metadata.path).size}`)
    } else {
      logger.error('File path is null')
    }

    await ipfsFileManagerService.uploadFile(metadata)
    expect(copyFileSpy).toHaveBeenCalled()
    const newFilePath = copyFileSpy.mock.results[0].value
    metadata.path = newFilePath as string

    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenCalledTimes(4)
    })
    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(1, StorageEvents.REMOVE_DOWNLOAD_STATUS, { cid: metadata.cid })
    })
    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(
        2,
        StorageEvents.FILE_UPLOADED,
        expect.objectContaining({
          ...metadata,
          cid: expect.stringContaining('bafy'),
          width: undefined,
          height: undefined,
        })
      )
    })
    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(
        3,
        StorageEvents.DOWNLOAD_PROGRESS,
        expect.objectContaining({
          cid: expect.stringContaining('bafy'),
          downloadState: DownloadState.Hosted,
          downloadProgress: undefined,
        })
      )
    })
    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(
        4,
        StorageEvents.MESSAGE_MEDIA_UPDATED,
        expect.objectContaining({
          ...metadata,
          cid: expect.stringContaining('bafy'),
          width: undefined,
          height: undefined,
        })
      )
    })

    await ipfsFileManagerService.stop()
    logger.time('Stopping ipfs')
    await ipfsService.ipfsInstance?.stop()
    logger.timeEnd('Stopping ipfs')
    await libp2pService.close()

    // The jest test doesn't exit cleanly because of some asynchronous actions need time to complete, I can't find what is it.
    // await sleep(10_000)
  }, 1000000) // IPFS needs around 5 minutes to write 2.1GB file
})
