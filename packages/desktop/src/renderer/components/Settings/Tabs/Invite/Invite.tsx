import React, { FC, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { DateTime } from 'luxon'

import { communities, connection } from '@quiet/state-manager'

import { InviteComponent } from './Invite.component'
import { createLogger } from '../../../../logger'

const LOGGER = createLogger('Invite')

export const Invite: FC = () => {
  LOGGER.info('Creating invite')
  const dispatch = useDispatch()

  const [revealInputValue, setRevealInputValue] = useState<boolean>(false)
  const handleClickInputReveal = () => {
    revealInputValue ? setRevealInputValue(false) : setRevealInputValue(true)
  }

  const inviteLink = useSelector(connection.selectors.invitationUrl)
  const [invitationLink, setInvitationLink] = useState<string>(inviteLink)
  const [invitationReady, setInvitationReady] = useState<boolean>(false)
  useEffect(() => {
    LOGGER.info('Generating invite code')
    dispatch(connection.actions.createInvite({}))
    LOGGER.info('Done generating invite code')
    setInvitationReady(true)
  }, [])

  useEffect(() => {
    if (invitationReady) {
      LOGGER.info(`Generating invitation URL using generated LFA code`)
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
