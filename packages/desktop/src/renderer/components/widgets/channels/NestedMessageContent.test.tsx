import React from 'react'
import '@testing-library/jest-dom/extend-expect'
import { DownloadState, DownloadStatus } from '@quiet/types'
import { AUTODOWNLOAD_SIZE_LIMIT } from '@quiet/state-manager'
import { generateMessages, renderComponent } from '../../../testUtils'
import { FileActionsProps } from '../../Channel/File/FileComponent/FileComponent'
import { screen } from '@testing-library/dom'

import NestedMessageContent, { NestedMessageContentProps } from './NestedMessageContent'

describe('NestedMessageContent', () => {
  it('renders message', () => {
    const messages = generateMessages()
    const result = renderComponent(<NestedMessageContent pending={false} message={messages[0]} openUrl={jest.fn()} />)
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <div
            class="MuiGrid-root MuiGrid-item css-15myz84-MuiGrid-root"
          >
            <span
              class="MuiTypography-root MuiTypography-body1 TextMessagemessage css-llt4u8-MuiTypography-root"
              data-testid="messagesGroupContent-0"
            >
              message0
            </span>
          </div>
        </div>
      </body>
    `)
  })

  it('renders pending message', () => {
    const messages = generateMessages()
    const result = renderComponent(<NestedMessageContent pending={true} message={messages[0]} openUrl={jest.fn()} />)
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <div
            class="MuiGrid-root MuiGrid-item css-15myz84-MuiGrid-root"
          >
            <span
              class="MuiTypography-root MuiTypography-body1 TextMessagemessage TextMessagepending css-llt4u8-MuiTypography-root"
              data-testid="messagesGroupContent-0"
            >
              message0
            </span>
          </div>
        </div>
      </body>
    `)
  })

  it('renders proper download status for malicious file', async () => {
    // TODO: add tests for the rest of statuses
    const messages = generateMessages({ type: 2 })

    const message = {
      ...messages[0],
      media: {
        path: 'path/to/file/test.png',
        name: 'test',
        ext: '.png',
        cid: 'abcd1234',
        width: 500,
        height: 600,
        size: AUTODOWNLOAD_SIZE_LIMIT - 2048,
        message: {
          id: 'string',
          channelId: 'general',
        },
      },
    }
    const downloadStatus: DownloadStatus = {
      mid: message.id,
      cid: message.media.cid,
      downloadState: DownloadState.Malicious,
      downloadProgress: {
        size: 10000,
        downloaded: 10000,
        transferSpeed: 500,
      },
    }
    const result = renderComponent(
      <NestedMessageContent pending={false} message={message} downloadStatus={downloadStatus} openUrl={jest.fn()} />
    )
    expect(await screen.findByText('File not valid. Download canceled.')).toBeVisible()
  })

  it('renders info message', () => {
    const messages = generateMessages({ type: 3 })
    const result = renderComponent(<NestedMessageContent pending={true} message={messages[0]} openUrl={jest.fn()} />)
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <div
            class="MuiGrid-root MuiGrid-item css-15myz84-MuiGrid-root"
          >
            <span
              class="MuiTypography-root MuiTypography-body1 TextMessagemessage TextMessagepending css-llt4u8-MuiTypography-root"
              data-testid="messagesGroupContent-0"
            >
              message0
            </span>
          </div>
        </div>
      </body>
    `)
  })

  it('renders file', () => {
    const messages = generateMessages({ type: 2 })

    const message = {
      ...messages[0],
      media: {
        path: 'path/to/file/test.png',
        name: 'test',
        ext: '.png',
        cid: 'abcd1234',
        width: 500,
        height: 600,
        size: AUTODOWNLOAD_SIZE_LIMIT - 2048,
        message: {
          id: 'string',
          channelId: 'general',
        },
      },
    }
    const result = renderComponent(<NestedMessageContent pending={false} message={message} openUrl={jest.fn()} />)
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <div
            class="MuiGrid-root MuiGrid-item css-15myz84-MuiGrid-root"
          >
            <div
              class="NestedMessageContentmessage"
              data-testid="messagesGroupContent-0"
            >
              <div
                class="css-gd4qex"
              >
                <div
                  class="UploadedImagecontainer"
                >
                  <div
                    class="UploadedImageimage"
                    data-testid="abcd1234-imageVisual"
                  >
                    <p
                      class="css-h94c3"
                    >
                      test.png
                    </p>
                    <img
                      class="UploadedImageimage"
                      src="path/to/file/test.png"
                      style="width: 400px;"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    `)
  })

  it('renders large image as file', () => {
    const messages = generateMessages({ type: 2 })

    const message = {
      ...messages[0],
      media: {
        path: 'path/to/file/test.png',
        name: 'test',
        ext: '.png',
        cid: 'abcd1234',
        width: 500,
        height: 600,
        size: AUTODOWNLOAD_SIZE_LIMIT + 2048,
        message: {
          id: 'string',
          channelId: 'general',
        },
      },
    }

    const fileComponentProps: NestedMessageContentProps & FileActionsProps = {
      downloadStatus: {
        mid: 'mid',
        cid: 'cid',
        downloadState: DownloadState.Downloading,
        downloadProgress: {
          size: AUTODOWNLOAD_SIZE_LIMIT + 2048,
          downloaded: AUTODOWNLOAD_SIZE_LIMIT / 2,
          transferSpeed: 1000,
        },
      },
      openUrl: jest.fn(),
      openContainingFolder: jest.fn(),
      downloadFile: jest.fn(),
      cancelDownload: jest.fn(),
      message: message,
      pending: false,
    }

    const result = renderComponent(<NestedMessageContent {...fileComponentProps} />)
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <div
            class="MuiGrid-root MuiGrid-item css-15myz84-MuiGrid-root"
          >
            <div
              class="NestedMessageContentmessage"
              data-testid="messagesGroupContent-0"
            >
              <div
                class="css-7vq9um"
                data-testid="abcd1234-fileComponent"
              >
                <span>
                  <div
                    class=""
                    data-mui-internal-clone-element="true"
                    style="display: flex;"
                  >
                    <div
                      class="FileComponenticon"
                    >
                      <span
                        aria-valuenow="100"
                        class="MuiCircularProgress-root MuiCircularProgress-determinate MuiCircularProgress-colorPrimary css-1036n7b-MuiCircularProgress-root"
                        role="progressbar"
                        style="width: 18px; height: 18px; transform: rotate(-90deg); position: absolute; color: rgb(231, 231, 231);"
                      >
                        <svg
                          class="MuiCircularProgress-svg css-1idz92c-MuiCircularProgress-svg"
                          viewBox="22 22 44 44"
                        >
                          <circle
                            class="MuiCircularProgress-circle MuiCircularProgress-circleDeterminate css-oxts8u-MuiCircularProgress-circle"
                            cx="44"
                            cy="44"
                            fill="none"
                            r="20"
                            stroke-width="4"
                            style="stroke-dasharray: 125.664; stroke-dashoffset: 0.000px;"
                          />
                        </svg>
                      </span>
                      <span
                        aria-valuenow="50"
                        class="MuiCircularProgress-root MuiCircularProgress-determinate MuiCircularProgress-colorPrimary css-1036n7b-MuiCircularProgress-root"
                        role="progressbar"
                        style="width: 18px; height: 18px; transform: rotate(-90deg); color: rgb(178, 178, 178);"
                      >
                        <svg
                          class="MuiCircularProgress-svg css-1idz92c-MuiCircularProgress-svg"
                          viewBox="22 22 44 44"
                        >
                          <circle
                            class="MuiCircularProgress-circle MuiCircularProgress-circleDeterminate css-oxts8u-MuiCircularProgress-circle"
                            cx="44"
                            cy="44"
                            fill="none"
                            r="20"
                            stroke-width="4"
                            style="stroke-dasharray: 125.664; stroke-dashoffset: 62.838px;"
                          />
                        </svg>
                      </span>
                    </div>
                    <div
                      class="FileComponentfilename"
                    >
                      <h5
                        class="MuiTypography-root MuiTypography-h5 css-11l3dv4-MuiTypography-root"
                        style="line-height: 20px;"
                      >
                        test
                        .png
                      </h5>
                      <p
                        class="MuiTypography-root MuiTypography-body2 css-16d47hw-MuiTypography-root"
                        style="line-height: 20px; color: rgb(127, 127, 127);"
                      >
                        20 MB
                      </p>
                    </div>
                  </div>
                </span>
                <div
                  style="padding-top: 16px; display: block;"
                >
                  <div
                    style="cursor: pointer;"
                  >
                    <div
                      class="css-1vnortn"
                    >
                      <img
                        class="FileComponentactionIcon"
                        src="test-file-stub"
                      />
                      <p
                        class="MuiTypography-root MuiTypography-body2 css-16d47hw-MuiTypography-root"
                        style="color: rgb(127, 127, 127); margin-left: 8px;"
                      >
                        Downloading...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    `)
  })
})
