import { CatOptions, StatOptions } from '@helia/unixfs'
import { QuietLogger } from '@quiet/logger'
import { AddOptions } from 'helia'
import { CID } from 'multiformats'

export enum IpfsFilesManagerEvents {
  // Incoming evetns
  DOWNLOAD_FILE = 'downloadFile',
  CANCEL_DOWNLOAD = 'cancelDownload',
  UPLOAD_FILE = 'uploadFile',
  DELETE_FILE = 'deleteFile',
  // Outgoing evnets
  MESSAGE_MEDIA_UPDATED = 'messageMediaUpdated',
  DOWNLOAD_PROGRESS = 'downloadProgress',
}
export interface FilesData {
  size: number
  downloadedBytes: number
  transferSpeed: number
  cid: string
  message: {
    id: string
  }
}

export interface ExportProgress {
  /**
   * How many bytes of the file have been read
   */
  bytesRead: bigint

  /**
   * How many bytes of the file will be read - n.b. this may be
   * smaller than `fileSize` if `offset`/`length` have been
   * specified
   */
  totalBytes: bigint

  /**
   * The size of the file being read - n.b. this may be
   * larger than `total` if `offset`/`length` has been
   * specified
   */
  fileSize: bigint
}

export interface ExportWalk {
  cid: CID
}

export interface BlockStat {
  fetchTimeMs: number
  byteLength: number
}

export type OnErrorFunc = (cid: CID, err: Error) => Promise<void>

export interface GetStatsOptions {
  logger: QuietLogger
  signal: AbortSignal
  onError?: OnErrorFunc
  statOptions: StatOptions
}

export interface GetBlocksOptions {
  logger: QuietLogger
  signal: AbortSignal
  onError?: OnErrorFunc
  catOptions: CatOptions
}

export interface PinBlocksOptions {
  logger: QuietLogger
  signal: AbortSignal
  onError?: OnErrorFunc
  addOptions: AddOptions
}

export interface DownloadBlocksOptions {
  catOptions: CatOptions
  statOptions: StatOptions
  logger: QuietLogger
  signal: AbortSignal
}
