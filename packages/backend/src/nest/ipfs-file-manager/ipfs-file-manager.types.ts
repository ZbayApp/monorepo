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
