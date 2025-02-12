import React from 'react'

import MockedSocket from 'socket.io-mock'
import { ioMock } from '../../../shared/setupTests'
import { prepareStore } from '../../testUtils/prepareStore'
import { renderComponent } from '../../testUtils/renderComponent'
import { getFactory, publicChannels, communities, identity } from '@quiet/state-manager'
import SearchModalComponent from './SearchModelComponent'
import { generateChannelId } from '@quiet/common'

describe('Search Modal', () => {
  let socket: MockedSocket

  beforeEach(() => {
    socket = new MockedSocket()
    ioMock.mockImplementation(() => socket)
  })

  it('displays search modal with channels', async () => {
    const { store } = await prepareStore(
      {},
      socket // Fork State manager's sagas
    )

    const factory = await getFactory(store)

    const community =
      await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community')

    const alice = await factory.create<ReturnType<typeof identity.actions.addNewIdentity>['payload']>('Identity', {
      id: community.id,
      nickname: 'alice',
    })

    const channelsMocks = [
      { name: 'fun', timestamp: 1673857606990 },
      { name: 'random', timestamp: 1673854900410 },
      { name: 'test', timestamp: 1673623514097 },
      { name: 'general', timestamp: 1673623514 },
    ]

    for (const channelMock of channelsMocks) {
      await factory.create<ReturnType<typeof publicChannels.actions.addChannel>['payload']>('PublicChannel', {
        channel: {
          name: channelMock.name,
          description: `Welcome to #${channelMock.name}`,
          timestamp: channelMock.timestamp,
          owner: alice.nickname,
          id: generateChannelId(channelMock.name),
        },
      })
    }

    const dynamicSearchedChannels = publicChannels.selectors.dynamicSearchedChannels('')(store.getState())
    const publicChannelsSelector = publicChannels.selectors.publicChannels(store.getState())

    const result = renderComponent(
      <SearchModalComponent
        setCurrentChannel={function (_id: string): void {}}
        setChannelInput={function (_id: React.SetStateAction<string>): void {}}
        dynamicSearchedChannelsSelector={dynamicSearchedChannels}
        publicChannelsSelector={publicChannelsSelector}
        unreadChannelsSelector={[]}
        channelInput={''}
        handleClose={function (): any {}}
        open={true}
      />
    )

    expect(result).toMatchInlineSnapshot(`
      Object {
        "asFragment": [Function],
        "baseElement": <body
          style="padding-right: 1024px; overflow: hidden;"
        >
          <div
            aria-hidden="true"
          />
          <div
            class="MuiModal-root css-1on48p8-MuiModal-root"
            data-testid="searchChannelModal"
            role="presentation"
          >
            <div
              aria-hidden="true"
              class="MuiBackdrop-root css-i9fmh8-MuiBackdrop-root-MuiModal-backdrop"
              style="opacity: 1; webkit-transition: opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms; transition: opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;"
            />
            <div
              data-testid="sentinelStart"
              tabindex="0"
            />
            <div
              class="MuiGrid-root MuiGrid-container MuiGrid-direction-xs-column Modalcentered Modaltransparent css-6gh8l0-MuiGrid-root"
              tabindex="-1"
            >
              <div
                class="MuiGrid-root MuiGrid-container MuiGrid-item Modalheader Modalnone css-lx31tv-MuiGrid-root"
              >
                <div
                  class="MuiGrid-root MuiGrid-container MuiGrid-item MuiGrid-grid-xs-true css-1r61agb-MuiGrid-root"
                >
                  <div
                    class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-true css-1vd824g-MuiGrid-root"
                  >
                    <h6
                      class="MuiTypography-root MuiTypography-subtitle1 MuiTypography-alignCenter Modaltitle css-jxzupi-MuiTypography-root"
                      style="margin-left: 36px;"
                    />
                  </div>
                  <div
                    class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
                  >
                    <div
                      class="MuiGrid-root MuiGrid-container MuiGrid-item Modalactions css-hoc6b0-MuiGrid-root"
                      data-testid="ModalActions"
                    >
                      <button
                        class="MuiButtonBase-root MuiIconButton-root IconButtonroot MuiIconButton-sizeMedium css-1hpikoh-MuiButtonBase-root-MuiIconButton-root"
                        tabindex="0"
                        type="button"
                      >
                        <svg
                          aria-hidden="true"
                          class="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium css-i4bv87-MuiSvgIcon-root"
                          data-testid="ClearIcon"
                          focusable="false"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                          />
                        </svg>
                        <span
                          class="MuiTouchRipple-root css-8je8zh-MuiTouchRipple-root"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div
                class="MuiGrid-root MuiGrid-container MuiGrid-item ModalfullPage ModalwithoutHeader Modaltransparent css-1h16bbz-MuiGrid-root"
              >
                <div
                  class="MuiGrid-root MuiGrid-container MuiGrid-item Modalcontent Modaltransparent css-1f064cs-MuiGrid-root"
                >
                  <div
                    class="MuiGrid-root MuiGrid-container MuiGrid-direction-xs-column SearchModalComponentroot css-7qrazo-MuiGrid-root"
                  >
                    <div
                      class="MuiGrid-root MuiGrid-container SearchModalComponentoverlay css-1hbmzt3-MuiGrid-root"
                    >
                      <div
                        class="MuiGrid-root MuiGrid-item SearchModalComponentmodalContainer css-1rx0eue-MuiGrid-root"
                      >
                        <div
                          class="MuiGrid-root MuiGrid-container MuiGrid-item SearchModalComponentwrapper css-89gxc5-MuiGrid-root"
                        >
                          <div
                            class="MuiGrid-root MuiGrid-item SearchModalComponentinputWrapper css-9heeuj-MuiGrid-root"
                          >
                            <img
                              class="SearchModalComponentmagnifyingGlassIcon"
                              src="test-file-stub"
                            />
                            <div
                              class="MuiFormControl-root MuiFormControl-fullWidth MuiTextField-root SearchModalComponentinput css-wb57ya-MuiFormControl-root-MuiTextField-root"
                              data-testid="searchChannelInput"
                            >
                              <div
                                class="MuiInputBase-root MuiInput-root MuiInput-underline MuiInputBase-colorPrimary MuiInputBase-fullWidth Mui-focused MuiInputBase-formControl css-4l3wau-MuiInputBase-root-MuiInput-root"
                              >
                                <input
                                  aria-invalid="false"
                                  class="MuiInputBase-input MuiInput-input css-ume8vi-MuiInputBase-input-MuiInput-input"
                                  id=":r0:"
                                  name="searchChannel"
                                  placeholder="Channel name"
                                  type="text"
                                  value=""
                                />
                              </div>
                            </div>
                            <p
                              class="MuiTypography-root MuiTypography-body2 css-6gbt2m-MuiTypography-root"
                            />
                          </div>
                          <img
                            class="SearchModalComponentcloseIcon"
                            src="test-file-stub"
                          />
                        </div>
                        <div
                          class="MuiGrid-root SearchModalComponentline css-vj1n65-MuiGrid-root"
                        />
                        <div
                          class="MuiGrid-root MuiGrid-container MuiGrid-direction-xs-column css-1vpwcmr-MuiGrid-root"
                        >
                          <div
                            class="MuiGrid-root SearchModalComponentwrapperRecent css-vj1n65-MuiGrid-root"
                          >
                            <span
                              class="MuiTypography-root MuiTypography-overline SearchModalComponentrecentChannels css-14q85gm-MuiTypography-root"
                            >
                              recent channels
                            </span>
                          </div>
                          <div
                            class="MuiGrid-root MuiGrid-direction-xs-column css-1gkl4f1-MuiGrid-root"
                          >
                            <div
                              class="SearchModalComponentchannelWrapper SearchModalComponentchannelWrapperSelected"
                              tabindex="0"
                            >
                              <p
                                class="MuiTypography-root MuiTypography-body2 css-16d47hw-MuiTypography-root"
                              >
                                # fun
                              </p>
                            </div>
                            <div
                              class="SearchModalComponentchannelWrapper"
                              tabindex="0"
                            >
                              <p
                                class="MuiTypography-root MuiTypography-body2 css-16d47hw-MuiTypography-root"
                              >
                                # random
                              </p>
                            </div>
                            <div
                              class="SearchModalComponentchannelWrapper"
                              tabindex="0"
                            >
                              <p
                                class="MuiTypography-root MuiTypography-body2 css-16d47hw-MuiTypography-root"
                              >
                                # test
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              data-testid="sentinelEnd"
              tabindex="0"
            />
          </div>
        </body>,
        "container": <div
          aria-hidden="true"
        />,
        "debug": [Function],
        "findAllByAltText": [Function],
        "findAllByDisplayValue": [Function],
        "findAllByLabelText": [Function],
        "findAllByPlaceholderText": [Function],
        "findAllByRole": [Function],
        "findAllByTestId": [Function],
        "findAllByText": [Function],
        "findAllByTitle": [Function],
        "findByAltText": [Function],
        "findByDisplayValue": [Function],
        "findByLabelText": [Function],
        "findByPlaceholderText": [Function],
        "findByRole": [Function],
        "findByTestId": [Function],
        "findByText": [Function],
        "findByTitle": [Function],
        "getAllByAltText": [Function],
        "getAllByDisplayValue": [Function],
        "getAllByLabelText": [Function],
        "getAllByPlaceholderText": [Function],
        "getAllByRole": [Function],
        "getAllByTestId": [Function],
        "getAllByText": [Function],
        "getAllByTitle": [Function],
        "getByAltText": [Function],
        "getByDisplayValue": [Function],
        "getByLabelText": [Function],
        "getByPlaceholderText": [Function],
        "getByRole": [Function],
        "getByTestId": [Function],
        "getByText": [Function],
        "getByTitle": [Function],
        "queryAllByAltText": [Function],
        "queryAllByDisplayValue": [Function],
        "queryAllByLabelText": [Function],
        "queryAllByPlaceholderText": [Function],
        "queryAllByRole": [Function],
        "queryAllByTestId": [Function],
        "queryAllByText": [Function],
        "queryAllByTitle": [Function],
        "queryByAltText": [Function],
        "queryByDisplayValue": [Function],
        "queryByLabelText": [Function],
        "queryByPlaceholderText": [Function],
        "queryByRole": [Function],
        "queryByTestId": [Function],
        "queryByText": [Function],
        "queryByTitle": [Function],
        "rerender": [Function],
        "unmount": [Function],
      }
    `)
  })
})
