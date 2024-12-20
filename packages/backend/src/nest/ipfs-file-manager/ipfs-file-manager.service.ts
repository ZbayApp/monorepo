import { Inject, Injectable } from '@nestjs/common'
import { EventEmitter, setMaxListeners } from 'events'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { GetBlockProgressEvents, type Helia } from 'helia'
import { AddEvents, CatOptions, GetEvents, unixfs, type UnixFS } from '@helia/unixfs'
import { promisify } from 'util'
import sizeOf from 'image-size'
import { CID } from 'multiformats/cid'
import { DownloadProgress, DownloadState, DownloadStatus, FileMetadata, imagesExtensions } from '@quiet/types'
import { QUIET_DIR } from '../const'
import { FilesData, IpfsFilesManagerEvents } from './ipfs-file-manager.types'
import { StorageEvents, UnixFSEvents } from '../storage/storage.types'
import { MAX_EVENT_LISTENERS, TRANSFER_SPEED_SPAN, UPDATE_STATUS_INTERVAL } from './ipfs-file-manager.const'
import { sleep } from '../common/sleep'
const sizeOfPromisified = promisify(sizeOf)
const { createPaths, compare } = await import('../common/utils')
import { createLogger } from '../common/logger'
import { IpfsService } from '../ipfs/ipfs.service'
import { CustomProgressEvent } from 'progress-events'

// 1048576 is the number of bytes in a block uploaded via unixfs
// Reference: packages/backend/node_modules/@helia/unixfs/src/commands/add.ts
const DEFAULT_CAT_BLOCK_CHUNK_SIZE = 1048576 * 10

@Injectable()
export class IpfsFileManagerService extends EventEmitter {
  public ipfs: Helia
  public ufs: UnixFS
  public controllers: Map<
    string,
    {
      controller: AbortController
    }
  > = new Map()

  public cancelledDownloads: Set<string> = new Set()
  public files: Map<string, FilesData> = new Map()
  private readonly logger = createLogger(IpfsFileManagerService.name)
  constructor(
    @Inject(QUIET_DIR) public readonly quietDir: string,
    private readonly ipfsService: IpfsService
  ) {
    super()

    this.attachIncomingEvents()
  }

