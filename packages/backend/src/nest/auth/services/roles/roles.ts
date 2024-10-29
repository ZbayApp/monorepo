import { Member, Role } from '@localfirst/auth'

export enum RoleName {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export type RoleMemberInfo = {
  id: string
  name: string
}

export type BaseQuietRole = Role & {
  hasRole?: boolean
}

export type QuietRole = BaseQuietRole & {
  members: Member[]
}

export type TruncatedQuietRole = BaseQuietRole & {
  members: RoleMemberInfo[]
}

export type BaseChannel = {
  channelName: string
}

export type Channel = QuietRole & BaseChannel

export type TruncatedChannel = TruncatedQuietRole & BaseChannel
