import React from 'react'

import { renderComponent } from '../../../testUtils/renderComponent'
import { QuitAppDialog } from './QuitAppDialog'

describe('QuitAppDialog', () => {
  it('renders component', () => {
    const result = renderComponent(<QuitAppDialog open handleClose={jest.fn()} handleQuit={jest.fn()} />)

    expect(result.baseElement).toMatchInlineSnapshot(`
      <body
        style="padding-right: 1024px; overflow: hidden;"
      >
        <div
          aria-hidden="true"
        />
        <div
          class="MuiDialog-root MuiModal-root css-1jwcu1u-MuiModal-root-MuiDialog-root"
          role="presentation"
        >
          <div
            aria-hidden="true"
            class="MuiBackdrop-root css-yiavyu-MuiBackdrop-root-MuiDialog-backdrop"
            style="opacity: 1; webkit-transition: opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms; transition: opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;"
          />
          <div
            data-testid="sentinelStart"
            tabindex="0"
          />
          <div
            class="MuiDialog-container MuiDialog-scrollPaper css-hz1bth-MuiDialog-container"
            role="presentation"
            style="opacity: 1; webkit-transition: opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms; transition: opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;"
            tabindex="-1"
          >
            <div
              aria-labelledby=":r0:"
              class="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation24 MuiDialog-paper MuiDialog-paperScrollPaper MuiDialog-paperWidthSm css-1clza1p-MuiPaper-root-MuiDialog-paper"
              role="dialog"
            >
              <div
                class="MuiDialogContent-root QuitAppDialogdialogContent css-ypiqx9-MuiDialogContent-root"
              >
                <p
                  class="MuiTypography-root MuiTypography-body2 QuitAppDialoginfo css-16d47hw-MuiTypography-root"
                >
                  Do you want to quit Quiet?
                </p>
              </div>
              <div
                class="MuiDialogActions-root MuiDialogActions-spacing QuitAppDialogdialogActions css-hlj6pa-MuiDialogActions-root"
              >
                <div
                  class="MuiGrid-root MuiGrid-container css-16g5rpk-MuiGrid-root"
                >
                  <div
                    class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-true QuitAppDialogbuttonNo css-1vd824g-MuiGrid-root"
                  >
                    <p
                      class="MuiTypography-root MuiTypography-body1 QuitAppDialogtypography css-ghvhpl-MuiTypography-root"
                    >
                      No
                    </p>
                  </div>
                  <div
                    class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-true QuitAppDialogbuttonYes css-1vd824g-MuiGrid-root"
                  >
                    <p
                      class="MuiTypography-root MuiTypography-body1 QuitAppDialogtypography css-ghvhpl-MuiTypography-root"
                    >
                      Yes
                    </p>
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
