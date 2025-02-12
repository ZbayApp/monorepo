import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Share from 'react-native-share'
import SVG from 'react-native-svg'

import { Site } from '@quiet/common'
import { connection } from '@quiet/state-manager'

import { navigationActions } from '../../store/navigation/navigation.slice'
import { ScreenNames } from '../../const/ScreenNames.enum'
import { QRCode } from '../../components/QRCode/QRCode.component'
import { createLogger } from '../../utils/logger'

const logger = createLogger('qrCode:screen')

export const QRCodeScreen: FC = () => {
  const dispatch = useDispatch()

  const svgRef = useRef<SVG>()

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

  const handleBackButton = useCallback(() => {
    dispatch(
      navigationActions.navigation({
        screen: ScreenNames.ChannelListScreen,
      })
    )
  }, [dispatch])

  const shareCode = async () => {
    svgRef.current?.toDataURL(async base64 => {
      try {
        await Share.open({
          title: '"Quiet" invitation',
          message: `Chat with me on "Quiet"!\n${invitationLink}`,
          url: `data:image/png;base64,${base64}`,
        })
      } catch (error) {
        logger.error(error)
      }
    })
  }

  return <QRCode value={invitationLink!} svgRef={svgRef} shareCode={shareCode} handleBackButton={handleBackButton} />
}
