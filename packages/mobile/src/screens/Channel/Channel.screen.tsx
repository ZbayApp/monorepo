import React, { FC, useCallback, useEffect, useState } from 'react'
import { BackHandler, Linking } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { Chat } from '../../components/Chat/Chat.component'
import { communities, publicChannels, messages, files } from '@quiet/state-manager'
import { CancelDownload, FileContent, FileMetadata, FilePreviewData } from '@quiet/types'
import { navigationActions } from '../../store/navigation/navigation.slice'
import { ScreenNames } from '../../const/ScreenNames.enum'
import { UseContextMenuType, useContextMenu } from '../../hooks/useContextMenu'
import { MenuName } from '../../const/MenuNames.enum'
import { initSelectors } from '../../store/init/init.selectors'
import { DocumentPickerResponse } from 'react-native-document-picker'
import { Asset } from 'react-native-image-picker'
import { getFilesData } from '@quiet/common'

export const ChannelScreen: FC = () => {
  const dispatch = useDispatch()

  const handleBackButton = useCallback(() => {
    dispatch(
      navigationActions.navigation({
        screen: ScreenNames.ChannelListScreen,
      })
    )
    dispatch(
      publicChannels.actions.setCurrentChannel({
        channelId: '', // Necessary for marking channels as unread on channel's list
      })
    )
    return true
  }, [dispatch])

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton)
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton)
    }
  }, [handleBackButton])

  const currentChannel = useSelector(publicChannels.selectors.currentChannel)

  const community = useSelector(communities.selectors.currentCommunity)

  const channelMessagesCount = useSelector(publicChannels.selectors.currentChannelMessagesCount)

  const channelMessages = useSelector(publicChannels.selectors.currentChannelMessagesMergedBySender)

  const pendingMessages = useSelector(messages.selectors.messagesSendingStatus)

  const downloadStatusesMapping = useSelector(files.selectors.downloadStatuses)

  const isWebsocketConnected = useSelector(initSelectors.isWebsocketConnected)

  let contextMenu: UseContextMenuType<Record<string, unknown>> | null = useContextMenu(MenuName.Channel)

  if (!community?.CA || !isWebsocketConnected) {
    contextMenu = null
  }

  const unregisteredUsernameContextMenu = useContextMenu(MenuName.UnregisteredUsername)

  const [uploadingFiles, setUploadingFiles] = React.useState<FilePreviewData>({})
  const filesRef = React.useRef<FilePreviewData>({})
  React.useEffect(() => {
    filesRef.current = uploadingFiles
  }, [uploadingFiles])

  const downloadFile = useCallback(
    (media: FileMetadata) => {
      dispatch(files.actions.downloadFile(media))
    },
    [dispatch]
  )

  const cancelDownload = useCallback(
    (cancelDownload: CancelDownload) => {
      dispatch(files.actions.cancelDownload(cancelDownload))
    },
    [dispatch]
  )

  const loadMessages = useCallback(
    (load: boolean) => {
      dispatch(messages.actions.lazyLoading({ load }))
    },
    [dispatch]
  )

  // Files
  const updateUploadedFiles = (files: DocumentPickerResponse[]) => {
    const filesData: FilePreviewData = getFilesData(
      files.map(fileObj => {
        return {
          path: fileObj.fileCopyUri || fileObj.uri,
          isTmp: !fileObj.copyError,
        }
      })
    )

    // FilePreviewData
    setUploadingFiles(existingFiles => {
      const updatedFiles = { ...existingFiles, ...filesData }
      return updatedFiles
    })
  }

  const updateUploadedImages = (assets: Asset[]) => {
    const assetData: FilePreviewData = getFilesData(
      assets.map(assetObj => {
        return {
          path: assetObj.uri || assetObj.originalPath || '',
          isTmp: false,
        }
      })
    )

    // FilePreviewData
    setUploadingFiles(existingFiles => {
      const updatedFiles = { ...existingFiles, ...assetData }
      return updatedFiles
    })
  }

  const removeFilePreview = (id: string) =>
    setUploadingFiles(existingFiles => {
      delete existingFiles[id]
      const updatedExistingFiles = { ...existingFiles }
      return updatedExistingFiles
    })

  // User Label

  const duplicatedUsernameHandleBack = useCallback(() => {
    dispatch(
      navigationActions.navigation({
        screen: ScreenNames.DuplicatedUsernameScreen,
      })
    )
  }, [dispatch])

  const unregisteredUsernameHandleBack = useCallback(
    (username: string) => {
      unregisteredUsernameContextMenu.handleOpen({ username })
    },
    [unregisteredUsernameContextMenu]
  )

  const sendMessageAction = React.useCallback(
    async (message: string) => {
      if (message) {
        dispatch(messages.actions.sendMessage({ message }))
      }
      // Upload files, then send corresponding message (contaning cid) for each of them
      Object.values(filesRef.current).forEach(async (fileData: FileContent) => {
        if (!fileData.path) return
        dispatch(files.actions.uploadFile(fileData))
      })
      // Reset file previews for input state
      setUploadingFiles({})
    },
    [dispatch]
  )

  useEffect(() => {
    dispatch(messages.actions.resetCurrentPublicChannelCache())
  }, [currentChannel?.id])

  const [imagePreview, setImagePreview] = useState<FileMetadata | null>(null)

  const openUrl = useCallback((url: string) => {
    void Linking.openURL(url)
  }, [])

  if (!currentChannel) return null

  return (
    <Chat
      contextMenu={contextMenu}
      sendMessageAction={sendMessageAction}
      loadMessagesAction={loadMessages}
      handleBackButton={handleBackButton}
      channel={currentChannel}
      messages={{
        count: channelMessagesCount,
        groups: channelMessages,
      }}
      pendingMessages={pendingMessages}
      downloadStatuses={downloadStatusesMapping}
      downloadFile={downloadFile}
      cancelDownload={cancelDownload}
      imagePreview={imagePreview}
      setImagePreview={setImagePreview}
      openImagePreview={setImagePreview}
      updateUploadedFiles={updateUploadedFiles}
      updateUploadedImages={updateUploadedImages}
      removeFilePreview={removeFilePreview}
      openUrl={openUrl}
      uploadedFiles={uploadingFiles}
      ready={isWebsocketConnected}
      duplicatedUsernameHandleBack={duplicatedUsernameHandleBack}
      unregisteredUsernameHandleBack={unregisteredUsernameHandleBack}
    />
  )
}
