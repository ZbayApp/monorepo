import { jest } from '@jest/globals'

import { Test, TestingModule } from '@nestjs/testing'
import { FileMetadata } from '@quiet/types'
import path from 'path'
import fs from 'fs'
import { DirResult } from 'tmp'
import { fileURLToPath } from 'url'
import waitForExpect from 'wait-for-expect'
import { TestModule } from '../common/test.module'
import { createTmpDir, libp2pInstanceParams } from '../common/utils'
import { IpfsModule } from '../ipfs/ipfs.module'
import { IpfsService } from '../ipfs/ipfs.service'
import { Libp2pModule } from '../libp2p/libp2p.module'
import { Libp2pService } from '../libp2p/libp2p.service'
import { SocketModule } from '../socket/socket.module'
import { StorageEvents } from '../storage/storage.types'
import { IpfsFileManagerModule } from './ipfs-file-manager.module'
import { IpfsFileManagerService } from './ipfs-file-manager.service'
import { IpfsFilesManagerEvents } from './ipfs-file-manager.types'
import { sleep } from '../common/sleep'
import { LocalDbModule } from '../local-db/local-db.module'
import { LocalDbService } from '../local-db/local-db.service'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

describe('IpfsFileManagerService', () => {
  let module: TestingModule
  let ipfsFileManagerService: IpfsFileManagerService
  let localDbService: LocalDbService
  let ipfsService: IpfsService
  let libp2pService: Libp2pService

  let tmpDir: DirResult
  let filePath: string

  beforeEach(async () => {
    tmpDir = createTmpDir()
    // tmpAppDataPath = tmpQuietDirPath(tmpDir.name)
    filePath = path.join(dirname, '/testUtils/500kB-file.txt')

    module = await Test.createTestingModule({
      imports: [TestModule, IpfsFileManagerModule, IpfsModule, SocketModule, Libp2pModule, LocalDbModule],
    }).compile()

    ipfsFileManagerService = await module.resolve(IpfsFileManagerService)
    localDbService = await module.resolve(LocalDbService)

    libp2pService = await module.resolve(Libp2pService)
    const params = await libp2pInstanceParams()
    await libp2pService.createInstance(params)
    expect(libp2pService.libp2pInstance).not.toBeNull()

    ipfsService = await module.resolve(IpfsService)
    await ipfsService.createInstance()
    expect(ipfsService.ipfsInstance).not.toBeNull()

    await ipfsFileManagerService.init()

    if (localDbService.getStatus() === 'closed') {
      await localDbService.open()
    }
  })

  afterEach(async () => {
    tmpDir.removeCallback()
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath)
    }
    await libp2pService.libp2pInstance?.stop()
    await ipfsService.ipfsInstance?.stop()
    await module.close()
    sleep(1000)
  })

  afterAll(async () => {
    tmpDir.removeCallback()
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath)
    }
    await libp2pService.close()
    await ipfsService.stop()
    await ipfsFileManagerService.stop()
    await localDbService.close()
    await module.close()
    sleep(10000)
  })

  it('uploads image', async () => {
    // Uploading
    const eventSpy = jest.spyOn(ipfsFileManagerService, 'emit')
    const copyFileSpy = jest.spyOn(ipfsFileManagerService, 'copyFile')
    const metadata: FileMetadata = {
      path: path.join(dirname, '/testUtils/test-image.png'),
      name: 'test-image',
      ext: '.png',
      cid: 'uploading_id',
      message: {
        id: 'id',
        channelId: 'channelId',
      },
    }

    await ipfsFileManagerService.uploadFile(metadata)
    expect(copyFileSpy).toHaveBeenCalled()
    const newFilePath = copyFileSpy.mock.results[0].value as string
    metadata.path = newFilePath

    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(1, StorageEvents.REMOVE_DOWNLOAD_STATUS, { cid: 'uploading_id' })
    })
    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(
        2,
        StorageEvents.FILE_UPLOADED,
        expect.objectContaining({
          cid: expect.stringContaining('bafk'),
          ext: '.png',
          height: 44,
          message: { channelId: 'channelId', id: 'id' },
          name: 'test-image',
          size: 15847,
          width: 824,
        })
      )
    })
    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(3, StorageEvents.DOWNLOAD_PROGRESS, {
        cid: expect.stringContaining('bafk'),
        downloadProgress: undefined,
        downloadState: 'hosted',
        mid: 'id',
      })
    })
  })

  it('uploads file other than image', async () => {
    // Uploading
    const eventSpy = jest.spyOn(ipfsFileManagerService, 'emit')

    const metadata: FileMetadata = {
      path: path.join(dirname, '/testUtils/test-file.pdf'),
      name: 'test-file',
      ext: '.pdf',
      cid: 'uploading_id',
      message: {
        id: 'id',
        channelId: 'channelId',
      },
    }

    await ipfsFileManagerService.uploadFile(metadata)
    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(1, StorageEvents.REMOVE_DOWNLOAD_STATUS, { cid: 'uploading_id' })
    })
    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(
        2,
        StorageEvents.FILE_UPLOADED,
        expect.objectContaining({
          cid: expect.stringContaining('bafk'),
          ext: '.pdf',
          height: undefined,
          message: { channelId: 'channelId', id: 'id' },
          name: 'test-file',
          size: 761797,
          width: undefined,
        })
      )
    })
    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(3, StorageEvents.DOWNLOAD_PROGRESS, {
        cid: expect.stringContaining('bafk'),
        downloadProgress: undefined,
        downloadState: 'hosted',
        mid: 'id',
      })
    })
    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(
        4,
        StorageEvents.MESSAGE_MEDIA_UPDATED,
        expect.objectContaining({
          cid: expect.stringContaining('bafk'),
          ext: '.pdf',
          height: undefined,
          message: { channelId: 'channelId', id: 'id' },
          name: 'test-file',
          size: 761797,
          width: undefined,
        })
      )
    })
  })

  it('removes temporary file', async () => {
    // Create tmp file
    const tmpFilePath = path.join(tmpDir.name, '/tmp-test-image.png')
    fs.copyFileSync(path.join(dirname, '/testUtils/test-image.png'), tmpFilePath)
    expect(fs.existsSync(tmpFilePath)).toBeTruthy()
    // Uploading
    const eventSpy = jest.spyOn(ipfsFileManagerService, 'emit')
    const copyFileSpy = jest.spyOn(ipfsFileManagerService, 'copyFile')
    const deleteFileSpy = jest.spyOn(ipfsFileManagerService, 'deleteFile')
    const metadata: FileMetadata = {
      path: path.join(dirname, '/testUtils/test-image.png'),
      tmpPath: tmpFilePath,
      name: 'test-image',
      ext: '.png',
      cid: 'uploading_id',
      message: {
        id: 'id',
        channelId: 'channelId',
      },
    }

    await ipfsFileManagerService.uploadFile(metadata)
    expect(copyFileSpy).toHaveBeenCalled()
    expect(deleteFileSpy).toHaveBeenCalled()
    const newFilePath = copyFileSpy.mock.results[0].value as string
    metadata.path = newFilePath

    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(1, StorageEvents.REMOVE_DOWNLOAD_STATUS, { cid: 'uploading_id' })
    })
    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(
        2,
        StorageEvents.FILE_UPLOADED,
        expect.objectContaining({
          cid: expect.stringContaining('bafk'),
          ext: '.png',
          height: 44,
          message: { channelId: 'channelId', id: 'id' },
          name: 'test-image',
          size: 15847,
          width: 824,
          tmpPath: undefined,
        })
      )
    })
    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(3, StorageEvents.DOWNLOAD_PROGRESS, {
        cid: expect.stringContaining('bafk'),
        downloadProgress: undefined,
        downloadState: 'hosted',
        mid: 'id',
      })
    })
    expect(fs.existsSync(tmpFilePath)).toBeFalsy()
  })

  it("throws error if file doesn't exists", async () => {
    // Uploading
    const eventSpy = jest.spyOn(ipfsFileManagerService, 'emit')

    const metadata: FileMetadata = {
      path: path.join(dirname, '/testUtils/non-existent.png'),
      name: 'test-image',
      ext: '.png',
      cid: 'uploading_id',
      message: {
        id: 'id',
        channelId: 'channelId',
      },
    }

    await waitForExpect(async () => {
      await expect(ipfsFileManagerService.uploadFile(metadata)).rejects.toThrow()
    })
    await waitForExpect(() => {
      expect(eventSpy).not.toHaveBeenCalled()
    })
  })

  it('throws error if reported file size is malicious', async () => {
    // Uploading
    const eventSpy = jest.spyOn(ipfsFileManagerService, 'emit')

    const metadata: FileMetadata = {
      path: path.join(dirname, '/testUtils/test-file.pdf'),
      name: 'test-file',
      ext: '.pdf',
      cid: 'uploading_id',
      message: {
        id: 'id',
        channelId: 'channelId',
      },
    }

    await ipfsFileManagerService.uploadFile(metadata)
    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(1, StorageEvents.REMOVE_DOWNLOAD_STATUS, { cid: 'uploading_id' })
    })
    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(
        2,
        StorageEvents.FILE_UPLOADED,
        expect.objectContaining({
          cid: expect.stringContaining('bafk'),
          ext: '.pdf',
          height: undefined,
          message: { channelId: 'channelId', id: 'id' },
          name: 'test-file',
          size: 761797,
          width: undefined,
        })
      )
    })
    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(3, StorageEvents.DOWNLOAD_PROGRESS, {
        cid: expect.stringContaining('bafk'),
        downloadProgress: undefined,
        downloadState: 'hosted',
        mid: 'id',
      })
    })
    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(
        4,
        StorageEvents.MESSAGE_MEDIA_UPDATED,
        expect.objectContaining({
          cid: expect.stringContaining('bafk'),
          ext: '.pdf',
          height: undefined,
          message: { channelId: 'channelId', id: 'id' },
          name: 'test-file',
          size: 761797,
          width: undefined,
        })
      )
    })

    // Downloading

    const uploadMetadata: any = eventSpy.mock.calls[1][1]

    ipfsFileManagerService.emit(IpfsFilesManagerEvents.DOWNLOAD_FILE, {
      ...uploadMetadata,
      size: 20400,
    })

    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(5, IpfsFilesManagerEvents.DOWNLOAD_FILE, {
        ...uploadMetadata,
        size: 20400,
      })
    })

    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(6, StorageEvents.DOWNLOAD_PROGRESS, {
        cid: expect.stringContaining('bafk'),
        downloadProgress: undefined,
        downloadState: 'malicious',
        mid: 'id',
      })
    }, 20000)

    expect(eventSpy).toBeCalledTimes(6)
  })

  it('file uploaded to IPFS then can be downloaded', async () => {
    // Uploading
    const eventSpy = jest.spyOn(ipfsFileManagerService, 'emit')

    const metadata: FileMetadata = {
      path: path.join(dirname, '/testUtils/test-image.png'),
      name: 'test-image',
      ext: '.png',
      cid: 'uploading_id',
      message: {
        id: 'id',
        channelId: 'channelId',
      },
    }

    const imageCid = 'bafkreigemnq7fljgbxdqjhq5nhj5pprt4qkvyl7vcymbnucc5azkxms4v4'

    await ipfsFileManagerService.uploadFile(metadata)
    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(1, StorageEvents.REMOVE_DOWNLOAD_STATUS, { cid: 'uploading_id' })
    }, 5_000)

    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(
        2,
        StorageEvents.FILE_UPLOADED,
        expect.objectContaining({
          cid: imageCid,
          ext: '.png',
          height: 44,
          message: { channelId: 'channelId', id: 'id' },
          name: 'test-image',
          size: 15847,
          width: 824,
        })
      )
    }, 10_000)

    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(3, StorageEvents.DOWNLOAD_PROGRESS, {
        cid: imageCid,
        downloadProgress: undefined,
        downloadState: 'hosted',
        mid: 'id',
      })
    }, 10_000)

    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(
        4,
        StorageEvents.MESSAGE_MEDIA_UPDATED,
        expect.objectContaining({
          cid: imageCid,
          ext: '.png',
          height: 44,
          message: { channelId: 'channelId', id: 'id' },
          name: 'test-image',
          size: 15847,
          width: 824,
          path: expect.stringContaining('_test-image.png'),
        })
      )
    }, 10_000)

    // Downloading

    const uploadMetadata = eventSpy.mock.calls[1][1]

    ipfsFileManagerService.emit(IpfsFilesManagerEvents.DOWNLOAD_FILE, uploadMetadata)

    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(5, IpfsFilesManagerEvents.DOWNLOAD_FILE, uploadMetadata)
    }, 10_000)

    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(
        6,
        StorageEvents.MESSAGE_MEDIA_UPDATED,
        expect.objectContaining({
          cid: expect.stringContaining('bafk'),
          ext: '.png',
          height: 44,
          message: { channelId: 'channelId', id: 'id' },
          name: 'test-image',
          size: 15847,
          width: 824,
          path: expect.stringContaining('.png'),
        })
      )
    }, 20_000)

    await waitForExpect(() => {
      expect(eventSpy).toHaveBeenNthCalledWith(7, StorageEvents.DOWNLOAD_PROGRESS, {
        cid: expect.stringContaining('bafk'),
        downloadProgress: { downloaded: 15847, size: 15847, transferSpeed: 0 },
        downloadState: 'completed',
        mid: 'id',
      })
    }, 20_000)

    expect(eventSpy).toBeCalledTimes(7)
  })

  // this case causes other tests to fail
  it.skip('downloaded file matches uploaded file', async () => {
    // Uploading
    const eventSpy = jest.spyOn(ipfsFileManagerService, 'emit')
    const filePath = path.join(dirname, '/testUtils/test-image.png')
    const metadata: FileMetadata = {
      path: filePath,
      name: 'test-image',
      ext: '.png',
      cid: 'uploading_id',
      message: {
        id: 'id',
        channelId: 'channelId',
      },
    }

    await ipfsFileManagerService.uploadFile(metadata)

    const uploadMetadata = eventSpy.mock.calls[1][1]

    ipfsFileManagerService.emit(IpfsFilesManagerEvents.DOWNLOAD_FILE, uploadMetadata)

    const downloadMetadata = eventSpy.mock.calls[3][1]

    const uploadFileBuffer = fs.readFileSync(filePath)
    // @ts-ignore
    const downloadFileBuffer = fs.readFileSync(downloadMetadata.path)

    await waitForExpect(() => {
      expect(uploadFileBuffer).toStrictEqual(downloadFileBuffer)
    })
  })

  it('copies file and returns a new path', async () => {
    const originalPath = path.join(dirname, '/testUtils/test-image.png')
    const newPath = ipfsFileManagerService.copyFile(originalPath, '12345_test-image.png')
    expect(fs.existsSync(newPath)).toBeTruthy()
    expect(originalPath).not.toEqual(newPath)
  })

  it('tries to copy files, returns original path on error', async () => {
    const originalPath = path.join(dirname, '/testUtils/test-image-non-existing.png')
    const newPath = ipfsFileManagerService.copyFile(originalPath, '12345_test-image.png')
    expect(originalPath).toEqual(newPath)
  })

  it('copies file with filename containing whitespace but removes whitespace in the new path', () => {
    const newFilePath = ipfsFileManagerService.copyFile(
      path.join(dirname, '/testUtils/test-image.png'),
      'test ima ge.png'
    )
    expect(newFilePath).toEqual(path.join(ipfsFileManagerService.quietDir, 'uploads', 'testimage.png'))
  })

  it('copies file with encoded filename containing whitespace but removes whitespace in the new path', () => {
    const newFilePath = ipfsFileManagerService.copyFile(
      path.join(dirname, '/testUtils/test-image.png'),
      'Screenshot_%20with%20whitespace%2020230721-004943.png'
    )
    expect(newFilePath).toEqual(
      path.join(ipfsFileManagerService.quietDir, 'uploads', 'Screenshot_withwhitespace20230721-004943.png')
    )
  })

  // it.skip('downloaded file chunk returns proper transferSpeed when no delay between entries', async () => {
  //   const fileSize = 52428800 // 50MB
  //   createFile(filePath, fileSize)

  //   const mockDateNow = jest.fn<() => number>()

  //   global.Date.now = mockDateNow
  //   mockDateNow.mockReturnValue(new Date('2022-04-07T10:20:30Z') as unknown as number)

  //   ipfsInstance = await create()

  //   fileManager = new IpfsFilesManager(ipfsInstance, tmpAppDataPath)

  //   // Uploading
  //   const eventSpy = jest.spyOn(fileManager, 'emit')

  //   const metadata: FileMetadata = {
  //     path: filePath,
  //     name: 'new-file',
  //     ext: '.txt',
  //     cid: 'uploading_id',
  //     message: {
  //       id: 'id',
  //       channelId: 'channelId',
  //     },
  //   }

  //   await fileManager.uploadFile(metadata)

  //   // Downloading
  //   const uploadMetadata: FileMetadata = eventSpy.mock.calls[1][1]

  //   fileManager.emit(IpfsFilesManagerEvents.DOWNLOAD_FILE, uploadMetadata)

  //   const transferSpeeds: number[] = []

  //   eventSpy.mock.calls.map(call => {
  //     if (call[0] === StorageEvents.DOWNLOAD_PROGRESS) {
  //       // @ts-ignore
  //       transferSpeeds.push(call[1].downloadProgress?.transferSpeed)
  //     }
  //   })
  //   const unwantedValues = [undefined, null, Infinity]
  //   for (const value of unwantedValues) {
  //     await waitForExpect(() => {
  //       expect(transferSpeeds).not.toContain(value)
  //     })
  //   }
  // })
})
