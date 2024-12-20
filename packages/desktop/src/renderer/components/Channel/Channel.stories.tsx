import React from 'react'

import { ComponentStory, ComponentMeta } from '@storybook/react'

import { withTheme } from '../../storybook/decorators'
import { mock_messages } from '../../storybook/utils'

import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import ChannelComponent, { ChannelComponentProps } from './ChannelComponent'
import { UploadFilesPreviewsProps } from './File/UploadingPreview'
import { DownloadState } from '@quiet/types'

const args: Partial<ChannelComponentProps & UploadFilesPreviewsProps> = {
  user: {
    id: 'id',
    nickname: 'vader',
    hiddenService: {
      onionAddress: 'onionAddress',
      privateKey: 'privateKey',
    },
    peerId: {
      id: 'id',
      privKey: 'privKey',
      pubKey: 'pubKey',
    },
    userCsr: {
      userCsr: 'userCsr',
      userKey: 'userKey',
      pkcs10: {
        publicKey: 'publicKey',
        privateKey: 'privateKey',
        pkcs10: 'pkcs10',
      },
    },
    userCertificate: 'userCertificate',
    joinTimestamp: null,
  },
  uploadedFileModal: {
    open: false,
    handleOpen: function (_args?: any): any {},
    handleClose: function (): any {},
    src: 'images/butterfly.jpeg',
  },
  messages: mock_messages(),
  newestMessage: {
    id: '31',
    type: 1,
    message: 'I agree!',
    createdAt: 0,
    channelId: 'general',
    signature: 'signature',
    pubKey: 'pubKey',
  },
  pendingMessages: {},
  channelId: 'general',
  channelName: 'general',
  lazyLoading: function (_load: boolean): void {},
  onInputChange: function (_value: string): void {},
  onInputEnter: function (_message: string): void {},
  filesData: {},
}

const Template: ComponentStory<typeof ChannelComponent> = args => {
  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <ChannelComponent {...args} />
      </DndProvider>
    </>
  )
}

// States
export const Normal = Template.bind({})
export const Pending = Template.bind({})

Normal.args = args
Pending.args = {
  ...args,
  pendingMessages: {
    33: {
      id: '33',
      status: 0,
    },
  },
}

// Images
export const ImagePreview = Template.bind({})
export const ImagePlaceholder = Template.bind({})
export const SentImage = Template.bind({})

ImagePreview.args = {
  ...args,
  filesData: {
    file_id: {
      path: 'images/test-image.png',
      name: 'test-image',
      ext: '.png',
    },
  },
}
ImagePlaceholder.args = {
  ...args,
  messages: mock_messages({
    id: '32',
    type: 2,
    media: {
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      message: {
        channelId: 'general',
        id: 'wgtlstx3u7',
      },
      ext: '.png',
      name: 'test-image',
      width: 1200,
      height: 580,
      path: null,
    },
    message: '',
    createdAt: 0,
    date: '12:46',
    nickname: 'vader',
    isRegistered: true,
    isDuplicated: false,
    pubKey: 'pubKey',
  }),
  downloadStatuses: {
    32: {
      mid: '',
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      downloadState: DownloadState.None,
      downloadProgress: undefined,
    },
  },
}
SentImage.args = {
  ...args,
  messages: mock_messages({
    id: '32',
    type: 2,
    media: {
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      message: {
        channelId: 'general',
        id: 'wgtlstx3u7',
      },
      ext: '.png',
      name: 'test-image',
      width: 1200,
      height: 580,
      path: 'images/test-image.png',
    },
    message: '',
    createdAt: 0,
    date: '12:46',
    nickname: 'vader',
    isRegistered: true,
    isDuplicated: false,
    pubKey: 'pubKey',
  }),
  downloadStatuses: {
    32: {
      mid: '',
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      downloadState: DownloadState.Completed,
      downloadProgress: undefined,
    },
  },
}

// Files
export const FilePreview = Template.bind({})
export const MultipleMediaPreview = Template.bind({})
export const UploadingFile = Template.bind({})
export const HostedFile = Template.bind({})
export const ReadyDownload = Template.bind({})
export const Downloading = Template.bind({})
export const CompletedDownload = Template.bind({})
export const CancelingDownload = Template.bind({})
export const CanceledDownload = Template.bind({})
export const MaliciousDownload = Template.bind({})

