import React, { useState } from 'react'

import { ComponentStory, ComponentMeta } from '@storybook/react'

import { withTheme } from '../../storybook/decorators'
import { mock_messages, users } from '../../storybook/utils'

import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import { DisplayableMessage } from '@quiet/types'

import ChannelComponent from './ChannelComponent'
import { payloadDuplicated, payloadUnregistered } from '../widgets/userLabel/UserLabel.types'

const Template: ComponentStory<typeof ChannelComponent> = () => {
  const [messages, setMessages] = useState<{
    count: number
    groups: {
      [day: string]: DisplayableMessage[][]
    }
  }>(mock_messages())

  const onInputEnter = (message: string) => {
    const _message: DisplayableMessage = {
      id: '32',
      type: 1,
      media: undefined,
      message: message,
      createdAt: 0,
      date: '12:46',
      nickname: users.vader.username,
      isDuplicated: false,
      isRegistered: true,
      pubKey: users.vader.pubkey,
    }
    const _messages = mock_messages(_message)
    setMessages(_messages)
  }

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <ChannelComponent
          onInputEnter={onInputEnter}
          messages={messages}
          pendingMessages={{}}
          newestMessage={{
            id: '31',
            type: 1,
            message: 'I agree!',
            createdAt: 0,
            channelId: 'general',
            signature: 'signature',
            pubKey: 'pubKey',
          }}
          user={{
            id: 'id',
            nickname: 'vader',
            hiddenService: {
              onionAddress: 'onionAddress',
              privateKey: 'privateKey',
            },
            peerId: {
              id: 'id',
              privKey: 'privKey',
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
          }}
          isCommunityInitialized={true}
          uploadedFileModal={{
            open: false,
            handleOpen: function (_args?: any): any {},
            handleClose: function (): any {},
            src: 'images/butterfly.jpeg',
          }}
          channelId={'general'}
          channelName={'general'}
          lazyLoading={function (_load: boolean): void {}}
          onInputChange={function (_value: string): void {}}
          filesData={{}}
          openUrl={function (url: string): void {
            throw new Error('Function not implemented.')
          }}
          openFilesDialog={function (): void {
            throw new Error('Function not implemented.')
          }}
          handleFileDrop={function (arg: any): void {
            throw new Error('Function not implemented.')
          }}
          removeFile={function (id: string): void {
            throw new Error('Function not implemented.')
          }}
          enableContextMenu={false}
          pendingGeneralChannelRecreation={false}
          handleClipboardFiles={function (arg: ArrayBuffer, ext: string, name: string): void {
            throw new Error('Function not implemented.')
          }}
          duplicatedUsernameModalHandleOpen={() => payloadDuplicated}
          unregisteredUsernameModalHandleOpen={() => payloadUnregistered}
        />
      </DndProvider>
    </>
  )
}

export const Component = Template.bind({})

const component: ComponentMeta<typeof ChannelComponent> = {
  title: 'Components/ChannelComponentCypress',
  decorators: [withTheme],
  component: ChannelComponent,
}

export default component
