import React, { FC, useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Share } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'

import { connection } from '@quiet/state-manager'

import { navigationSelectors } from '../../../store/navigation/navigation.selectors'
import { useConfirmationBox } from '../../../hooks/useConfirmationBox'
import { useContextMenu } from '../../../hooks/useContextMenu'
import { MenuName } from '../../../const/MenuNames.enum'
import { ContextMenu } from '../ContextMenu.component'
import { ContextMenuItemProps } from '../ContextMenu.types'
import { navigationActions } from '../../../store/navigation/navigation.slice'
import { ScreenNames } from '../../../const/ScreenNames.enum'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('invitationContextMenu:container')

export const InvitationContextMenu: FC = () => {
  const dispatch = useDispatch()

  const screen = useSelector(navigationSelectors.currentScreen)

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

  const invitationContextMenu = useContextMenu(MenuName.Invitation)

  const redirect = useCallback(
    (screen: ScreenNames) => {
      dispatch(
        navigationActions.navigation({
          screen,
        })
      )
    },
    [dispatch]
  )

  const copyLink = async () => {
    if (!invitationLink) return
    Clipboard.setString(invitationLink)
    await confirmationBox.flash()
  }

  const shareLink = async () => {
    try {
      await Share.share({
        title: '"Quiet" invitation',
        message: `Chat with me on "Quiet"!\n${invitationLink}`,
      })
    } catch (error) {
      logger.error(error)
    }
  }

  const confirmationBox = useConfirmationBox('Link copied')

  const items: ContextMenuItemProps[] = [
    {
      title: 'Copy link',
      action: copyLink,
    },
    {
      title: 'QR code',
      action: () => redirect(ScreenNames.QRCodeScreen),
    },
    {
      title: 'Share',
      action: shareLink,
    },
    {
      title: 'Cancel',
      action: () => invitationContextMenu.handleClose(),
    },
  ]

  useEffect(() => {
    invitationContextMenu.handleClose()
  }, [screen])

  const title = 'Add members'

  if (!invitationLink) {
    if (!invitationReady) {
      return <ContextMenu title={title} items={[]} hint={'Generating invitation link...'} {...invitationContextMenu} />
    }
    return (
      <ContextMenu
        title={title}
        items={[]}
        hint={'Only admins can invite new members to this community. Ask the community creator for a link to share.'}
        {...invitationContextMenu}
      />
    )
  }
  return (
    <ContextMenu
      title={title}
      items={items}
      hint={'Anyone with Quiet app can follow this link to join this community. Only share with people you trust.'}
      link={invitationLink}
      linkAction={copyLink}
      {...invitationContextMenu}
    />
  )
}
