import React from 'react'
import { renderComponent } from '../../../testUtils/renderComponent'
import { DateTime } from 'luxon'
import { ChannelMessagesComponent } from './ChannelMessages'

describe('ChannelMessages', () => {
  beforeEach(() => {
    window.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }))
  })

  it('renders component', async () => {
    const message = {
      id: 'string',
      type: 1,
      message: 'string',
      createdAt: 1636995488.44,
      date: 'string',
      nickname: 'string',
      isDuplicated: false,
      isRegistered: true,
      pubKey: 'string',
    }

    jest.spyOn(DateTime, 'utc').mockImplementationOnce(() => {
      const dt = DateTime.utc(2019, 3, 7, 13, 3, 48)
      if (!dt.isValid) {
        throw new Error('This is just here to satisfy the DateTime<true> requirement')
      }
      return dt
    })

    const messages = {
      Today: [[message]],
    }

    const result = renderComponent(
      <ChannelMessagesComponent
        duplicatedUsernameModalHandleOpen={jest.fn()}
        unregisteredUsernameModalHandleOpen={jest.fn()}
        messages={messages}
        scrollbarRef={React.createRef()}
        onScroll={jest.fn()}
        openUrl={jest.fn()}
      />
    )

    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <div
            class="ChannelMessagesComponentscroll css-5o22xt"
            data-testid="channelContent"
          >
            <div
              class="MuiGrid-root MuiGrid-container css-1evpnhk-MuiGrid-root"
            >
              <div
                class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-true css-1vd824g-MuiGrid-root"
              />
              <div
                class="MuiGrid-root MuiGrid-item FloatingDatetitleDiv css-13i4rnv-MuiGrid-root"
                style="opacity: 0; pointer-events: none;"
              >
                <p
                  class="MuiTypography-root MuiTypography-body1 FloatingDatedateText css-ghvhpl-MuiTypography-root"
                >
                  Today
                </p>
              </div>
              <div
                class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-true css-1vd824g-MuiGrid-root"
              />
            </div>
            <ul
              class="MuiList-root ChannelMessagesComponentlist css-1mk9mw3-MuiList-root"
              id="messages-scroll"
            >
              <div>
                <div
                  aria-label="Messages from Today"
                  class="MuiGrid-root MuiGrid-container css-1oqe91p-MuiGrid-root"
                >
                  <div
                    class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-true css-1vd824g-MuiGrid-root"
                  >
                    <div
                      class="DateDividerdivider"
                    />
                  </div>
                  <div
                    class="MuiGrid-root MuiGrid-item DateDividertitleDiv css-13i4rnv-MuiGrid-root"
                  >
                    <p
                      class="MuiTypography-root MuiTypography-body1 DateDividerdateText css-ghvhpl-MuiTypography-root"
                    >
                      Today
                    </p>
                  </div>
                  <div
                    class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-true css-1vd824g-MuiGrid-root"
                  >
                    <div
                      class="DateDividerdivider"
                    />
                  </div>
                </div>
                <li
                  class="MuiListItem-root MuiListItem-gutters MuiListItem-padding BasicMessageComponentwrapper css-1v3s10o-MuiListItem-root"
                >
                  <div
                    class="MuiListItemText-root BasicMessageComponentmessageCard css-tlelie-MuiListItemText-root"
                    data-testid="userMessagesWrapper-string-string"
                  >
                    <div
                      class="MuiGrid-root MuiGrid-container MuiGrid-wrap-xs-nowrap css-aii0rt-MuiGrid-root"
                    >
                      <div
                        class="MuiGrid-root MuiGrid-item BasicMessageComponentavatar css-13i4rnv-MuiGrid-root"
                      >
                        <div
                          class="BasicMessageComponentalignAvatar"
                        >
                          Jdenticon
                        </div>
                      </div>
                      <div
                        class="MuiGrid-root MuiGrid-container MuiGrid-item css-1f064cs-MuiGrid-root"
                      >
                        <div
                          class="MuiGrid-root MuiGrid-container MuiGrid-item css-89gxc5-MuiGrid-root"
                        >
                          <div
                            class="MuiGrid-root MuiGrid-container MuiGrid-item MuiGrid-wrap-xs-nowrap MuiGrid-grid-xs-true css-181g0at-MuiGrid-root"
                          >
                            <div
                              class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
                            >
                              <p
                                class="MuiTypography-root MuiTypography-body1 BasicMessageComponentusername css-cl2jau-MuiTypography-root"
                              >
                                string
                              </p>
                            </div>
                            <div
                              class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
                            >
                              <p
                                class="MuiTypography-root MuiTypography-body1 BasicMessageComponenttime css-ghvhpl-MuiTypography-root"
                              >
                                string
                              </p>
                            </div>
                          </div>
                        </div>
                        <div
                          class="MuiGrid-root MuiGrid-container MuiGrid-direction-xs-column css-1vpwcmr-MuiGrid-root"
                          data-testid="userMessages-string-string"
                          style="margin-top: -3px;"
                        >
                          <div
                            class="MuiGrid-root MuiGrid-item css-15myz84-MuiGrid-root"
                          >
                            <span
                              class="MuiTypography-root MuiTypography-body1 TextMessagemessage css-19mj63n-MuiTypography-root"
                              data-testid="messagesGroupContent-string"
                            >
                              string
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </div>
            </ul>
          </div>
        </div>
      </body>
    `)
  })
})