FilePreview.args = {
  ...args,
  filesData: {
    file_id: {
      path: 'files/my-file-name-goes-here-an-isnt-truncated.zip',
      name: 'my-file-name-goes-here-an-isnt-truncated',
      ext: '.zip',
    },
  },
}
MultipleMediaPreview.args = {
  ...args,
  filesData: {
    file_id: {
      path: 'files/my-file-name-goes-here-an-isnt-truncated.zip',
      name: 'my-file-name-goes-here-an-isnt-truncated',
      ext: '.zip',
    },
    image_id: {
      path: 'images/test-image.png',
      name: 'test-image',
      ext: '.png',
    },
  },
}
UploadingFile.args = {
  ...args,
  messages: mock_messages({
    id: '32',
    type: 4,
    media: {
      cid: 'uploading_32',
      message: {
        channelId: 'general',
        id: 'wgtlstx3u7',
      },
      ext: '.zip',
      name: 'my-file-name-goes-here-an-isnt-truncated',
      width: undefined,
      height: undefined,
      path: null,
    },
    message: '',
    createdAt: 0,
    date: '12:46',
    nickname: 'vader',
    isRegistered: true,
    isDuplicated: false,
    pubKey: 'pubKey',
  }),
  downloadStatuses: {
    32: {
      cid: 'uploading_32',
      mid: 'mid',
      downloadState: DownloadState.Uploading,
      downloadProgress: undefined,
    },
  },
}
HostedFile.args = {
  ...args,
  messages: mock_messages({
    id: '32',
    type: 4,
    media: {
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      message: {
        channelId: 'general',
        id: 'wgtlstx3u7',
      },
      ext: '.zip',
      name: 'my-file-name-goes-here-an-isnt-truncated',
      size: 2048,
      width: undefined,
      height: undefined,
      path: 'files/my-file-name-goes-here-an-isnt-truncated.zip',
    },
    message: '',
    createdAt: 0,
    date: '12:46',
    nickname: 'vader',
    isRegistered: true,
    isDuplicated: false,
    pubKey: 'pubKey',
  }),
  downloadStatuses: {
    32: {
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      mid: 'mid',
      downloadState: DownloadState.Hosted,
      downloadProgress: undefined,
    },
  },
}
ReadyDownload.args = {
  ...args,
  messages: mock_messages({
    id: '32',
    type: 4,
    media: {
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      message: {
        channelId: 'general',
        id: 'wgtlstx3u7',
      },
      ext: '.zip',
      name: 'my-file-name-goes-here-an-isnt-truncated',
      size: 2048,
      width: undefined,
      height: undefined,
      path: 'files/my-file-name-goes-here-an-isnt-truncated.zip',
    },
    message: '',
    createdAt: 0,
    date: '12:46',
    nickname: 'vader',
    isRegistered: true,
    isDuplicated: false,
    pubKey: 'pubKey',
  }),
  downloadStatuses: {
    32: {
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      mid: 'mid',
      downloadState: DownloadState.Ready,
      downloadProgress: undefined,
    },
  },
}
Downloading.args = {
  ...args,
  messages: mock_messages({
    id: '32',
    type: 4,
    media: {
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      message: {
        channelId: 'general',
        id: 'wgtlstx3u7',
      },
      ext: '.zip',
      name: 'my-file-name-goes-here-an-isnt-truncated',
      size: 2048,
      width: undefined,
      height: undefined,
      path: 'files/my-file-name-goes-here-an-isnt-truncated.zip',
    },
    message: '',
    createdAt: 0,
    date: '12:46',
    nickname: 'vader',
    isRegistered: true,
    isDuplicated: false,
    pubKey: 'pubKey',
  }),
  downloadStatuses: {
    32: {
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      mid: 'mid',
      downloadState: DownloadState.Downloading,
      downloadProgress: {
        size: 2048,
        downloaded: 256,
        transferSpeed: 32,
      },
    },
  },
}
CompletedDownload.args = {
  ...args,
  messages: mock_messages({
    id: '32',
    type: 4,
    media: {
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      message: {
        channelId: 'general',
        id: 'wgtlstx3u7',
      },
      ext: '.zip',
      name: 'my-file-name-goes-here-an-isnt-truncated',
      size: 2048,
      width: undefined,
      height: undefined,
      path: 'files/my-file-name-goes-here-an-isnt-truncated.zip',
    },
    message: '',
    createdAt: 0,
    date: '12:46',
    nickname: 'vader',
    isRegistered: true,
    isDuplicated: false,
    pubKey: 'pubKey',
  }),
  downloadStatuses: {
    32: {
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      mid: 'mid',
      downloadState: DownloadState.Completed,
      downloadProgress: {
        size: 2048,
        downloaded: 1024,
        transferSpeed: 0,
      },
    },
  },
}
CancelingDownload.args = {
  ...args,
  messages: mock_messages({
    id: '32',
    type: 4,
    media: {
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      message: {
        channelId: 'general',
        id: 'wgtlstx3u7',
      },
      ext: '.zip',
      name: 'my-file-name-goes-here-an-isnt-truncated',
      size: 1024,
      width: undefined,
      height: undefined,
      path: 'files/my-file-name-goes-here-an-isnt-truncated.zip',
    },
    message: '',
    createdAt: 0,
    date: '12:46',
    nickname: 'vader',
    isRegistered: true,
    isDuplicated: false,
    pubKey: 'pubKey',
  }),
  downloadStatuses: {
    32: {
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      mid: 'mid',
      downloadState: DownloadState.Canceling,
      downloadProgress: {
        size: 2048,
        downloaded: 0,
        transferSpeed: 0,
      },
    },
  },
}
CanceledDownload.args = {
  ...args,
  messages: mock_messages({
    id: '32',
    type: 4,
    media: {
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      message: {
        channelId: 'general',
        id: 'wgtlstx3u7',
      },
      ext: '.zip',
      name: 'my-file-name-goes-here-an-isnt-truncated',
      size: 1024,
      width: undefined,
      height: undefined,
      path: 'files/my-file-name-goes-here-an-isnt-truncated.zip',
    },
    message: '',
    createdAt: 0,
    date: '12:46',
    nickname: 'vader',
    isRegistered: true,
    isDuplicated: false,
    pubKey: 'pubKey',
  }),
  downloadStatuses: {
    32: {
      mid: 'mid',
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      downloadState: DownloadState.Canceled,
      downloadProgress: undefined,
    },
  },
}
MaliciousDownload.args = {
  ...args,
  messages: mock_messages({
    id: '32',
    type: 4,
    media: {
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      message: {
        channelId: 'general',
        id: 'wgtlstx3u7',
      },
      ext: '.zip',
      name: 'my-file-name-goes-here-an-isnt-truncated',
      size: 1024,
      width: undefined,
      height: undefined,
      path: 'files/my-file-name-goes-here-an-isnt-truncated.zip',
    },
    message: '',
    createdAt: 0,
    date: '12:46',
    nickname: 'vader',
    isRegistered: true,
    isDuplicated: false,
    pubKey: 'pubKey',
  }),
  downloadStatuses: {
    32: {
      mid: 'mid',
      cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
      downloadState: DownloadState.Malicious,
      downloadProgress: undefined,
    },
  },
}

