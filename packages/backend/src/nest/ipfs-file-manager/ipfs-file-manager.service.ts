import { Inject, Injectable } from '@nestjs/common'
import { EventEmitter, setMaxListeners } from 'events'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { AddPinEvents, GetBlockProgressEvents, type Helia } from 'helia'
import { AddEvents, CatOptions, GetEvents, StatOptions, unixfs, UnixFSStats, type UnixFS } from '@helia/unixfs'
import { promisify } from 'util'
import sizeOf from 'image-size'
import { CID } from 'multiformats/cid'
import { DownloadProgress, DownloadState, DownloadStatus, FileMetadata, imagesExtensions } from '@quiet/types'
import { QUIET_DIR } from '../const'
import {
  BlockStat,
  DownloadBlocksOptions,
  ExportProgress,
  ExportWalk,
  FilesData,
  GetBlocksOptions,
  GetStatsOptions,
  IpfsFilesManagerEvents,
  PinBlocksOptions,
} from './ipfs-file-manager.types'
import { StorageEvents, UnixFSEvents } from '../storage/storage.types'
import {
  DEFAULT_CAT_BLOCK_CHUNK_SIZE,
  MAX_EVENT_LISTENERS,
  TRANSFER_SPEED_SPAN,
  TRANSFER_SPEED_SPAN_MS,
  UPDATE_STATUS_INTERVAL_MS,
} from './ipfs-file-manager.const'
import { sleep } from '../common/sleep'
const sizeOfPromisified = promisify(sizeOf)
const { createPaths, compare } = await import('../common/utils')
import { createLogger } from '../common/logger'
import { IpfsService } from '../ipfs/ipfs.service'
import { CustomProgressEvent } from 'progress-events'
import { DateTime } from 'luxon'
import { QuietLogger } from '@quiet/logger'
import { abortableAsyncIterable } from '../common/utils'

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
      const _logger = createLogger(`${IpfsFileManagerService.name}:eventHandler:download:${fileMetadata.cid}`)
      _logger.info('Downloading file', fileMetadata.size)
      if (this.files.get(fileMetadata.cid)) {
        _logger.warn(`Download is already running for this CID`)
        return
      }

      this.files.set(fileMetadata.cid, {
        size: fileMetadata.size || 0,
        downloadedBytes: 0,
        transferSpeed: 0,
        cid: fileMetadata.cid,
        message: fileMetadata.message,
      })
      this.controllers.delete(fileMetadata.cid)

      try {
        await this.downloadFile(fileMetadata)
      } catch (e) {
        _logger.error(`Error while downloading file`, e)
      }
    })
    this.on(IpfsFilesManagerEvents.CANCEL_DOWNLOAD, async cid => {
      const _logger = createLogger(`${IpfsFileManagerService.name}:eventHandler:cancel:${cid}`)
      const fileDownloaded = Array.from(this.files.values()).find(e => e.message.id === cid)
      if (fileDownloaded) {
        try {
          await this.cancelDownload(fileDownloaded.cid)
        } catch (e) {
          _logger.error(`Error while cancelling download`, e)
        }
      } else {
        _logger.warn(`Download for this file was already canceled or never started`)
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
      for await (const pinnedCid of abortableAsyncIterable(this.ipfs.pins.rm(cid))) {
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
    const cancelPromises: Promise<void>[] = []
    this.logger.info(`Cancelling ${this.files.size} downloads`)
    for (const cid of this.files.keys()) {
      cancelPromises.push(
        (async (): Promise<void> => {
          try {
            await this.cancelDownload(cid)
          } catch (e) {
            this.logger.error(`Error while cancelling download for CID ${cid}`, e)
          }
        })()
      )
    }

    await Promise.all(cancelPromises)
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
    const _logger = createLogger(`${IpfsFileManagerService.name}:cancel:${cid}`)
    let abortController = this.controllers.get(cid)
    const downloadInProgress = this.files.get(cid)
    if (!downloadInProgress) return
    // In case download is cancelled right after start and queue is not yet initialized.
    while (abortController == null) {
      _logger.info(`Waiting for abort controller to be created...`)
      await sleep(1000)
      abortController = this.controllers.get(cid)
    }

    if (abortController.controller.signal.aborted) {
      _logger.warn(`Download already canceled, skipping...`)
      return
    }

    _logger.info(`Aborting download`)
    const controller = abortController.controller
    controller.abort()
  }

  public async downloadFile(fileMetadata: FileMetadata): Promise<void> {
    const _logger = createLogger(`${IpfsFileManagerService.name}:download:${fileMetadata.cid}`)
    const finalStatus = await this._downloadFile(fileMetadata, _logger)
    switch (finalStatus) {
      case DownloadState.Completed:
        await this.updateStatus(fileMetadata.cid, DownloadState.Completed)
        this.files.delete(fileMetadata.cid)
        this.controllers.delete(fileMetadata.cid)
        break
      case DownloadState.Canceled:
        await this.updateStatus(fileMetadata.cid, DownloadState.Canceled)
        this.files.delete(fileMetadata.cid)
        break
      case DownloadState.Malicious:
        await this.updateStatus(fileMetadata.cid, DownloadState.Malicious)
        this.files.delete(fileMetadata.cid)
        break
    }
  }

  private async _downloadFile(
    fileMetadata: FileMetadata,
    _logger: QuietLogger
  ): Promise<DownloadState.Completed | DownloadState.Canceled | DownloadState.Malicious> {
    _logger.info(`Initializing download of ${fileMetadata.name}${fileMetadata.ext}`)

    const fileCid: CID = CID.parse(fileMetadata.cid)
    let downloadedBlocks: number = 0
    const pendingBlocks: Set<string> = new Set()

    const controller = new AbortController()
    setMaxListeners(MAX_EVENT_LISTENERS, controller.signal)
    this.controllers.set(fileMetadata.cid, { controller })

    // Transfer speed
    const blocksStats: BlockStat[] = []

    const handleDownloadProgressEvents = async (
      event: GetEvents | GetBlockProgressEvents | CustomProgressEvent<any> | AddPinEvents
    ) => {
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
      }

      // handler for events where we are walking the file to get all child blocks
      // NOTE: this happens at the beginning of the download process AND when we have all of the blocks are we are walking through them to get the contents
      const handleWalkFile = async (event: CustomProgressEvent<ExportWalk>) => {
        const cidStr = event.detail.cid.toString()
        if (downloadedBlocks === 0 && pendingBlocks.size === 0) {
          // this is the first time we've seen this event so it means we are just starting the download process
          _logger.info(`Download started, walking`)
          await this.updateStatus(cidStr, DownloadState.Downloading)
          return
        }

        _logger.info(`Walking ${cidStr}`)
      }

      // handler for events where we have found the block on the network and are adding it to our local blockstore
      const handleDownloadBlock = async (event: CustomProgressEvent<ExportProgress>) => {
        const { bytesRead, totalBytes } = event.detail
        _logger.info(`Block found and downloaded to local blockstore`, event.detail)

        const blockStat = {
          fetchTimeMs: DateTime.utc().toMillis(),
          byteLength: Number(totalBytes) - Number(bytesRead),
        }
        blocksStats.push(blockStat)
        downloadedBlocks += 1
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

      const handlePutBlock = async (event: GetBlockProgressEvents) => {
        const cidStr = event.detail.toString()
        if (pendingBlocks.has(cidStr)) {
          pendingBlocks.delete(cidStr)
        }

        _logger.info(`Putting block ${cidStr} into local blockstore`)
      }

      this.logger.info(`Event with type`, event.type)
      switch (event.type) {
        case UnixFSEvents.WALK_FILE:
          await handleWalkFile(event as CustomProgressEvent<ExportWalk>)
          break
        case UnixFSEvents.GET_BLOCK_PROVIDERS:
        case UnixFSEvents.WANT_BLOCK:
          await handleWantBlock(event as CustomProgressEvent<CID>)
          break
        case UnixFSEvents.GET_BLOCK:
          await handleGetBlock((event as GetBlockProgressEvents).detail)
          break
        case UnixFSEvents.DOWNLOAD_BLOCK:
          await handleDownloadBlock(event as CustomProgressEvent<ExportProgress>)
          break
        case UnixFSEvents.PUT_BLOCK:
          await handlePutBlock(event as GetBlockProgressEvents)
          break
        default:
          break
      }

      return
    }

    const initialStats: UnixFSStats | DownloadState = await this.validateDownload(fileCid, fileMetadata.size, {
      logger: _logger,
      signal: controller.signal,
      statOptions: {
        onProgress: handleDownloadProgressEvents,
        signal: controller.signal,
      },
    })

    if (typeof initialStats === 'string') {
      if (initialStats == DownloadState.Canceled) {
        _logger.warn(`Cancelling download because initial stat check threw an error`)
        return DownloadState.Canceled
      } else if (initialStats == DownloadState.Malicious) {
        return DownloadState.Malicious
      }
    }

    const writeStream = this.prepFileStream(fileMetadata.ext)

    this.files.set(fileMetadata.cid, {
      ...this.files.get(fileMetadata.cid)!,
      downloadedBytes: Number(initialStats.localFileSize),
    })

    const updateDownloadStatusWithTransferSpeed = setInterval(async () => {
      if (controller.signal.aborted) {
        _logger.warn(`Cancelling update status interval due to cancellation`)
        clearInterval(updateDownloadStatusWithTransferSpeed)
        return
      }

      const currentStats = await this.getFileStats(fileCid, {
        logger: _logger,
        signal: controller.signal,
        statOptions: {
          signal: controller.signal,
        },
      })

      if (currentStats == null) {
        return
      }

      const totalDownloadedBytes = Number(currentStats.localFileSize)
      let recentlyDownloadedBytes = 0
      const thresholdTimestamp = DateTime.utc().toMillis() - TRANSFER_SPEED_SPAN_MS
      blocksStats.forEach((blockStat: BlockStat) => {
        if (blockStat.fetchTimeMs >= thresholdTimestamp) {
          recentlyDownloadedBytes += blockStat.byteLength
        }
      })
      this.logger.info(`Current downloaded bytes`, recentlyDownloadedBytes, totalDownloadedBytes)

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

      _logger.info(`Downloaded ${downloadedBlocks} blocks (${pendingBlocks.size} blocks pending)`)
    }, UPDATE_STATUS_INTERVAL_MS)

    const baseCatOptions: CatOptions = {
      onProgress: handleDownloadProgressEvents,
    }

    const statOptions: StatOptions = {
      signal: controller.signal,
    }

    const finishedDownloading = await this.downloadBlocks(fileCid, initialStats, {
      catOptions: baseCatOptions,
      statOptions,
      signal: controller.signal,
      logger: _logger,
    })

    if (!finishedDownloading) {
      if (!controller.signal.aborted) {
        _logger.warn(`Failed to finish downloading blocks for file, canceling download`)
        await this.cancelDownload(fileCid.toString())
      }
      return DownloadState.Canceled
    }

    const finishedWriting = await this.writeBlocksToFilesystem(fileCid, writeStream, {
      logger: _logger,
      signal: controller.signal,
      catOptions: baseCatOptions,
    })
    writeStream.end()

    try {
      clearInterval(updateDownloadStatusWithTransferSpeed)
    } catch (e) {
      _logger.error(`Error while clearing status update interval`, e)
    }

    if (!finishedWriting && !controller.signal.aborted) {
      _logger.warn(`Failed to finish writing blocks to filesystem, canceling download`)
      await this.cancelDownload(fileCid.toString())
      return DownloadState.Canceled
    }

    const fileState = this.files.get(fileMetadata.cid)
    if (fileState == null) {
      _logger.error(`No saved data for file`)
      return DownloadState.Canceled
    }

    const finalStats = await this.getFileStats(fileCid, {
      logger: _logger,
      signal: controller.signal,
      statOptions,
    })

    if (finalStats == null) {
      if (!controller.signal.aborted) await this.cancelDownload(fileCid.toString())

      return DownloadState.Canceled
    }

    this.files.set(fileMetadata.cid, {
      ...fileState,
      transferSpeed: 0,
      downloadedBytes: Number(finalStats.localFileSize),
    })

    const isPinned = await this.pinBlocks(fileCid, {
      logger: _logger,
      signal: controller.signal,
      addOptions: {
        signal: controller.signal,
        onProgress: handleDownloadProgressEvents,
      },
    })

    if (!isPinned) {
      if (!controller.signal.aborted) {
        await this.cancelDownload(fileCid.toString())
      }

      return DownloadState.Canceled
    }

    const messageMedia: FileMetadata = {
      ...fileMetadata,
      path: writeStream.path.toString(),
    }

    this.emit(IpfsFilesManagerEvents.MESSAGE_MEDIA_UPDATED, messageMedia)
    return DownloadState.Completed
  }

  private async updateStatus(cid: string, downloadState = DownloadState.Downloading) {
    this.logger.info(`Updating status for file`, cid, downloadState)
    const metadata = this.files.get(cid)
    if (!metadata) {
      this.logger.warn(`No file metadata found for file`, cid)
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

  // UnixFS helpers

  private async getFileStats(cid: CID, options: GetStatsOptions): Promise<UnixFSStats | undefined> {
    options.logger.info(`Getting file stats`)
    try {
      return await this.ufs.stat(cid, options.statOptions)
    } catch (e) {
      if (options.signal.aborted) {
        options.logger.warn(`Cancelled stat due to download cancellation`)
      } else {
        options.logger.error(`Error while getting file stats`, e)
      }

      if (options.onError) {
        await options.onError(cid, e)
      }
      return undefined
    }
  }

  private async getBlocks(
    cid: CID,
    options: GetBlocksOptions,
    timeoutMs?: number
  ): Promise<AsyncIterable<Uint8Array> | undefined> {
    options.logger.info(`Getting blocks for file`)
    try {
      const entries = this.ufs.cat(cid, { ...options.catOptions, signal: undefined })
      return abortableAsyncIterable(entries, options.signal, timeoutMs) // this allows us to abort without causing an unhandled rejection error
    } catch (e) {
      if (options.signal.aborted) {
        options.logger.warn(`Cancelled cat due to download cancellation`)
      } else {
        options.logger.error(`Error while getting blocks for file`, e)
      }

      if (options.onError) {
        await options.onError(cid, e)
      }
      return undefined
    }
  }

  private async pinBlocks(fileCid: CID, options: PinBlocksOptions): Promise<boolean> {
    options.logger.info(`Pinning all blocks for file`)
    try {
      if (await this.ipfs.pins.isPinned(fileCid, options.addOptions)) {
        options.logger.warn(`Already pinned - this file has probably already been uploaded/downloaded previously`)
      } else {
        for await (const cid of abortableAsyncIterable(
          this.ipfs.pins.add(fileCid, options.addOptions),
          options.signal
        )) {
          options.logger.debug(`Pinning ${cid.toString()}`)
        }
        options.logger.info(`Pinning complete`)
      }

      return true
    } catch (e) {
      if (options.signal.aborted) {
        options.logger.warn(`Cancelled block pinning due to download cancellation`)
      } else {
        options.logger.error(`Error while pinning blocks for file`, e)
      }

      if (options.onError != null) {
        await options.onError(fileCid, e)
      }

      return false
    }
  }

  // Download helpers

  private async downloadBlocks(cid: CID, initialStats: UnixFSStats, options: DownloadBlocksOptions): Promise<boolean> {
    let downloading = initialStats.fileSize !== initialStats.localFileSize
    let offset = 0

    if (!downloading) {
      options.logger.info(`File is already downloaded, skipping block fetch!`)
      return true
    }

    while (downloading && !options.signal.aborted) {
      options.logger.info(`Checking current download stats`)
      const stat: UnixFSStats | undefined = await this.getFileStats(cid, {
        logger: options.logger,
        signal: options.signal,
        statOptions: options.statOptions,
      })

      if (stat == null) {
        if (!options.signal.aborted) continue

        return false
      }

      const totalSize = Number(stat.fileSize)
      const downloadedSize = Number(stat.localFileSize)
      if (offset >= totalSize) {
        options.logger.info(`Done downloading`)
        downloading = false
        return true
      }

      // we have to break apart the cat operation into chunks because for big files you end up overstressing the block broker and it fails to download
      const catOptions: CatOptions = {
        ...options.catOptions,
        offset: downloadedSize,
        length: DEFAULT_CAT_BLOCK_CHUNK_SIZE,
      }

      options.logger.info(
        `Getting blocks totalling ${DEFAULT_CAT_BLOCK_CHUNK_SIZE} bytes with offset ${downloadedSize} (total bytes: ${totalSize})`
      )

      try {
        const entries = await this.getBlocks(
          cid,
          {
            logger: options.logger,
            signal: options.signal,
            catOptions,
          },
          120_000
        )
        if (entries == null) {
          if (options.signal.aborted) {
            options.logger.warn(`Download aborted, skipping processing of block...`)
            return false
          }

          options.logger.warn(`Error occurred while getting blocks, retrying...`)
          await sleep(500)
          continue
        }

        for await (const entry of entries) {
          options.logger.info(`Got block with size (in bytes)`, entry.byteLength)
        }
      } catch (e) {
        if (options.signal.aborted) {
          options.logger.warn(`Cancelling download during block fetch operation`, e)
          downloading = false
          return false
        }

        options.logger.error(`Error while catting file, retrying...`, e)
        await sleep(500)
        continue
      }
      offset += DEFAULT_CAT_BLOCK_CHUNK_SIZE
    }

    return true
  }

  private async writeBlocksToFilesystem(
    cid: CID,
    writeStream: fs.WriteStream,
    options: GetBlocksOptions
  ): Promise<boolean> {
    options.logger.info(`Writing blocks to filesystem`)
    if (options.signal?.aborted) {
      options.logger.info(`Skipping filesystem write because the download has been cancelled`)
      return false
    }

    try {
      const entries = await this.getBlocks(
        cid,
        {
          logger: options.logger,
          signal: options.signal,
          catOptions: options.catOptions,
        },
        120_000
      )
      if (entries == null) {
        if (options.signal?.aborted) {
          options.logger.warn(`Download aborted, skipping writing of block...`)
          return false
        }

        options.logger.warn(`Error occurred while getting blocks for writing to the filesystem`)
        return false
      }

      for await (const entry of entries) {
        options.logger.info(`Writing block with size (in bytes)`, entry.byteLength)

        await new Promise<void>((resolve, reject) => {
          writeStream.write(entry, err => {
            if (err) {
              this.logger.error(`${cid.toString()} writing to file error`, err)
              reject(err)
            }
          })
          resolve()
        })
      }
    } catch (e) {
      if (options.signal?.aborted) {
        options.logger.warn(`Cancelling download while writing block data to filesystem`, e)
      } else {
        options.logger.error(`Error while catting to write blocks out to local file`, e)
      }
      return false
    }

    return true
  }

  private async validateDownload(
    cid: CID,
    metadataSize: number | undefined,
    options: GetStatsOptions
  ): Promise<UnixFSStats | DownloadState.Canceled | DownloadState.Malicious> {
    options.logger.info(`Validating download at start`)
    const initialStats: UnixFSStats | undefined = await this.getFileStats(cid, {
      ...options,
      onError: async (cid: CID, error: Error) => {
        options.logger.error(`Cancelling download due to error during initial stat`, error)
        await this.cancelDownload(cid.toString())
      },
    })

    if (initialStats == null) {
      return DownloadState.Canceled
    }

    const fileSize = initialStats.fileSize
    if (metadataSize != null && !compare(metadataSize, fileSize, 0.05)) {
      options.logger.warn(`File was flagged as malicious due to discrepancies in file size`)
      return DownloadState.Malicious
    }

    return initialStats
  }

  private prepFileStream(ext: string): fs.WriteStream {
    const downloadDirectory = path.join(this.quietDir, 'downloads')
    createPaths([downloadDirectory])

    // As a quick fix, using a UUID for filename ensures that we never
    // save a file with a malicious filename. Perhaps it's also
    // possible to use the CID, however let's verify that first.
    let fileName: string
    let filePath: string
    do {
      fileName = `${crypto.randomUUID()}${ext}`
      filePath = `${path.join(downloadDirectory, fileName)}`
    } while (fs.existsSync(filePath))

    return fs.createWriteStream(filePath, { flags: 'wx' })
  }
}
