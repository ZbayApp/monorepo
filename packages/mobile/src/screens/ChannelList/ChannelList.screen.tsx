import React, { FC, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { communities, publicChannels } from '@quiet/state-manager'

import { ChannelList as ChannelListComponent } from '../../components/ChannelList/ChannelList.component'
import { ChannelTileProps } from '../../components/ChannelTile/ChannelTile.types'
import { navigationActions } from '../../store/navigation/navigation.slice'
import { ScreenNames } from '../../const/ScreenNames.enum'

import { formatMessageDisplayDate } from '../../utils/functions/formatMessageDisplayDate/formatMessageDisplayDate'

import { useContextMenu } from '../../hooks/useContextMenu'
import { MenuName } from '../../const/MenuNames.enum'

export const ChannelListScreen: FC = () => {
  const dispatch = useDispatch()

  const redirect = useCallback(
    (address: string) => {
      dispatch(
        publicChannels.actions.setCurrentChannel({
          channelAddress: address
        })
      )
      dispatch(
        navigationActions.navigation({
          screen: ScreenNames.ChannelScreen
        })
      )
    },
    [dispatch]
  )

  const community = useSelector(communities.selectors.currentCommunity)
  const channels = useSelector(publicChannels.selectors.channelsStatusSorted)

  // Only community owner is allowed to delete channels
  const enableChannelDeletion = Boolean(community.CA)

  const deleteChannel = useCallback(
    (channel: string) => {
      dispatch(
        navigationActions.navigation({
          screen: ScreenNames.DeleteChannelScreen,
          params: {
            channel: channel
          }
        })
      )
    },
    [dispatch]
  )

  const tiles = channels.map(status => {
    const newestMessage = status.newestMessage

    const message = newestMessage?.message || '...'
    const date = newestMessage?.createdAt
      ? formatMessageDisplayDate(newestMessage.createdAt)
      : undefined

    const tile: ChannelTileProps = {
      name: status.address,
      address: status.address,
      message: message,
      date: date,
      unread: status.unread,
      redirect: redirect,
      deleteChannel: deleteChannel,
      enableDeletion: enableChannelDeletion
    }

    return tile
  })

  const communityContextMenu = useContextMenu(MenuName.Community)

  return (
    <ChannelListComponent
      community={community}
      tiles={tiles}
      communityContextMenu={communityContextMenu}
      enableDeletion={enableChannelDeletion}
      deleteChannel={deleteChannel}
    />
  )
}
