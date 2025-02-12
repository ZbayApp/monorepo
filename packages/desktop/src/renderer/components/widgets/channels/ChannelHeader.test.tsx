import React from 'react'

import { renderComponent } from '../../../testUtils/renderComponent'
import { ChannelHeaderComponent } from './ChannelHeader'

describe('ChannelHeader', () => {
  it('hides context menu', () => {
    const result = renderComponent(<ChannelHeaderComponent channelName='general' enableContextMenu={false} />)
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <div
            class="ChannelHeaderComponentwrapper css-fn2ma0"
          >
            <div
              class="MuiGrid-root MuiGrid-container ChannelHeaderComponentroot css-9cyib4-MuiGrid-root"
            >
              <div
                class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
              >
                <div
                  class="MuiGrid-root MuiGrid-container MuiGrid-item css-lx31tv-MuiGrid-root"
                >
                  <div
                    class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
                  >
                    <h6
                      class="MuiTypography-root MuiTypography-subtitle1 MuiTypography-noWrap ChannelHeaderComponenttitle ChannelHeaderComponentbold css-b4jm9l-MuiTypography-root"
                      data-testid="channelTitle"
                      style="max-width: 724px;"
                    >
                      #general
                    </h6>
                  </div>
                </div>
              </div>
              <div
                class="MuiGrid-root MuiGrid-container MuiGrid-item MuiGrid-grid-xs-true ChannelHeaderComponentactions css-s0ysqh-MuiGrid-root"
              />
            </div>
          </div>
        </div>
      </body>
    `)
  })
  it('reveals context menu', () => {
    const result = renderComponent(<ChannelHeaderComponent channelName='general' enableContextMenu={true} />)
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <div
            class="ChannelHeaderComponentwrapper css-fn2ma0"
          >
            <div
              class="MuiGrid-root MuiGrid-container ChannelHeaderComponentroot css-9cyib4-MuiGrid-root"
            >
              <div
                class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
              >
                <div
                  class="MuiGrid-root MuiGrid-container MuiGrid-item css-lx31tv-MuiGrid-root"
                >
                  <div
                    class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
                  >
                    <h6
                      class="MuiTypography-root MuiTypography-subtitle1 MuiTypography-noWrap ChannelHeaderComponenttitle ChannelHeaderComponentbold css-b4jm9l-MuiTypography-root"
                      data-testid="channelTitle"
                      style="max-width: 724px;"
                    >
                      #general
                    </h6>
                  </div>
                </div>
              </div>
              <div
                class="MuiGrid-root MuiGrid-container MuiGrid-item MuiGrid-grid-xs-true ChannelHeaderComponentactions css-s0ysqh-MuiGrid-root"
              >
                <div
                  class="MuiGrid-root MuiGrid-item ChannelHeaderComponentmenu css-13i4rnv-MuiGrid-root"
                  data-testid="channelContextMenuButton"
                >
                  <svg
                    aria-hidden="true"
                    class="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium css-i4bv87-MuiSvgIcon-root"
                    data-testid="MoreHorizIcon"
                    focusable="false"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    `)
  })
})
