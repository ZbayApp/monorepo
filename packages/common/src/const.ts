export const DESKTOP_DEV_DATA_DIR = 'Quietdev'
export const DESKTOP_DATA_DIR = 'Quiet3'

export enum Site {
  DOMAIN = 'tryquiet.org',
  MAIN_PAGE = 'https://tryquiet.org/',
  JOIN_PAGE = 'join',
}

export const QUIET_JOIN_PAGE = `${Site.MAIN_PAGE}${Site.JOIN_PAGE}`

export enum JoiningAnotherCommunityWarning {
  TITLE = 'You already started to connect to another community',
  MESSAGE = "We're sorry but for now you can only be a member of a single community at a time",
}

export enum AlreadyBelongToCommunityWarning {
  TITLE = 'You already belong to a community',
  MESSAGE = "We're sorry but for now you can only be a member of a single community at a time",
}

export enum InvalidInvitationLinkError {
  TITLE = 'Invalid invitation link',
  MESSAGE = 'Please check your invitation link and try again',
}
