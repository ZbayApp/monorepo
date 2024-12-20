import { DownloadState } from '@quiet/types'
import React from 'react'

import { renderComponent } from '../../../../testUtils/renderComponent'
import FileComponent from './FileComponent'

describe('FileComponent', () => {
  it('renders component', () => {
    const result = renderComponent(
      <FileComponent
        message={{
          id: '32',
          type: 2,
          isDuplicated: false,
          isRegistered: true,
          pubKey: 'string',
          media: {
            cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
            message: {
              channelId: 'general',
              id: 'wgtlstx3u7',
            },
            ext: '.zip',
            name: 'my-file-name-goes-here-an-isnt-truncated',
            size: 2048,
            width: 1200,
            height: 580,
            path: 'files/my-file-name-goes-here-an-isnt-truncated.zip',
          },
          message: '',
          createdAt: 0,
          date: '12:46',
          nickname: 'vader',
        }}
        downloadStatus={{
          mid: '32',
          cid: '12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY',
          downloadState: DownloadState.Ready,
          downloadProgress: undefined,
        }}
      />
    )
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <div
            class="css-7vq9um"
            data-testid="12D3KooWSYQf8zzr5rYnUdLxYyLzHruQHPaMssja1ADifGAcN3qY-fileComponent"
          >
            <span>
              <div
                aria-label=""
                class=""
                data-mui-internal-clone-element="true"
                style="display: flex;"
              >
                <div
                  class="FileComponenticon"
                >
                  <img
                    class="FileComponentfileIcon"
                    src="test-file-stub"
                  />
                </div>
                <div
                  class="FileComponentfilename"
                >
                  <h5
                    class="MuiTypography-root MuiTypography-h5 css-11l3dv4-MuiTypography-root"
                    style="line-height: 20px;"
                  >
                    my-file-name-goes-here-an-isnt-truncated
                    .zip
                  </h5>
                  <p
                    class="MuiTypography-root MuiTypography-body2 css-16d47hw-MuiTypography-root"
                    style="line-height: 20px; color: rgb(127, 127, 127);"
                  >
                    2 KB
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
                    style="color: rgb(103, 191, 211); margin-left: 8px;"
                  >
                    Download file
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    `)
  })
})
