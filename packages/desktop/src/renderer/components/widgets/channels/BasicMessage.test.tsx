import React from 'react'
import { DateTime } from 'luxon'

import { BasicMessageComponent } from './BasicMessage'

import { renderComponent, generateMessages } from '../../../testUtils'
import { HashRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import store from '../../../store'

describe('BasicMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(DateTime, 'utc').mockImplementationOnce(() => {
      const dt = DateTime.utc(2019, 3, 7, 13, 3, 48)
      if (!dt.isValid) {
        throw new Error('This is just here to satisfy the DateTime<true> requirement')
      }
      return dt
    })
  })

  it('renders component', async () => {
    const messages = generateMessages()
    const result = renderComponent(
      <HashRouter>
        <Provider store={store}>
          <BasicMessageComponent
            duplicatedUsernameModalHandleOpen={jest.fn()}
            unregisteredUsernameModalHandleOpen={jest.fn()}
            messages={messages}
            openUrl={jest.fn()}
          />
        </Provider>
      </HashRouter>
    )
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <li
            class="MuiListItem-root MuiListItem-gutters MuiListItem-padding BasicMessageComponentwrapper css-17bnw67-MuiListItem-root"
          >
            <div
              class="MuiListItemText-root BasicMessageComponentmessageCard css-tlelie-MuiListItemText-root"
              data-testid="userMessagesWrapper-gringo-0"
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
                          gringo
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
                    data-testid="userMessages-gringo-0"
                    style="margin-top: -3px;"
                  >
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
                </div>
              </div>
            </div>
          </li>
        </div>
      </body>
    `)
  })
  it('renders component with multiple messages', async () => {
    const messages = generateMessages({ amount: 2 })
    const result = renderComponent(
      <HashRouter>
        <Provider store={store}>
          <BasicMessageComponent
            duplicatedUsernameModalHandleOpen={jest.fn()}
            unregisteredUsernameModalHandleOpen={jest.fn()}
            messages={messages}
            openUrl={jest.fn()}
          />
        </Provider>
      </HashRouter>
    )
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <li
            class="MuiListItem-root MuiListItem-gutters MuiListItem-padding BasicMessageComponentwrapper css-17bnw67-MuiListItem-root"
          >
            <div
              class="MuiListItemText-root BasicMessageComponentmessageCard css-tlelie-MuiListItemText-root"
              data-testid="userMessagesWrapper-gringo-0"
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
                          gringo
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
                    data-testid="userMessages-gringo-0"
                    style="margin-top: -3px;"
                  >
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
                    <div
                      class="MuiGrid-root MuiGrid-item css-15myz84-MuiGrid-root"
                    >
                      <span
                        class="MuiTypography-root MuiTypography-body1 TextMessagemessage css-llt4u8-MuiTypography-root"
                        data-testid="messagesGroupContent-1"
                      >
                        message1
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </li>
        </div>
      </body>
    `)
  })
  it('renders with separate info messages', async () => {
    const messages = generateMessages({ amount: 2, type: 3 })
    const result = renderComponent(
      <HashRouter>
        <Provider store={store}>
          <BasicMessageComponent
            duplicatedUsernameModalHandleOpen={jest.fn()}
            unregisteredUsernameModalHandleOpen={jest.fn()}
            messages={messages}
            openUrl={jest.fn()}
          />
        </Provider>
      </HashRouter>
    )
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <li
            class="MuiListItem-root MuiListItem-gutters MuiListItem-padding  css-17bnw67-MuiListItem-root"
          >
            <div
              class="MuiListItemText-root BasicMessageComponentmessageCard css-tlelie-MuiListItemText-root"
              data-testid="userMessagesWrapper-gringo-0"
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
                    <img
                      class="BasicMessageComponentinfoIcon"
                      src="test-file-stub"
                    />
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
                          Quiet
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
                    data-testid="userMessages-gringo-0"
                    style="margin-top: -3px;"
                  >
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
                    <div
                      class="MuiGrid-root MuiGrid-item css-15myz84-MuiGrid-root"
                    >
                      <span
                        class="MuiTypography-root MuiTypography-body1 TextMessagemessage css-llt4u8-MuiTypography-root"
                        data-testid="messagesGroupContent-1"
                      >
                        message1
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </li>
        </div>
      </body>
    `)
  })
  it('renders with basic message and info message', async () => {
    const message1 = generateMessages()
    const message2 = generateMessages({ type: 3 })
    const result = renderComponent(
      <HashRouter>
        <Provider store={store}>
          <BasicMessageComponent
            duplicatedUsernameModalHandleOpen={jest.fn()}
            unregisteredUsernameModalHandleOpen={jest.fn()}
            messages={[...message1, ...message2]}
            openUrl={jest.fn()}
          />
        </Provider>
      </HashRouter>
    )
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <li
            class="MuiListItem-root MuiListItem-gutters MuiListItem-padding BasicMessageComponentwrapper css-17bnw67-MuiListItem-root"
          >
            <div
              class="MuiListItemText-root BasicMessageComponentmessageCard css-tlelie-MuiListItemText-root"
              data-testid="userMessagesWrapper-gringo-0"
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
                          gringo
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
                    data-testid="userMessages-gringo-0"
                    style="margin-top: -3px;"
                  >
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
                </div>
              </div>
            </div>
          </li>
        </div>
      </body>
    `)
  })
})
