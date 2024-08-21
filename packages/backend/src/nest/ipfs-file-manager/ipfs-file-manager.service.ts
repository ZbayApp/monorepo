import { Inject, Injectable } from '@nestjs/common'
import { EventEmitter, setMaxListeners } from 'events'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import PQueue, { AbortError } from 'p-queue'
import { decode, PBNode } from '@ipld/dag-pb'
import * as base58 from 'multiformats/bases/base58'
import { type Helia } from 'helia'
import { unixfs, type UnixFS } from '@helia/unixfs'
import { promisify } from 'util'
import sizeOf from 'image-size'
import { CID } from 'multiformats/cid'
import { DownloadProgress, DownloadState, DownloadStatus, FileMetadata, imagesExtensions } from '@quiet/types'
import { QUIET_DIR } from '../const'
import { FilesData, IpfsFilesManagerEvents } from './ipfs-file-manager.types'
import { StorageEvents } from '../storage/storage.types'
import {
  QUEUE_CONCURRENCY,
  MAX_EVENT_LISTENERS,
  TRANSFER_SPEED_SPAN,
  UPDATE_STATUS_INTERVAL,
  BLOCK_FETCH_TIMEOUT,
} from './ipfs-file-manager.const'
import { LazyModuleLoader } from '@nestjs/core'
import { sleep } from '../common/sleep'
const sizeOfPromisified = promisify(sizeOf)
const { createPaths, compare } = await import('../common/utils')
import { createLogger } from '../common/logger'

@Injectable()
export class IpfsFileManagerService extends EventEmitter {
  public ipfs: Helia
  public fs: UnixFS
  public controllers: Map<
    string,
    {
      controller: AbortController
    }
  > = new Map()

  public cancelledDownloads: Set<string> = new Set()
  public queue: PQueue
  public files: Map<string, FilesData> = new Map()
  private readonly logger = createLogger(IpfsFileManagerService.name)
  constructor(
    @Inject(QUIET_DIR) public readonly quietDir: string,
    private readonly lazyModuleLoader: LazyModuleLoader
  ) {
    super()

    this.queue = new PQueue({ concurrency: QUEUE_CONCURRENCY })
    this.attachIncomingEvents()
  }

  public async init() {
    const { IpfsModule } = await import('../ipfs/ipfs.module')
    const moduleRef = await this.lazyModuleLoader.load(() => IpfsModule)
    const { IpfsService } = await import('../ipfs/ipfs.service')
    const ipfsService = moduleRef.get(IpfsService)

    const ipfsInstance = ipfsService?.ipfsInstance
    if (!ipfsInstance) {
      this.logger.error('no ipfs instance')
      throw new Error('no ipfs instance')
    }
    this.ipfs = ipfsInstance
    this.fs = unixfs(this.ipfs)
  }

  private attachIncomingEvents() {
    this.on(IpfsFilesManagerEvents.UPLOAD_FILE, async (fileMetadata: FileMetadata) => {
      await this.uploadFile(fileMetadata)
    })
    this.on(IpfsFilesManagerEvents.DOWNLOAD_FILE, async (fileMetadata: FileMetadata) => {
      this.logger.info('Downloading file:', fileMetadata.cid, fileMetadata.size)
      if (this.files.get(fileMetadata.cid)) return
      this.files.set(fileMetadata.cid, {
        size: fileMetadata.size || 0,
        downloadedBytes: 0,
        transferSpeed: 0,
        cid: fileMetadata.cid,
        message: fileMetadata.message,
      })
      await this.downloadBlocks(fileMetadata)
    })
    this.on(IpfsFilesManagerEvents.CANCEL_DOWNLOAD, async mid => {
      const fileDownloaded = Array.from(this.files.values()).find(e => e.message.id === mid)
      if (fileDownloaded) {
        await this.cancelDownload(fileDownloaded.cid)
      } else {
        this.logger.error(`downloading ${mid} has already been canceled or never started`)
      }
    })
  }

  public async deleteBlocks(fileMetadata: FileMetadata) {
    const localBlocks = await this.getLocalBlocks()
    const hasBlockBeenDownloaded = localBlocks.includes(`z${fileMetadata.cid.toString()}`)
    if (!hasBlockBeenDownloaded) return

    try {
      const cid = CID.parse(fileMetadata.cid)
      const result = this.ipfs.pins.rm(cid)
    } catch (e) {
      this.logger.error('file removing error', e)
    }

    await this.ipfs.gc()
  }

