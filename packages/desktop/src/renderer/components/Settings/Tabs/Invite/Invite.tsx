import React, { FC, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { connection } from '@quiet/state-manager'

import { InviteComponent } from './Invite.component'
import { createLogger } from '../../../../logger'

const LOGGER = createLogger('Invite')

export const Invite: FC = () => {
  const dispatch = useDispatch()

  const [revealInputValue, setRevealInputValue] = useState<boolean>(false)
  const handleClickInputReveal = () => {
    revealInputValue ? setRevealInputValue(false) : setRevealInputValue(true)
  }

  const inviteLink = useSelector(connection.selectors.invitationUrl)
  const [invitationLink, setInvitationLink] = useState<string>(inviteLink)
  const [invitationReady, setInvitationReady] = useState<boolean>(false)
  useEffect(() => {
    dispatch(connection.actions.createInvite({}))
    setInvitationReady(true)
  }, [])

  useEffect(() => {
    if (invitationReady) {
      setInvitationLink(inviteLink)
    }
  }, [invitationReady, inviteLink])

  return (
    <InviteComponent
      invitationLink={invitationLink!}
      revealInputValue={revealInputValue}
      handleClickInputReveal={handleClickInputReveal}
    />
  )
}
