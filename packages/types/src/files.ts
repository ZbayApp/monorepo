import { type ChannelMessage } from './channel'

export interface FileContent {
  path: string | null // Should it be nullable?
  tmpPath?: string
  name: string
  ext: string
}

export interface FilePreviewData {
  [id: string]: FileContent
}

export interface FileMetadata extends FileContent {
  cid: string
  message: FileMessage
  size?: number
  width?: number
  height?: number
  enc?: {
    header: string
    recipient: {
      generation: number
      type: string
      name: string
    }
  }
}

export interface UploadFilePayload {
  file: FileMetadata
  peerId: string
}

export interface DownloadFilePayload {
  metadata: FileMetadata
  peerId: string
}

export interface FileMessage {
  id: string
  channelId: string
}
export interface CancelDownload {
  mid: string
  cid: string
}

export interface CancelDownloadPayload {
  mid: string
  peerId: string
}

export interface DownloadStatus {
  mid: string // Message id
  cid: string
  downloadState: DownloadState
  downloadProgress?: DownloadProgress
}

export interface RemoveDownloadStatus {
  cid: string
}

export interface DownloadProgress {
  size?: number
  downloaded: number
  transferSpeed: number
}

export type DictionaryNum<T> = Record<number, T | undefined>
export type Dictionary<T> = DictionaryNum<T> & Record<string, T | undefined>

export interface DeleteFilesFromChannelPayload {
  channelId: string
}
export interface DeleteFilesFromChannelSocketPayload {
  messages: Dictionary<ChannelMessage>
}

export enum DownloadState {
  None = '',
  Uploading = 'uploading',
  Hosted = 'hosted',
  Ready = 'ready',
  Queued = 'queued',
  Downloading = 'downloading',
  Completed = 'completed',
  Canceling = 'canceling',
  Canceled = 'canceled',
  Malicious = 'malicious',
}

export const imagesExtensions = [
  '.gif',
  '.png',
  '.apng',
  '.jpg',
  '.jpeg',
  '.svg',
  '.avif',
  '.webp',
  '.bmp',
  '.ico',
  '.tif',
  '.tiff',
]