  public async init() {
    const ipfsInstance = this.ipfsService?.ipfsInstance

    if (!ipfsInstance) {
      this.logger.error('no ipfs instance')
      throw new Error('no ipfs instance')
    }
    this.ipfs = ipfsInstance
    this.ufs = unixfs(this.ipfs)
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
      await this.downloadFile(fileMetadata)
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
    const _logger = createLogger(`${IpfsFileManagerService.name}:delete:${fileMetadata.cid}`)
    const cid = CID.parse(fileMetadata.cid)
    const hasBlockBeenDownloaded = await this.ipfs.blockstore.has(cid)
    if (!hasBlockBeenDownloaded) {
      _logger.warn(`File wasn't downloaded, can't delete`)
      return
    }

    try {
      _logger.info(`Unpinning all blocks for file`)
      for await (const pinnedCid of this.ipfs.pins.rm(cid)) {
        _logger.debug(`Unpinning ${pinnedCid.toString()}`)
      }
      _logger.info('Unpinning complete')
    } catch (e) {
      this.logger.error('File removing error', e)
    }

    _logger.info(`Removing unpinned blocks`)
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
    const _logger = createLogger(`${IpfsFileManagerService.name}:upload`)
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
        _logger.error(`Couldn't get image dimensions (${metadata.path})`, e)
        throw new Error(`Couldn't get image dimensions (${metadata.path}). Error: ${e.message}`)
      }
      width = imageSize?.width
      height = imageSize?.height
    }

    // Create directory for file
    const dir = `/uploads`
    await this.ufs.addDirectory({ path: dir })

    // Write file to IPFS
    const randomBytes = crypto.randomBytes(16).toString('hex')
    const uuid = `${Date.now()}_${randomBytes}`
    const filename = `${uuid}_${metadata.name}${metadata.ext}`

    // Save copy to separate directory
    const filePath = this.copyFile(metadata.path, filename)
    _logger.time(`Writing ${filename} to ipfs`)

    const handleUploadProgressEvents = (event: AddEvents): void => {
      _logger.info(`Upload progress`, event)
    }

    const stream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 * 10 })
    const uploadedFileStreamIterable = {
      // eslint-disable-next-line prettier/prettier, generator-star-spacing
      async *[Symbol.asyncIterator]() {
        for await (const data of stream) {
          yield data
        }
      },
    }

    const fileCid = await this.ufs.addByteStream(uploadedFileStreamIterable, {
      wrapWithDirectory: true,
      onProgress: handleUploadProgressEvents,
    })

    _logger.timeEnd(`Writing ${filename} to ipfs`)

    this.emit(StorageEvents.REMOVE_DOWNLOAD_STATUS, { cid: metadata.cid })
    const fileMetadata: FileMetadata = {
      ...metadata,
      tmpPath: undefined,
      path: filePath,
      cid: fileCid.toString(),
      size: Number((await this.ufs.stat(fileCid)).fileSize),
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
    const abortController = this.controllers.get(cid)
    const downloadInProgress = this.files.get(cid)
    if (!downloadInProgress) return
    // In case download is cancelled right after start and queue is not yet initialized.
    if (!abortController) {
      await sleep(1000)
      await this.cancelDownload(cid)
    } else {
      const controller = abortController.controller
      this.cancelledDownloads.add(cid)
      controller.abort()
    }
  }

  public async downloadFile(fileMetadata: FileMetadata) {
    const _logger = createLogger(`${IpfsFileManagerService.name}:download:${fileMetadata.cid.toString()}`)

    const fileCid: CID = CID.parse(fileMetadata.cid)
    const downloadedBlocks: Set<string> = new Set()
    const pendingBlocks: Set<string> = new Set()
    const controller = new AbortController()

    setMaxListeners(MAX_EVENT_LISTENERS, controller.signal)

    this.controllers.set(fileMetadata.cid, { controller })

    // Add try catch and return downloadBlocks with timeout
    const initialStat = await this.ufs.stat(fileCid)
    const fileSize = initialStat.fileSize
    const localSize = initialStat.localFileSize
    if (fileMetadata.size && !compare(fileMetadata.size, fileSize, 0.05)) {
      _logger.warn(`File was flagged as malicious due to discrepancies in file size`)
      await this.updateStatus(fileMetadata.cid, DownloadState.Malicious)
      return
    }

    this.files.set(fileMetadata.cid, {
      ...this.files.get(fileMetadata.cid)!,
      downloadedBytes: Number(localSize),
    })

    const downloadDirectory = path.join(this.quietDir, 'downloads')
    createPaths([downloadDirectory])

    // As a quick fix, using a UUID for filename ensures that we never
    // save a file with a malicious filename. Perhaps it's also
    // possible to use the CID, however let's verify that first.
    let fileName: string
    let filePath: string
    do {
      fileName = `${crypto.randomUUID()}${fileMetadata.ext}`
      filePath = `${path.join(downloadDirectory, fileName)}`
    } while (fs.existsSync(filePath))

    const writeStream = fs.createWriteStream(filePath, { flags: 'wx' })

    interface BlockStat {
      fetchTime: number
      byteLength: number
    }

    // Transfer speed
    const blocksStats: BlockStat[] = []

    const handleDownloadProgressEvents = async (event: GetEvents | CustomProgressEvent<CID>) => {
      // if we don't have an event type there's nothing useful to do
      if (event.type === null) {
        return
      }

      // handler for events where we have the block stored locally and we are fetching it from the blockstore
      const handleGetBlock = async (cid: CID) => {
        const cidStr = cid.toString()
        const fileCidStr = fileCid.toString()
        if (cidStr === fileCidStr) {
          _logger.info(`Download pending`)
          return
        }

        if (pendingBlocks.has(cidStr)) {
          pendingBlocks.delete(cidStr)
        }

        _logger.info(`Getting block ${cidStr} from local blockstore`)
        if (downloadedBlocks.has(cidStr)) {
          _logger.info(`Already downloaded block ${cidStr}`)
          return
        }

        downloadedBlocks.add(cidStr)
        blocksStats.push({
          fetchTime: Math.floor(Date.now() / 1000),
          byteLength: (await this.ipfs.blockstore.get(cid)).byteLength,
        })
      }

      // handler for events where we are walking the file to get all child blocks
      // NOTE: this happens at the beginning of the download process AND when we have all of the blocks are we are walking through them to get the contents
      const handleWalkFile = async (cid: CID) => {
        const cidStr = cid.toString()
        if (downloadedBlocks.size === 0 && pendingBlocks.size === 0) {
          // this is the first time we've seen this event so it means we are just starting the download process
          _logger.info(`Download started, walking`)
          await this.updateStatus(cidStr, DownloadState.Downloading)
          return
        }

        _logger.info(`Walking ${cidStr}`)
      }

      // handler for events where we have found the block on the network and are adding it to our local blockstore
      const handleDownloadBlock = async (cid: CID) => {
        const cidStr = cid.toString()
        _logger.info(`Block ${cidStr} found and downloaded to local blockstore`)
        if (pendingBlocks.has(cidStr)) {
          pendingBlocks.delete(cidStr)
        }

        if (downloadedBlocks.has(cidStr)) {
          _logger.info(`Already downloaded block ${cidStr}`)
          return
        }

        downloadedBlocks.add(cidStr)
        blocksStats.push({
          fetchTime: Math.floor(Date.now() / 1000),
          byteLength: (await this.ipfs.blockstore.get(cid)).byteLength,
        })
      }

      // handler for events where we are asking for the block on the network because we don't have it stored locally
      const handleWantBlock = async (event: CustomProgressEvent<CID>) => {
        const cidStr = event.detail.toString()
        if (event.type === UnixFSEvents.GET_BLOCK_PROVIDERS) {
          _logger.info(`Checking for presence of block ${cidStr}`)
        } else {
          _logger.info(`Asking peers for block ${cidStr}`)
        }

        pendingBlocks.add(cidStr)
      }

      switch (event.type) {
        case UnixFSEvents.WALK_FILE:
          // this event has a different format for how it stores the CID on the detail
          await handleWalkFile((event as any).detail.cid as CID)
          break
        case UnixFSEvents.GET_BLOCK_PROVIDERS:
        case UnixFSEvents.WANT_BLOCK:
          await handleWantBlock(event as CustomProgressEvent<CID>)
          break
        case UnixFSEvents.GET_BLOCK:
          await handleGetBlock((event as GetBlockProgressEvents).detail)
          break
        case UnixFSEvents.DOWNLOAD_BLOCK:
          await handleDownloadBlock((event as GetBlockProgressEvents).detail)
          break
        default:
          break
      }

      return
    }

    const updateDownloadStatusWithTransferSpeed = setInterval(async () => {
      let totalDownloadedBytes = 0
      let recentlyDownloadedBytes = 0
      blocksStats.forEach((blockStat: BlockStat) => {
        totalDownloadedBytes += blockStat.byteLength
        if (Math.floor(Date.now() / 1000) - blockStat.fetchTime < TRANSFER_SPEED_SPAN) {
          recentlyDownloadedBytes += blockStat.byteLength
        }
      })

      const transferSpeed = recentlyDownloadedBytes === 0 ? 0 : recentlyDownloadedBytes / TRANSFER_SPEED_SPAN
      const fileState = this.files.get(fileMetadata.cid)
      if (!fileState) {
        this.logger.error(`No saved data for file cid ${fileMetadata.cid}`)
        return
      }
      this.files.set(fileMetadata.cid, {
        ...fileState,
        transferSpeed: transferSpeed,
        downloadedBytes: totalDownloadedBytes,
      })
      await this.updateStatus(fileMetadata.cid, DownloadState.Downloading)
    }, UPDATE_STATUS_INTERVAL * 1000)

    const downloadCompletedOrCanceled = new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const fileState = this.files.get(fileMetadata.cid)
        this.ufs.stat(fileCid).then(({ fileSize, localFileSize }) => {
          if (this.cancelledDownloads.has(fileMetadata.cid) || !fileState || localFileSize === fileSize) {
            clearInterval(interval)
            resolve('No more blocks to fetch, download is completed or canceled')
          } else {
            _logger.info(`Downloaded ${downloadedBlocks.size} blocks (${pendingBlocks.size} blocks pending)`)
          }
        })
      }, 1000)
    })

    let downloading = fileSize !== initialStat.localFileSize
    let offset = 0
    const baseCatOptions: Partial<CatOptions> = {
      onProgress: handleDownloadProgressEvents,
      signal: controller.signal,
    }

    while (downloading) {
      const stat = await this.ufs.stat(fileCid)
      const totalSize = Number(stat.fileSize)
      const downloadedSize = Number(stat.localFileSize)
      if (offset >= totalSize) {
        _logger.info(`Done downloading`)
        downloading = false
        break
      }

      // we have to break apart the cat operation into chunks because for big files you end up overstressing the block broker and it fails to download
      const catOptions: Partial<CatOptions> = {
        ...baseCatOptions,
        offset: downloadedSize,
        length: DEFAULT_CAT_BLOCK_CHUNK_SIZE,
      }

      _logger.info(
        `Getting blocks totalling ${DEFAULT_CAT_BLOCK_CHUNK_SIZE} bytes with offset ${downloadedSize} (total bytes: ${totalSize})`
      )

      try {
        const entries = this.ufs.cat(fileCid, catOptions)
        for await (const entry of entries) {
          _logger.info(`Got block with size (in bytes)`, entry.byteLength)
        }
      } catch (e) {
        if (this.cancelledDownloads.has(fileCid.toString())) {
          _logger.warn(`Cancelling download`)
          downloading = false
          break
        }
      }
      offset += DEFAULT_CAT_BLOCK_CHUNK_SIZE
    }

    // I don't love that I'm doing this but just writing the files straight from the cat operation above ends up giving you a corrupt final file
    // This gives us all blocks as they are
    if (!this.cancelledDownloads.has(fileCid.toString())) {
      try {
        const entries = this.ufs.cat(fileCid, baseCatOptions)
        for await (const entry of entries) {
          _logger.info(`Writing block with size (in bytes)`, entry.byteLength)

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
      } catch (e) {
        if (this.cancelledDownloads.has(fileCid.toString())) {
          _logger.warn(`Cancelling download`)
        }
      }
    }

    writeStream.end()

    await downloadCompletedOrCanceled

    clearInterval(updateDownloadStatusWithTransferSpeed)

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
      return
    }

    this.files.set(fileMetadata.cid, {
      ...fileState,
      transferSpeed: 0,
      downloadedBytes: Number((await this.ufs.stat(fileCid)).localFileSize),
    })

    _logger.info(`Pinning all blocks for file`)
    if (await this.ipfs.pins.isPinned(fileCid)) {
      _logger.warn(`Already pinned - this file has probably already been uploaded/downloaded previously`)
    } else {
      for await (const cid of this.ipfs.pins.add(fileCid)) {
        _logger.debug(`Pinning ${cid.toString()}`)
      }
      _logger.info(`Pinning complete`)
    }

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
