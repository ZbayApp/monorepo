import React from 'react'
import { renderComponent } from '../../../testUtils/renderComponent'

import { OpenlinkModal } from './OpenlinkModal'

describe('OpenlinkModal', () => {
  it('renders component', () => {
    const result = renderComponent(
      <OpenlinkModal
        url='https://tryquiet.org/'
        open
        isImage
        handleClose={jest.fn()}
        handleConfirm={jest.fn()}
        addToWhitelist={jest.fn()}
        setWhitelistAll={jest.fn()}
      />
    )
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body
        style="padding-right: 1024px; overflow: hidden;"
      >
        <div
          aria-hidden="true"
        />
        <div
          class="MuiModal-root css-1mbrbs1-MuiModal-root"
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
            class="MuiGrid-root MuiGrid-container MuiGrid-direction-xs-column Modalcentered css-6gh8l0-MuiGrid-root"
            tabindex="-1"
          >
            <div
              class="MuiGrid-root MuiGrid-container MuiGrid-item Modalheader css-lx31tv-MuiGrid-root"
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
              class="MuiGrid-root MuiGrid-container MuiGrid-item ModalfullPage css-1h16bbz-MuiGrid-root"
            >
              <div
                class="MuiGrid-root MuiGrid-container MuiGrid-item Modalcontent css-1f064cs-MuiGrid-root"
                style="width: 600px;"
              >
                <div
                  style="overflow: visible; height: 0px; width: 0px;"
                >
                  <div
                    class="rc-scrollbars-container"
                    style="position: relative; overflow: hidden; width: 0px; height: 0px;"
                  >
                    <div
                      class="rc-scrollbars-view"
                      style="position: absolute; top: 0px; left: 0px; right: 0px; bottom: 0px; overflow: scroll; margin-right: 0px; margin-bottom: 0px;"
                    >
                      <div
                        class="MuiGrid-root MuiGrid-container MuiGrid-direction-xs-column css-1bweu1d-MuiGrid-root"
                      >
                        <div
                          class="MuiGrid-root MuiGrid-container MuiGrid-item MuiGrid-direction-xs-column css-67pqv6-MuiGrid-root"
                        >
                          <img
                            class="OpenlinkModalicon"
                            src="test-file-stub"
                          />
                          <h2
                            class="MuiTypography-root MuiTypography-h2 OpenlinkModaltitle css-qahk46-MuiTypography-root"
                          >
                            Watch out!
                          </h2>
                        </div>
                        <div
                          class="MuiGrid-root MuiGrid-container MuiGrid-item MuiGrid-direction-xs-column css-80wlp8-MuiGrid-root"
                        >
                          <div
                            class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
                          >
                            <p
                              class="MuiTypography-root MuiTypography-body2 css-16d47hw-MuiTypography-root"
                            >
                              Opening link posted in Quiet reveals data about you to your goverment, your Internet provider, the site you are visiting and, potentially, to whoever posted the link. Only open links from people you trust. If you are using Quiet to protect your anonymity, never open links.
                            </p>
                          </div>
                        </div>
                        <div
                          class="MuiGrid-root MuiGrid-container MuiGrid-item MuiGrid-direction-xs-column OpenlinkModalcheckboxes css-80wlp8-MuiGrid-root"
                        >
                           
                          <div
                            class="MuiGrid-root MuiGrid-container MuiGrid-item css-capmjd-MuiGrid-root"
                          >
                            <div
                              class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
                            >
                              <span
                                class="MuiButtonBase-root MuiCheckbox-root MuiCheckbox-colorPrimary PrivateSwitchBase-root MuiCheckbox-root MuiCheckbox-colorPrimary MuiCheckbox-root MuiCheckbox-colorPrimary css-p0kowz-MuiButtonBase-root-MuiCheckbox-root"
                              >
                                <input
                                  class="PrivateSwitchBase-input css-1m9pwf3"
                                  data-indeterminate="false"
                                  type="checkbox"
                                />
                                <svg
                                  aria-hidden="true"
                                  class="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium css-i4bv87-MuiSvgIcon-root"
                                  data-testid="CheckBoxOutlineBlankIcon"
                                  focusable="false"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"
                                  />
                                </svg>
                                <span
                                  class="MuiTouchRipple-root css-8je8zh-MuiTouchRipple-root"
                                />
                              </span>
                            </div>
                            <div
                              class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-true OpenlinkModalcheckboxLabel css-1vd824g-MuiGrid-root"
                            >
                              Automatically load images from 
                              <span
                                class="OpenlinkModalbold"
                              >
                                www.tryquiet.org
                              </span>
                              - I trust them with my data and I'm not using Quiet for anonymity protection. 
                            </div>
                          </div>
                          <div
                            class="MuiGrid-root MuiGrid-container MuiGrid-item css-capmjd-MuiGrid-root"
                          >
                            <div
                              class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
                            >
                              <span
                                class="MuiButtonBase-root MuiCheckbox-root MuiCheckbox-colorPrimary PrivateSwitchBase-root MuiCheckbox-root MuiCheckbox-colorPrimary MuiCheckbox-root MuiCheckbox-colorPrimary css-p0kowz-MuiButtonBase-root-MuiCheckbox-root"
                              >
                                <input
                                  class="PrivateSwitchBase-input css-1m9pwf3"
                                  data-indeterminate="false"
                                  type="checkbox"
                                />
                                <svg
                                  aria-hidden="true"
                                  class="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium css-i4bv87-MuiSvgIcon-root"
                                  data-testid="CheckBoxOutlineBlankIcon"
                                  focusable="false"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"
                                  />
                                </svg>
                                <span
                                  class="MuiTouchRipple-root css-8je8zh-MuiTouchRipple-root"
                                />
                              </span>
                            </div>
                            <div
                              class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-true OpenlinkModalcheckboxLabel css-1vd824g-MuiGrid-root"
                            >
                              Don't warn me about 
                              <span
                                class="OpenlinkModalbold"
                              >
                                www.tryquiet.org
                              </span>
                               
                              again, but don't auto-load images.
                            </div>
                          </div>
                          <div
                            class="MuiGrid-root MuiGrid-container MuiGrid-item css-capmjd-MuiGrid-root"
                          >
                            <div
                              class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
                            >
                              <span
                                class="MuiButtonBase-root MuiCheckbox-root MuiCheckbox-colorPrimary PrivateSwitchBase-root MuiCheckbox-root MuiCheckbox-colorPrimary MuiCheckbox-root MuiCheckbox-colorPrimary css-p0kowz-MuiButtonBase-root-MuiCheckbox-root"
                              >
                                <input
                                  class="PrivateSwitchBase-input css-1m9pwf3"
                                  data-indeterminate="false"
                                  type="checkbox"
                                />
                                <svg
                                  aria-hidden="true"
                                  class="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium css-i4bv87-MuiSvgIcon-root"
                                  data-testid="CheckBoxOutlineBlankIcon"
                                  focusable="false"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"
                                  />
                                </svg>
                                <span
                                  class="MuiTouchRipple-root css-8je8zh-MuiTouchRipple-root"
                                />
                              </span>
                            </div>
                            <div
                              class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-true OpenlinkModalcheckboxLabel css-1vd824g-MuiGrid-root"
                            >
                              Never warn me about outbound links on Quiet.
                            </div>
                          </div>
                          <div
                            class="MuiGrid-root MuiGrid-container MuiGrid-item MuiGrid-spacing-xs-2 OpenlinkModalbuttons css-q9fxzi-MuiGrid-root"
                          >
                            <div
                              class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
                            >
                              <button
                                class="MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary MuiButton-sizeLarge MuiButton-containedSizeLarge MuiButton-root MuiButton-contained MuiButton-containedPrimary MuiButton-sizeLarge MuiButton-containedSizeLarge OpenlinkModalbuttonBack css-10kf9y4-MuiButtonBase-root-MuiButton-root"
                                tabindex="0"
                                type="button"
                              >
                                Back to safety
                                <span
                                  class="MuiTouchRipple-root css-8je8zh-MuiTouchRipple-root"
                                />
                              </button>
                            </div>
                            <div
                              class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-true css-1vd824g-MuiGrid-root"
                            >
                              <a
                                href=""
                                style="color: rgb(103, 191, 211); text-decoration: none; word-break: break-all;"
                              >
                                Load image from site www.tryquiet.org
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      class="rc-scrollbars-track rc-scrollbars-track-h"
                      style="position: absolute; right: 2px; bottom: 2px; z-index: 100; border-radius: 3px; left: 2px; height: 6px; display: none;"
                    >
                      <div
                        class="rc-scrollbars-thumb rc-scrollbars-thumb-h"
                        style="position: relative; display: block; height: 100%; cursor: pointer; border-radius: inherit; background-color: rgba(0, 0, 0, 0.2);"
                      />
                    </div>
                    <div
                      class="rc-scrollbars-track rc-scrollbars-track-v"
                      style="position: absolute; right: 2px; bottom: 2px; z-index: 100; border-radius: 3px; top: 2px; width: 6px; display: none;"
                    >
                      <div
                        class="rc-scrollbars-thumb rc-scrollbars-thumb-v"
                        style="position: relative; display: block; height: 100%; cursor: pointer; border-radius: inherit; background-color: rgba(0, 0, 0, 0.2);"
                      />
                    </div>
                  </div>
                </div>
                <div
                  class="resize-triggers"
                >
                  <div
                    class="expand-trigger"
                  >
                    <div
                      style="width: 1px; height: 1px;"
                    />
                  </div>
                  <div
                    class="contract-trigger"
                  />
                </div>
              </div>
            </div>
          </div>
          <div
            data-testid="sentinelEnd"
            tabindex="0"
          />
        </div>
      </body>
    `)
  })
})
