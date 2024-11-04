import { Site, parseInvitationLink } from '@quiet/common'
import { type InvitationData } from '@quiet/types'

export const getInvitationCodes = (codeOrUrl: string): InvitationData => {
  /**
   * Extract codes from invitation share url or return passed value for further error handling
   * @param codeOrUrl: full invitation link or just the code part of the link
   */
  let potentialCode
  let validUrl: URL | null = null

  let code = ''

  try {
    validUrl = new URL(codeOrUrl)
  } catch (e) {
    // It may be just code, not URL
    potentialCode = codeOrUrl
  }

  if (validUrl && validUrl.host === Site.DOMAIN && validUrl.pathname.includes(Site.JOIN_PAGE)) {
    const hash = validUrl.hash
    if (hash) {
      // Parse hash
      code = hash.substring(1)
    }
  } else if (potentialCode) {
    // Parse code just as hash value
    code = potentialCode
  }

  return parseInvitationLink(code)
}
