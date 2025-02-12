import React from 'react'
import { renderComponent } from '../../../testUtils'
import WarningModal from './WarningModal'

describe('WarningModal', () => {
  it('renders component', () => {
    const result = renderComponent(
      <WarningModal open handleClose={jest.fn()} title='Warning' subtitle='This is a warning' />
    )
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body
        style="padding-right: 1024px; overflow: hidden;"
      >
        <div
          aria-hidden="true"
        />
        <div
          class="MuiModal-root css-1on48p8-MuiModal-root"
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
                  class="MuiGrid-root MuiGrid-container MuiGrid-direction-xs-column css-18sr2lk-MuiGrid-root"
                >
                  <div
                    class="MuiGrid-root MuiGrid-container WarningModalinfo css-1lym95h-MuiGrid-root"
                  >
                    <div
                      class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
                    >
                      <img
                        src="test-file-stub"
                      />
                    </div>
                  </div>
                  <div
                    class="MuiGrid-root MuiGrid-container MuiGrid-item css-1h16bbz-MuiGrid-root"
                  >
                    <div
                      class="MuiGrid-root MuiGrid-item WarningModaltitle css-13i4rnv-MuiGrid-root"
                    >
                      <h3
                        class="MuiTypography-root MuiTypography-h3 css-ptjqt4-MuiTypography-root"
                        data-testid="warningModalTitle"
                      >
                        Warning
                      </h3>
                    </div>
                  </div>
                  <div
                    class="MuiGrid-root MuiGrid-container MuiGrid-item css-1h16bbz-MuiGrid-root"
                  >
                    <div
                      class="MuiGrid-root MuiGrid-item WarningModalsubTitle css-13i4rnv-MuiGrid-root"
                    >
                      <p
                        class="MuiTypography-root MuiTypography-body2 css-16d47hw-MuiTypography-root"
                        data-testid="warningModalSubtitle"
                      >
                        This is a warning
                      </p>
                    </div>
                  </div>
                  <div
                    class="MuiGrid-root MuiGrid-container MuiGrid-spacing-xs-8 css-m7r6nl-MuiGrid-root"
                  >
                    <div
                      class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-4 css-gj1fbr-MuiGrid-root"
                    >
                      <button
                        class="MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary MuiButton-sizeLarge MuiButton-containedSizeLarge MuiButton-fullWidth MuiButton-root MuiButton-contained MuiButton-containedPrimary MuiButton-sizeLarge MuiButton-containedSizeLarge MuiButton-fullWidth WarningModalbutton css-l6ws65-MuiButtonBase-root-MuiButton-root"
                        data-testid="warningModalSubmit"
                        tabindex="0"
                        type="submit"
                      >
                        Continue
                        <span
                          class="MuiTouchRipple-root css-8je8zh-MuiTouchRipple-root"
                        />
                      </button>
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
      </body>
    `)
  })
})