// Info
export const NewUserMessage = Template.bind({})

NewUserMessage.args = {
  ...args,
  messages: mock_messages({
    id: '32',
    type: 3,
    media: undefined,
    message: 'Hey, @the-emperor just joined!',
    createdAt: 0,
    date: '12:46',
    nickname: 'vader',
    isRegistered: true,
    isDuplicated: false,
    pubKey: 'pubKey',
  }),
}

// Link
export const Link = Template.bind({})

Link.args = {
  ...args,
  messages: mock_messages({
    id: '32',
    type: 1,
    media: undefined,
    message: 'Hey, haye you seen this https://github.com/TryQuiet/monorepo awesome project?',
    createdAt: 0,
    date: '12:46',
    nickname: 'vader',
    isRegistered: true,
    isDuplicated: false,
    pubKey: 'pubKey',
  }),
}

// MathJax
export const MathJaxMiddle = Template.bind({})
export const MathJaxBeginning = Template.bind({})
export const MathJaxPending = Template.bind({})

MathJaxMiddle.args = {
  ...args,
  messages: mock_messages({
    id: '32',
    type: 1,
    media: undefined,
    message: String.raw`Check this out: $$\sum_{i=0}^n i = \frac{n(n+1)}{2}$$ This is the formula I told you about`,
    createdAt: 0,
    date: '12:46',
    nickname: 'vader',
    isRegistered: true,
    isDuplicated: false,
    pubKey: 'pubKey',
  }),
}
MathJaxPending.args = {
  ...args,
  messages: mock_messages({
    id: '32',
    type: 1,
    media: undefined,
    message: String.raw`Check this out: $$\sum_{i=0}^n i = \frac{n(n+1)}{2}$$ This is the formula I told you about`,
    createdAt: 0,
    date: '12:46',
    nickname: 'vader',
    isRegistered: true,
    isDuplicated: false,
    pubKey: 'pubKey',
  }),
  pendingMessages: {
    32: {
      id: '32',
      status: 0,
    },
  },
}
MathJaxBeginning.args = {
  ...args,
  messages: mock_messages({
    id: '32',
    type: 1,
    media: undefined,
    message: String.raw`$$a^2 +b^2=c^2$$`,
    createdAt: 0,
    date: '12:46',
    nickname: 'vader',
    isRegistered: true,
    isDuplicated: false,
    pubKey: 'pubKey',
  }),
}

const component: ComponentMeta<typeof ChannelComponent> = {
  title: 'Components/ChannelComponent',
  decorators: [withTheme],
  component: ChannelComponent,
}

export default component
