import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { Site } from '@quiet/common'
import { connection } from '@quiet/state-manager'

import { QRCodeComponent } from './QRCode.component'

export const QRCode: React.FC = () => {
  const dispatch = useDispatch()
  const inviteLink = useSelector(connection.selectors.invitationUrl)
  const [invitationLink, setInvitationLink] = useState<string>(inviteLink)
  const [invitationReady, setInvitationReady] = useState<boolean>(false)
  useEffect(() => {
    dispatch(connection.actions.createInvite({}))
    setInvitationReady(true)
  }, [])

  useEffect(() => {
    if (invitationReady) {
      setInvitationLink(inviteLink || Site.MAIN_PAGE)
    }
  }, [invitationReady, inviteLink])

  return <QRCodeComponent value={invitationLink} />
}
