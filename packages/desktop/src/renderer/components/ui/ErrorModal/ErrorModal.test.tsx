import React from 'react'

import { renderComponent } from '../../../testUtils/renderComponent'
import { ErrorModalComponent } from './ErrorModalComponent'

describe('ErrorModal', () => {
  it('renders component', () => {
    const result = renderComponent(
      <ErrorModalComponent
        open
        message='Test error message'
        traceback='Error: Test error message, error traceback'
        handleClose={jest.fn()}
        restartApp={jest.fn()}
        testMode={true}
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
                  >
                    Error
                  </h6>
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
                  class="MuiGrid-root MuiGrid-container MuiGrid-spacing-xs-3 MuiGrid-direction-xs-column css-7mhs2c-MuiGrid-root"
                >
                  <div
                    class="MuiGrid-root MuiGrid-container MuiGrid-item MuiGrid-direction-xs-column css-67pqv6-MuiGrid-root"
                  >
                    <img
                      class="ErrorModalComponenticon"
                      src="test-file-stub"
                    />
                    <h3
                      class="MuiTypography-root MuiTypography-h3 ErrorModalComponentmessage css-ptjqt4-MuiTypography-root"
                    >
                      Test error message
                    </h3>
                  </div>
                  <div
                    class="MuiGrid-root MuiGrid-container MuiGrid-item MuiGrid-spacing-xs-2 MuiGrid-direction-xs-column css-10h8c1q-MuiGrid-root"
                  >
                    <div
                      class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
                    >
                      <p
                        class="MuiTypography-root MuiTypography-body2 ErrorModalComponentinfo css-16d47hw-MuiTypography-root"
                      >
                        This error traceback was sent to centralized server.
                      </p>
                    </div>
                    <div
                      class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
                    >
                      <div
                        class="MuiFormControl-root MuiFormControl-fullWidth MuiTextField-root css-wb57ya-MuiFormControl-root-MuiTextField-root"
                      >
                        <div
                          class="MuiInputBase-root MuiOutlinedInput-root ErrorModalComponenttextfield MuiInputBase-colorPrimary Mui-disabled ErrorModalComponentcssDisabled MuiInputBase-fullWidth MuiInputBase-formControl MuiInputBase-multiline ErrorModalComponentstackTrace css-ycm7do-MuiInputBase-root-MuiOutlinedInput-root"
                        >
                          <textarea
                            aria-invalid="false"
                            class="MuiInputBase-input MuiOutlinedInput-input Mui-disabled ErrorModalComponentcssDisabled MuiInputBase-inputMultiline css-1qk1us7-MuiInputBase-input-MuiOutlinedInput-input"
                            disabled=""
                            id="traceback"
                            rows="10"
                            style="height: 0px; overflow: hidden;"
                          >
                            Error: Test error message, error traceback
                          </textarea>
                          <textarea
                            aria-hidden="true"
                            class="MuiInputBase-input MuiOutlinedInput-input Mui-disabled ErrorModalComponentcssDisabled MuiInputBase-inputMultiline css-1qk1us7-MuiInputBase-input-MuiOutlinedInput-input"
                            readonly=""
                            style="visibility: hidden; position: absolute; overflow: hidden; height: 0px; top: 0px; left: 0px; transform: translateZ(0); padding: 0px; width: 100%;"
                            tabindex="-1"
                          />
                          <fieldset
                            aria-hidden="true"
                            class="MuiOutlinedInput-notchedOutline css-9425fu-MuiOutlinedInput-notchedOutline"
                          >
                            <legend
                              class="css-ihdtdm"
                            >
                              <span
                                class="notranslate"
                              >
                                ​
                              </span>
                            </legend>
                          </fieldset>
                        </div>
                      </div>
                    </div>
                    <div
                      class="MuiGrid-root MuiGrid-container MuiGrid-item css-capmjd-MuiGrid-root"
                    >
                      <button
                        class="MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium ErrorModalComponentbutton css-1zu9wc-MuiButtonBase-root-MuiButton-root"
                        tabindex="0"
                        type="button"
                      >
                        Restart
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
