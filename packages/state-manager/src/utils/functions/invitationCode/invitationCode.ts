import { Site, parseInvitationLink } from '@quiet/common'
import { type InvitationData } from '@quiet/types'

export const getInvitationLinks = (codeOrUrl: string): InvitationData => {
  /**
   * Extract codes from invitation share url or return passed value for further error handling
   * @param codeOrUrl: full invitation link or just the code part of the link
   */
  let potentialLink
  let validUrl: URL | null = null

  let inviteLink = ''

  try {
    validUrl = new URL(codeOrUrl)
  } catch (e) {
    // It may be just code, not URL
    potentialLink = codeOrUrl
  }

  if (validUrl && validUrl.host === Site.DOMAIN && validUrl.pathname.includes(Site.JOIN_PAGE)) {
    const hash = validUrl.hash
    if (hash) {
      // Parse hash
      inviteLink = hash.substring(1)
    }
  } else if (potentialLink) {
    // Parse code just as hash value
    inviteLink = potentialLink
  }

  return parseInvitationLink(inviteLink)
}
