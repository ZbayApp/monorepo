import { type EntityState } from '@reduxjs/toolkit'
import { type FileMetadata } from './files'

export const INITIAL_CURRENT_CHANNEL_ID = 'initialcurrentChannelId'

export interface PublicChannel {
  name: string
  description: string
  owner: string
  timestamp: number
  id: string
  disabled?: boolean
}

export interface PublicChannelStorage extends PublicChannel {
  messages: EntityState<ChannelMessage>
}

export interface PublicChannelStatus {
  id: string
  unread: boolean
  newestMessage: ChannelMessage | null
}

export interface PublicChannelStatusWithName extends PublicChannelStatus {
  name: string
}

export interface PublicChannelSubscription {
  id: string
  subscribed: boolean
}

export interface ChannelMessage {
  id: string
  type: number
  message: string
  createdAt: number
  channelId: string
  signature: string
  pubKey: string
  media?: FileMetadata
}

export interface DisplayableMessage {
  id: string
  type: number
  message: string
  createdAt: number // seconds
  date: string // displayable
  nickname: string
  media?: FileMetadata
  isRegistered: boolean
  isDuplicated: boolean
  pubKey: string
  photo?: string // base64 encoded image
}

export type MessagesGroupsType = Record<string, DisplayableMessage[]>

export type MessagesDailyGroups = Record<string, DisplayableMessage[][]>

export interface ChannelsReplicatedPayload {
  channels: PublicChannel[]
}

export interface CreateChannelPayload {
  channel: PublicChannel
}

export interface CreateChannelResponse {
  channel: PublicChannel
}

export interface DeleteChannelPayload {
  channelId: string
}

export interface DeleteChannelResponse {
  channelId: string
}

export interface ChannelSubscribedPayload {
  channelId: string
}

export interface SetCurrentChannelPayload {
  channelId: string
}

export interface SetChannelMessagesSliceValuePayload {
  messagesSlice: number
  channelId: string
}

export interface PendingMessage {
  message: ChannelMessage
}

export interface SendInitialChannelMessagePayload {
  channelName: string
  channelId: string
}

export interface MessagesLoadedPayload {
  messages: ChannelMessage[]
  isVerified?: boolean
}

export interface CacheMessagesPayload {
  messages: ChannelMessage[]
  channelId: string
}

export interface MarkUnreadChannelPayload {
  channelId: string
  message?: ChannelMessage
}

export interface UpdateNewestMessagePayload {
  message: ChannelMessage
}

export interface DeleteChannelFromStorePayload {
  channelId: string
}

export interface ClearMessagesCachePayload {
  channelId: string
}

export interface DisableChannelPayload {
  channelId: string
}

export interface ChannelStructure {
  channelName: string | null
  channelId: string | null
}

export function instanceOfChannelMessage(object: ChannelMessage): boolean {
  return 'channelId' in object
}
