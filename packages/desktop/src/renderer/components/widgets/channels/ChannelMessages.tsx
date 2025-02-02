import React, { useCallback, useEffect, useRef, useState } from 'react'
import { styled } from '@mui/material/styles'
import { Dictionary } from '@reduxjs/toolkit'
import List from '@mui/material/List'

import FloatingDate from './FloatingDate'
import MessagesDivider from '../MessagesDivider'
import BasicMessageComponent from './BasicMessage'
import SpinnerLoader from '../../ui/Spinner/SpinnerLoader'

import { DownloadStatus, MessagesDailyGroups, MessageSendingStatus } from '@quiet/state-manager'
import { UseModalType } from '../../../containers/hooks'
import { FileActionsProps } from '../../Channel/File/FileComponent/FileComponent'
import { HandleOpenModalType, UserLabelType } from '../userLabel/UserLabel.types'

const PREFIX = 'ChannelMessagesComponent'

const classes = {
  spinner: `${PREFIX}spinner`,
  scroll: `${PREFIX}scroll`,
  list: `${PREFIX}list`,
  link: `${PREFIX}link`,
  item: `${PREFIX}item`,
  bold: `${PREFIX}bold`,
}

const Root = styled('div')(({ theme }) => ({
  [`& .${classes.spinner}`]: {
    top: '50%',
    textAlign: 'center',
    position: 'relative',
    transform: 'translate(0, -50%)',
  },

  [`&.${classes.scroll}`]: {
    overflow: 'scroll',
    overflowX: 'hidden',
    height: '100%',
  },

  [`& .${classes.list}`]: {
    backgroundColor: theme.palette.background.default,
    width: '100%',
  },

  [`& .${classes.link}`]: {
    color: theme.palette.colors.lushSky,
    cursor: 'pointer',
  },

  [`& .${classes.item}`]: {
    backgroundColor: theme.palette.colors.gray03,
    padding: '9px 16px',
  },

  [`& .${classes.bold}`]: {
    fontWeight: 'bold',
  },
}))

export const fetchingChannelMessagesText = 'Fetching channel messages...'
export const deletingChannelMessage = 'Deleting channel...'

export interface IChannelMessagesProps {
  messages?: MessagesDailyGroups
  pendingMessages?: Dictionary<MessageSendingStatus>
  downloadStatuses?: Dictionary<DownloadStatus>
  scrollbarRef: React.RefObject<HTMLDivElement>
  onScroll: () => void
  openUrl: (url: string) => void
  uploadedFileModal?: UseModalType<{
    src: string
  }>
  onMathMessageRendered?: () => void
  pendingGeneralChannelRecreation?: boolean
  unregisteredUsernameModalHandleOpen: HandleOpenModalType
  duplicatedUsernameModalHandleOpen: HandleOpenModalType
}

export const ChannelMessagesComponent: React.FC<IChannelMessagesProps & FileActionsProps> = ({
  messages = {},
  pendingMessages = {},
  downloadStatuses = {},
  scrollbarRef,
  onScroll,
  uploadedFileModal,
  openUrl,
  openContainingFolder,
  downloadFile,
  cancelDownload,
  onMathMessageRendered,
  pendingGeneralChannelRecreation = false,
  unregisteredUsernameModalHandleOpen,
  duplicatedUsernameModalHandleOpen,
}) => {
  const spinnerMessage = pendingGeneralChannelRecreation ? deletingChannelMessage : fetchingChannelMessagesText

  const listRef = useRef<HTMLUListElement>(null)

  // We track the day whose divider is the top-most one below the floating date
  const [currentDay, setCurrentDay] = useState<string>('')

  // Dictionary to hold refs for each day's divider
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Make sure we create a ref entry for each day
  Object.keys(messages).forEach(day => {
    if (!dayRefs.current[day]) {
      dayRefs.current[day] = null
    }
  })

  // Scroll event logic
  const updateFloatingDate = useCallback(() => {
    if (!scrollbarRef.current) return

    const containerRect = scrollbarRef.current.getBoundingClientRect()
    // Optionally adjust floatOffset if your FloatingDate is pinned lower
    const floatOffset = 23
    const floatPos = containerRect.top + floatOffset

    let bestDay = ''
    let bestTop = Number.NEGATIVE_INFINITY

    // Check each divider's top position
    for (const day of Object.keys(dayRefs.current)) {
      const node = dayRefs.current[day]
      if (!node) continue
      const rect = node.getBoundingClientRect()

      // If it's below or at floatPos, track the one that's the furthest down
      if (rect.top <= floatPos) {
        if (rect.top > bestTop) {
          bestTop = rect.top
          bestDay = day
        }
      }
    }

    setCurrentDay(bestDay)
  }, [scrollbarRef])

  // Make sure we call updateFloatingDate in onScroll
  const handleScroll = useCallback(() => {
    onScroll()
    updateFloatingDate()
  }, [onScroll, updateFloatingDate])

  // Keyboard nav
  const handleKeyDown = useCallback<(evt: KeyboardEvent) => void>(
    evt => {
      if (!scrollbarRef.current) return
      switch (evt.key) {
        case 'ArrowUp':
        case 'ArrowDown':
          // up to you if you want to change how these behave
          break
        case 'PageUp':
          listRef.current?.focus()
          scrollbarRef.current.scrollTop -= 40
          break
        case 'PageDown':
          listRef.current?.focus()
          scrollbarRef.current.scrollTop += 40
          break
      }
    },
    [listRef, scrollbarRef]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, false)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, false)
    }
  }, [handleKeyDown])

  // Attach scroll listener to container
  useEffect(() => {
    const el = scrollbarRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll)
    return () => {
      el.removeEventListener('scroll', handleScroll)
    }
  }, [scrollbarRef, handleScroll])

  return (
    <Root className={classes.scroll} ref={scrollbarRef} data-testid='channelContent'>
      {Object.values(messages).length < 1 && (
        <SpinnerLoader size={40} message={spinnerMessage} className={classes.spinner} color={'black'} />
      )}

      {/* Pass the day we found into FloatingDate */}
      <FloatingDate title={currentDay || 'Today'} />

      <List disablePadding className={classes.list} id='messages-scroll' ref={listRef} tabIndex={0}>
        {Object.keys(messages).map(day => {
          return (
            // Attach a ref callback to store each div in dayRefs
            <div
              key={day}
              ref={el => {
                dayRefs.current[day] = el
              }}
            >
              <MessagesDivider title={day} />
              {messages[day].map(items => {
                const data = items[0]
                return (
                  <BasicMessageComponent
                    key={data.id}
                    messages={items}
                    pendingMessages={pendingMessages}
                    downloadStatuses={downloadStatuses}
                    uploadedFileModal={uploadedFileModal}
                    openUrl={openUrl}
                    openContainingFolder={openContainingFolder}
                    downloadFile={downloadFile}
                    cancelDownload={cancelDownload}
                    onMathMessageRendered={onMathMessageRendered}
                    unregisteredUsernameModalHandleOpen={unregisteredUsernameModalHandleOpen}
                    duplicatedUsernameModalHandleOpen={duplicatedUsernameModalHandleOpen}
                  />
                )
              })}
            </div>
          )
        })}
      </List>
    </Root>
  )
}

export default ChannelMessagesComponent