  public async stop() {
    this.logger.info('Stopping IpfsFileManagerService')
    for await (const cid of this.files.keys()) {
      await this.cancelDownload(cid)
    }
  }

  /**
   * Copy file to a different directory and return the new path
   */
  public copyFile(originalFilePath: string, filename: string): string {
    const uploadsDir = path.join(this.quietDir, 'uploads')
    let newFilename: string
    try {
      newFilename = decodeURIComponent(filename).replace(/\s/g, '')
    } catch (e) {
      this.logger.error(`Could not decode filename ${filename}`, e)
      newFilename = filename
    }

    const newPath = path.join(uploadsDir, newFilename)
    let filePath = originalFilePath
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }
      fs.copyFileSync(originalFilePath, newPath)
      filePath = newPath
    } catch (e) {
      this.logger.error(`Couldn't copy file ${originalFilePath} to ${newPath}.`, e)
    }
    return filePath
  }

  public deleteFile(filePath: string) {
    try {
      if (fs.existsSync(filePath)) {
        this.logger.info(`Removing file ${filePath}`)
        fs.unlinkSync(filePath)
      }
    } catch (e) {
      this.logger.error(`Could not remove file ${filePath}`, e)
    }
  }

  public async uploadFile(metadata: FileMetadata) {
    let width: number | undefined
    let height: number | undefined
    if (!metadata.path) {
      throw new Error(`File metadata (cid ${metadata.cid}) does not contain path`)
    }
    if (imagesExtensions.includes(metadata.ext)) {
      let imageSize: { width: number | undefined; height: number | undefined } | undefined // ISizeCalculationResult
      try {
        imageSize = await sizeOfPromisified(metadata.path)
      } catch (e) {
        this.logger.error(`Couldn't get image dimensions (${metadata.path})`, e)
        throw new Error(`Couldn't get image dimensions (${metadata.path}). Error: ${e.message}`)
      }
      width = imageSize?.width
      height = imageSize?.height
    }

    const stream = fs.createReadStream(metadata.path, { highWaterMark: 64 * 1024 * 10 })
    const uploadedFileStreamIterable = {
      // eslint-disable-next-line prettier/prettier, generator-star-spacing
      async *[Symbol.asyncIterator]() {
        for await (const data of stream) {
          yield data
        }
      },
    }

    // Create directory for file
    const dirname = 'uploads'
    await this.fs.addDirectory({ path: `/${dirname}` })

    // Write file to IPFS
    const uuid = `${Date.now()}_${Math.random().toString(36).substr(2.9)}`
    const filename = `${uuid}_${metadata.name}${metadata.ext}`

    // Save copy to separate directory
    const filePath = this.copyFile(metadata.path, filename)
    this.logger.time(`Writing ${filename} to ipfs`)
    const newCid = await this.fs.addByteStream(uploadedFileStreamIterable)

    this.logger.timeEnd(`Writing ${filename} to ipfs`)

    this.emit(StorageEvents.REMOVE_DOWNLOAD_STATUS, { cid: metadata.cid })
    const fileMetadata: FileMetadata = {
      ...metadata,
      tmpPath: undefined,
      path: filePath,
      cid: newCid.toString(),
      size: newCid.byteLength,
      width,
      height,
    }

    this.emit(StorageEvents.FILE_UPLOADED, fileMetadata)

    if (metadata.tmpPath) {
      this.deleteFile(metadata.tmpPath)
    }

    const statusReady: DownloadStatus = {
      mid: fileMetadata.message.id,
      cid: fileMetadata.cid,
      downloadState: DownloadState.Hosted,
      downloadProgress: undefined,
    }

    this.emit(StorageEvents.DOWNLOAD_PROGRESS, statusReady)

    if (metadata.path !== filePath) {
      this.emit(StorageEvents.MESSAGE_MEDIA_UPDATED, fileMetadata)
    }
  }

  private async cancelDownload(cid: string) {
    const queueController = this.controllers.get(cid)
    const downloadInProgress = this.files.get(cid)
    if (!downloadInProgress) return
    // In case download is cancelled right after start and queue is not yet initialized.
    if (!queueController) {
      await sleep(1000)
      await this.cancelDownload(cid)
    } else {
      const controller = queueController.controller
      this.cancelledDownloads.add(cid)
      controller.abort()
    }
  }

  private async getLocalBlocks(): Promise<string[]> {
    const blocks: string[] = []

    // FIXME: https://github.com/ipfs/helia/discussions/499
    // @ts-ignore
    const refs = this.ipfs.refs.local()

    for await (const ref of refs) {
      const cid = CID.parse(ref.ref)
      const base58Encoded = base58.base58btc.encode(cid.multihash.bytes)
      blocks.push(base58Encoded.toString())
    }
    return blocks
  }

  public async downloadBlocks(fileMetadata: FileMetadata) {
    const block = CID.parse(fileMetadata.cid)
    const localBlocks = await this.getLocalBlocks()
    const processedBlocks: PBNode[] = [] // TODO: Should it be CID or PBNode?
    const controller = new AbortController()

    setMaxListeners(MAX_EVENT_LISTENERS, controller.signal)

    this.controllers.set(fileMetadata.cid, { controller })

    // Add try catch and return downloadBlocks with timeout
    const stat = await this.fs.stat(block)
    // FIXME: compare should accept bigint
    // @ts-ignore
    if (fileMetadata.size && !compare(fileMetadata.size, stat.fileSize, 0.05)) {
      await this.updateStatus(fileMetadata.cid, DownloadState.Malicious)
      return
    }

    const addToQueue = async (link: CID) => {
      try {
        await this.queue.add(async () => {
          try {
            await processBlock(link, controller.signal)
          } catch (e) {
            if (!(e instanceof AbortError)) {
              this.logger.error('Failed to process block. Re-adding to queue', link.toString())
              void addToQueue(link)
            }
          }
        })
      } catch (e) {
        this.logger.error(e)
      }
    }

    interface BlockStat {
      fetchTime: number
      byteLength: number
    }

    // Transfer speed
    const blocksStats: BlockStat[] = []

    const updateTransferSpeed = setInterval(async () => {
      const bytesDownloaded = blocksStats.reduce((previousValue, currentValue) => {
        if (Math.floor(Date.now() / 1000) - currentValue.fetchTime < TRANSFER_SPEED_SPAN)
          return previousValue + currentValue.byteLength
        return 0
      }, 0)
      const uniqueProcessedBlocks = [...new Set(processedBlocks)]
      const totalBytesDownloaded = uniqueProcessedBlocks.reduce((prev, curr) => {
        if (curr.Data) {
          return prev + curr.Data.byteLength
        } else {
          return prev
        }
      }, 0)
      const transferSpeed = bytesDownloaded === 0 ? 0 : bytesDownloaded / TRANSFER_SPEED_SPAN
      const fileState = this.files.get(fileMetadata.cid)
      if (!fileState) {
        this.logger.error(`No saved data for file cid ${fileMetadata.cid}`)
        return
      }
      this.files.set(fileMetadata.cid, {
        ...fileState,
        transferSpeed: transferSpeed,
        downloadedBytes: totalBytesDownloaded,
      })
      await this.updateStatus(fileMetadata.cid)
    }, UPDATE_STATUS_INTERVAL * 1000)

    const remainingBlocks = new Set()
    remainingBlocks.add(block)

    const downloadCompletedOrCanceled = new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (remainingBlocks.size === 0) {
          clearInterval(interval)
          resolve('No more blocks to fetch, download is completed or canceled')
        }
      }, 1000)
    })

    const processBlock = async (block: CID, signal: AbortSignal) => {
      // eslint-disable-next-line
      return await new Promise(async (resolve, reject) => {
        const onAbort = () => {
          remainingBlocks.delete(block)
          reject(new AbortError('download cancelation'))
        }

        if (signal.aborted) onAbort()
        signal.addEventListener('abort', onAbort, { once: true })

        // @ts-ignore FIXME
        if (processedBlocks.includes(block)) {
          remainingBlocks.delete(block)
          resolve(block)
          return
        }

        const hasBlockBeenDownloaded = localBlocks.includes(`z${block.toString()}`)

        let fetchedBlock

        try {
          fetchedBlock = await this.ipfs.blockstore.get(block)
        } catch (e) {
          this.logger.error('Failed to fetch block', block.toString(), e)
          signal.removeEventListener('abort', onAbort)
          reject(new Error("couldn't fetch block"))
          return
        }

        const decodedBlock: PBNode = decode(fetchedBlock)

        const fileState = this.files.get(fileMetadata.cid)

        if (!fileState) {
          reject(new Error('Downloading has been cancelled'))
          return
        }

        processedBlocks.push(decodedBlock)

        if (!hasBlockBeenDownloaded) {
          blocksStats.push({
            fetchTime: Math.floor(Date.now() / 1000),
            byteLength: decodedBlock.Data?.byteLength || 0,
          })
        }

        for (const link of decodedBlock.Links) {
          // @ts-ignore
          void addToQueue(link.Hash)
          remainingBlocks.add(link.Hash)
        }

        signal.removeEventListener('abort', onAbort)
        remainingBlocks.delete(block)
        resolve(fetchedBlock)
      })
    }

    void addToQueue(block)

    await downloadCompletedOrCanceled

    clearInterval(updateTransferSpeed)

    const fileState = this.files.get(fileMetadata.cid)
    if (!fileState) {
      this.logger.error(`No saved data for file cid ${fileMetadata.cid}`)
      return
    }

    if (this.cancelledDownloads.has(fileMetadata.cid)) {
      this.files.set(fileMetadata.cid, {
        ...fileState,
        downloadedBytes: 0,
        transferSpeed: 0,
      })
      this.cancelledDownloads.delete(fileMetadata.cid)
      this.controllers.delete(fileMetadata.cid)
      await this.updateStatus(fileMetadata.cid, DownloadState.Canceled)
      this.files.delete(fileMetadata.cid)
    } else {
      this.files.set(fileMetadata.cid, {
        ...fileState,
        transferSpeed: 0,
      })
      this.ipfs.pins.add(block)
      await this.assemblyFile(fileMetadata)
    }
  }

  private async assemblyFile(fileMetadata: FileMetadata) {
    const _CID = CID.parse(fileMetadata.cid)

    const downloadDirectory = path.join(this.quietDir, 'downloads')
    createPaths([downloadDirectory])

    // As a quick fix, using a UUID for filename ensures that we never
    // save a file with a malicious filename. Perhaps it's also
    // possible to use the CID, however let's verify that first.
    let fileName: string
    let filePath: string
    do {
      fileName = crypto.randomUUID()
      filePath = `${path.join(downloadDirectory, fileName)}`
    } while (fs.existsSync(filePath))

    const writeStream = fs.createWriteStream(filePath, { flags: 'wx' })
    
    const entries = this.fs.cat(_CID)

    for await (const entry of entries) {
      await new Promise<void>((resolve, reject) => {
        writeStream.write(entry, err => {
          if (err) {
            this.logger.error(`${fileMetadata.name} writing to file error`, err)
            reject(err)
          }
        })
        resolve()
      })
    }

    writeStream.end()

    await this.updateStatus(fileMetadata.cid, DownloadState.Completed)
    this.files.delete(fileMetadata.cid)
    this.controllers.delete(fileMetadata.cid)

    const messageMedia: FileMetadata = {
      ...fileMetadata,
      path: filePath,
    }

    this.emit(IpfsFilesManagerEvents.MESSAGE_MEDIA_UPDATED, messageMedia)
  }

  private async updateStatus(cid: string, downloadState = DownloadState.Downloading) {
    const metadata = this.files.get(cid)
    if (!metadata) {
      // TODO: emit error?
      return
    }
    const progress: DownloadProgress | undefined =
      downloadState !== DownloadState.Malicious
        ? {
            size: metadata.size,
            downloaded: metadata.downloadedBytes,
            transferSpeed: metadata.transferSpeed,
          }
        : undefined

    const status: DownloadStatus = {
      mid: metadata.message.id,
      cid: metadata.cid,
      downloadState: downloadState,
      downloadProgress: progress,
    }

    this.emit(IpfsFilesManagerEvents.DOWNLOAD_PROGRESS, status)
  }
}
