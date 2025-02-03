import React from 'react'
import { renderComponent } from '../../../utils/functions/renderComponent/renderComponent'
import { Chat } from '../Chat.component'
import { Keyboard } from 'react-native'
import { ChatProps } from '../Chat.types'
import { FileActionsProps } from '../../UploadedFile/UploadedFile.types'

jest.useFakeTimers()

describe('Chat component', () => {
  jest
    .spyOn(Keyboard, 'addListener')
    // @ts-expect-error
    .mockImplementation(() => ({ remove: jest.fn() }))

  const props: ChatProps & FileActionsProps = {
    contextMenu: {
      visible: false,
      handleOpen: jest.fn(),
      handleClose: jest.fn(),
    },
    sendMessageAction: jest.fn(),
    loadMessagesAction: jest.fn(),
    handleBackButton: jest.fn(),
    openImagePreview: jest.fn(),
    duplicatedUsernameHandleBack: jest.fn(),
    unregisteredUsernameHandleBack: jest.fn(),
    openUrl: jest.fn(),
    downloadFile: jest.fn(),
    cancelDownload: jest.fn(),
    channel: {
      name: 'general',
      description: '',
      owner: '',
      timestamp: 0,
      id: '',
    },
    pendingMessages: {},
    messages: {
      count: 16,
      groups: {
        '28 Oct': [
          [
            {
              id: '1',
              type: 1,
              message: 'Hello',
              createdAt: 0,
              date: '28 Oct, 10:00',
              nickname: 'alice',
              isDuplicated: false,
              isRegistered: true,
              pubKey: 'test',
            },
            {
              id: '2',
              type: 1,
              message:
                "How are you? My day was awesome. I removed a lot of unused props from container and I simplified code a lot. I like coding, coding is like building things with LEGO. I could admit it's a little bit harder and there's a lot that can go wrong but I like it anyway.",
              createdAt: 0,
              date: '28 Oct, 10:01',
              nickname: 'alice',
              isDuplicated: false,
              isRegistered: true,
              pubKey: 'test',
            },
          ],
          [
            {
              id: '3',
              type: 1,
              message: 'Great, thanks!',
              createdAt: 0,
              date: '28 Oct, 10:02',
              nickname: 'john',
              isDuplicated: false,
              isRegistered: true,
              pubKey: 'test',
            },
          ],
        ],
        Today: [
          [
            {
              id: '4',
              type: 1,
              message: 'Luck, I am your father!',
              createdAt: 0,
              date: '12:40',
              nickname: 'chad',
              isDuplicated: false,
              isRegistered: true,
              pubKey: 'test',
            },
            {
              id: '5',
              type: 1,
              message: "That's impossible!",
              createdAt: 0,
              date: '12:41',
              nickname: 'chad',
              isDuplicated: false,
              isRegistered: true,
              pubKey: 'test',
            },
            {
              id: '6',
              type: 1,
              message: 'Nooo!',
              createdAt: 0,
              date: '12:45',
              nickname: 'chad',
              isDuplicated: false,
              isRegistered: true,
              pubKey: 'test',
            },
          ],
          [
            {
              id: '7',
              type: 1,
              message: 'Uhuhu!',
              createdAt: 0,
              date: '12:46',
              nickname: 'anakin',
              isDuplicated: false,
              isRegistered: true,
              pubKey: 'test',
            },
          ],
          [
            {
              id: '8',
              type: 1,
              message: 'Why?',
              createdAt: 0,
              date: '12:46',
              nickname: 'anakin',
              isDuplicated: false,
              isRegistered: true,
              pubKey: 'test',
            },
          ],
          [
            {
              id: '9',
              type: 1,
              message: 'Messages more there should be',
              createdAt: 0,
              date: '12:46',
              nickname: 'yoda',
              isDuplicated: false,
              isRegistered: true,
              pubKey: 'test',
            },
          ],
          [
            {
              id: '11',
              type: 1,
              message: 'I Agree',
              createdAt: 0,
              date: '12:46',
              nickname: 'obi',
              isDuplicated: false,
              isRegistered: true,
              pubKey: 'test',
            },
            {
              id: '12',
              type: 1,
              message: 'Of course, I Agree',
              createdAt: 0,
              date: '12:46',
              nickname: 'obi',
              isDuplicated: false,
              isRegistered: true,
              pubKey: 'test',
            },
          ],
          [
            {
              id: '13',
              type: 1,
              message: 'Wrough!',
              createdAt: 0,
              date: '12:46',
              nickname: 'wookie',
              isDuplicated: false,
              isRegistered: true,
              pubKey: 'test',
            },
          ],
          [
            {
              id: '14',
              type: 1,
              message: 'Yeah!',
              createdAt: 0,
              date: '12:46',
              nickname: 'leah',
              isDuplicated: false,
              isRegistered: true,
              pubKey: 'test',
            },
          ],
          [
            {
              id: '15',
              type: 1,
              message: 'The more messages the better',
              createdAt: 0,
              date: '12:46',
              nickname: 'luke',
              isDuplicated: false,
              isRegistered: true,
              pubKey: 'test',
            },
          ],
          [
            {
              id: '16',
              type: 1,
              message: 'We cannot grant you the rank of messager',
              createdAt: 0,
              date: '12:46',
              nickname: 'windoo',
              isDuplicated: false,
              isRegistered: true,
              pubKey: 'test',
            },
          ],
          [
            {
              id: '17',
              type: 1,
              message:
                'deathhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhstarrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrdeathstartttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
              createdAt: 0,
              date: '12:46',
              nickname: 'vader',
              isDuplicated: false,
              isRegistered: true,
              pubKey: 'test',
            },
          ],
        ],
      },
    },
    updateUploadedFiles: jest.fn(),
    updateUploadedImages: jest.fn(),
    removeFilePreview: jest.fn(),
  }

  it('renders component', () => {
    const { toJSON } = renderComponent(<Chat {...props} />)

    expect(toJSON()).toMatchSnapshot()
  })
})
