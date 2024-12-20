import React from 'react'
import { ComponentStory, ComponentMeta } from '@storybook/react'
import FileComponent, { FileComponentProps } from './FileComponent'
import { withTheme } from '../../../../storybook/decorators'
import { DownloadState } from '@quiet/types'
import { createLogger } from '../../../../logger'

const logger = createLogger('fileComponent:stories')

const Template: ComponentStory<typeof FileComponent> = args => {
  return (
    <div style={{ marginTop: '40px' }}>
      <FileComponent {...args} />
    </div>
  )
}

export const Uploading = Template.bind({})
export const Hosted = Template.bind({})
export const Queued = Template.bind({})
export const Ready = Template.bind({})
export const Downloading = Template.bind({})
export const Canceled = Template.bind({})
export const Canceling = Template.bind({})
export const Completed = Template.bind({})
export const Malicious = Template.bind({})

const mid = '32'
const cid = '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY'

const args: FileComponentProps = {
  message: {
    id: '32',
    isDuplicated: false,
    isRegistered: true,
    pubKey: 'pubKey',
    type: 2,
    media: {
      cid: cid,
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
  },
  downloadStatus: {
    mid: mid,
    cid: cid,
    downloadState: DownloadState.Ready,
    downloadProgress: undefined,
  },
}

Uploading.args = {
  ...args,
  message: {
    ...args.message,
    // @ts-expect-error
    media: {
      ...args.message.media,
      size: undefined,
    },
  },
  downloadStatus: {
    mid: mid,
    cid: cid,
    downloadState: DownloadState.Uploading,
    downloadProgress: undefined,
  },
}
Hosted.args = {
  ...args,
  downloadStatus: {
    mid: mid,
    cid: cid,
    downloadState: DownloadState.Hosted,
    downloadProgress: undefined,
  },
}
Queued.args = {
  ...args,
  downloadStatus: {
    mid: mid,
    cid: cid,
    downloadState: DownloadState.Queued,
    downloadProgress: {
      size: 2048,
      downloaded: 0,
      transferSpeed: 0,
    },
  },
  cancelDownload: () => {
    logger.info('cancel download')
  },
}
Ready.args = {
  ...args,
  downloadFile: () => {
    logger.info('download file')
  },
}
Downloading.args = {
  ...args,
  downloadStatus: {
    mid: mid,
    cid: cid,
    downloadState: DownloadState.Downloading,
    downloadProgress: {
      size: 1024,
      downloaded: 256,
      transferSpeed: 32,
    },
  },
  cancelDownload: () => {
    logger.info('cancel download')
  },
}
Canceling.args = {
  ...args,
  downloadStatus: {
    mid: mid,
    cid: cid,
    downloadState: DownloadState.Canceling,
  },
}
Canceled.args = {
  ...args,
  downloadStatus: {
    mid: mid,
    cid: cid,
    downloadState: DownloadState.Canceled,
  },
}
Completed.args = {
  ...args,
  downloadStatus: {
    mid: mid,
    cid: cid,
    downloadState: DownloadState.Completed,
    downloadProgress: {
      size: 1024,
      downloaded: 1024,
      transferSpeed: 0,
    },
  },
  openContainingFolder: () => {
    logger.info('show in folder')
  },
}
Malicious.args = {
  ...args,
  downloadStatus: {
    mid: mid,
    cid: cid,
    downloadState: DownloadState.Malicious,
    downloadProgress: undefined,
  },
}

const component: ComponentMeta<typeof FileComponent> = {
  title: 'Components/FileComponent',
  decorators: [withTheme],
  component: FileComponent,
}

export default component
