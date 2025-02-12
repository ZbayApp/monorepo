import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Dictionary } from '@reduxjs/toolkit'
import List from '@mui/material/List'
import { styled } from '@mui/material/styles'

import FloatingDate from './FloatingDate'
import DateDivider from '../DateDivider'
import BasicMessageComponent from './BasicMessage'
import SpinnerLoader from '../../ui/Spinner/SpinnerLoader'

import {
  DownloadStatus,
  MessagesDailyGroups,
  MessageSendingStatus,
  FileMetadata,
  CancelDownload,
} from '@quiet/state-manager'
import { UseModalType } from '../../../containers/hooks'
import { HandleOpenModalType } from '../userLabel/UserLabel.types'

const PREFIX = 'ChannelMessagesComponent'

const FETCHING_MESSAGES = 'Fetching channel messages...'
const DELETING_CHANNEL = 'Deleting channel...'

const CHANNEL_UI = {
  FLOATING_DATE_HIDE_DELAY: 1000, // ms to wait before hiding floating date
  FLOATING_DATE_OFFSET: 23, // px from top for floating date position
  PAGE_SCROLL_OVERLAP: 0.9, // percentage of viewport to scroll for PageUp/Down
  SPINNER_SIZE: 40, // px size of loading spinner
} as const

const classes = {
  spinner: `${PREFIX}spinner`,
  scroll: `${PREFIX}scroll`,
  list: `${PREFIX}list`,
  link: `${PREFIX}link`,
  item: `${PREFIX}item`,
  bold: `${PREFIX}bold`,
}

const StyledRoot = styled('div')(({ theme }) => ({
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
    color: theme.palette.primary.main,
    cursor: 'pointer',
  },
  [`& .${classes.item}`]: {
    backgroundColor: theme.palette.grey[100],
    padding: '9px 16px',
  },
  [`& .${classes.bold}`]: {
    fontWeight: 'bold',
  },
}))

interface Props {
  messages?: MessagesDailyGroups
  pendingMessages?: Dictionary<MessageSendingStatus>
  downloadStatuses?: Dictionary<DownloadStatus>
  scrollbarRef: React.RefObject<HTMLDivElement>
  onScroll: () => void
  openUrl: (url: string) => void
  openContainingFolder?: (path: string) => void
  downloadFile?: (media: FileMetadata) => void
  cancelDownload?: (cancelDownload: CancelDownload) => void
  uploadedFileModal?: UseModalType<{ src: string }>
  onMathMessageRendered?: () => void
  pendingGeneralChannelRecreation?: boolean
  unregisteredUsernameModalHandleOpen: HandleOpenModalType
  duplicatedUsernameModalHandleOpen: HandleOpenModalType
}

export const ChannelMessagesComponent: React.FC<Props> = ({
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
  const scrollTimerRef = useRef<number | null>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const [isScrolling, setIsScrolling] = useState(false)
  const [userHasInitiatedScroll, setUserHasInitiatedScroll] = useState(false)
  const [currentDay, setCurrentDay] = useState<string>('')

  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const spinnerMessage = pendingGeneralChannelRecreation ? DELETING_CHANNEL : FETCHING_MESSAGES

  Object.keys(messages).forEach(day => {
    if (!dayRefs.current[day]) {
      dayRefs.current[day] = null
    }
  })

  const updateFloatingDate = useCallback(() => {
    if (!scrollbarRef.current) return
    const containerRect = scrollbarRef.current.getBoundingClientRect()
    const floatPos = containerRect.top + CHANNEL_UI.FLOATING_DATE_OFFSET

    let bestDay = ''
    let bestTop = Number.NEGATIVE_INFINITY

    for (const day of Object.keys(dayRefs.current)) {
      const node = dayRefs.current[day]
      if (!node) continue
      const rect = node.getBoundingClientRect()
      if (rect.top <= floatPos && rect.top > bestTop) {
        bestTop = rect.top
        bestDay = day
      }
    }

    setCurrentDay(bestDay)
  }, [scrollbarRef])

  const handleScroll = useCallback(() => {
    onScroll()
    if (!scrollbarRef.current) return
    if (!userHasInitiatedScroll) return

    updateFloatingDate()

    setIsScrolling(true)
    if (scrollTimerRef.current) {
      window.clearTimeout(scrollTimerRef.current)
    }
    scrollTimerRef.current = window.setTimeout(() => {
      setIsScrolling(false)
    }, CHANNEL_UI.FLOATING_DATE_HIDE_DELAY)
  }, [onScroll, updateFloatingDate, userHasInitiatedScroll])

  const handleWheel = useCallback(() => {
    setUserHasInitiatedScroll(true)
  }, [])

  // Attach a single document‐level keydown listener, once
  useEffect(() => {
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (!scrollbarRef.current) return

      if (evt.key === 'PageUp' || evt.key === 'PageDown') {
        evt.preventDefault()

        // Get viewport height (minus ~10% for overlap)
        const scrollAmount = scrollbarRef.current.clientHeight * CHANNEL_UI.PAGE_SCROLL_OVERLAP

        setUserHasInitiatedScroll(true)
        scrollbarRef.current.scrollTop += evt.key === 'PageUp' ? -scrollAmount : scrollAmount
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [scrollbarRef])

  // Register scroll/wheel on the container
  useEffect(() => {
    const el = scrollbarRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll)
    el.addEventListener('wheel', handleWheel)
    return () => {
      el.removeEventListener('scroll', handleScroll)
      el.removeEventListener('wheel', handleWheel)
    }
  }, [scrollbarRef, handleScroll, handleWheel])

  // Cleanup scroll timer
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        window.clearTimeout(scrollTimerRef.current)
      }
    }
  }, [])

  return (
    <StyledRoot className={classes.scroll} ref={scrollbarRef} data-testid='channelContent'>
      {Object.values(messages).length < 1 && (
        <SpinnerLoader
          size={CHANNEL_UI.SPINNER_SIZE}
          message={spinnerMessage}
          className={classes.spinner}
          color='black'
        />
      )}

      <FloatingDate title={currentDay || 'Today'} isVisible={userHasInitiatedScroll && isScrolling} />

      <List disablePadding className={classes.list} id='messages-scroll' ref={listRef}>
        {Object.keys(messages).map(day => (
          <div
            key={day}
            ref={el => {
              dayRefs.current[day] = el
            }}
          >
            <DateDivider title={day} />
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
        ))}
      </List>
    </StyledRoot>
  )
}

export { FETCHING_MESSAGES as fetchingChannelMessagesText, DELETING_CHANNEL as deletingChannelMessage }
export default ChannelMessagesComponent
