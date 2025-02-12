import React from 'react'
import { defaultTheme } from '../../../theme'
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles'
import { WelcomeMessage } from './WelcomeMessage'
import { renderComponent } from '../../../testUtils/renderComponent'

describe('WelcomeMessage', () => {
  it('renders component', () => {
    const theme = defaultTheme

    const result = renderComponent(
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <WelcomeMessage message={'random message'} timestamp={'string'} />
        </ThemeProvider>
      </StyledEngineProvider>
    )
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <li
            class="MuiListItem-root MuiListItem-gutters MuiListItem-padding WelcomeMessagewrapper css-ylwdd6-MuiListItem-root"
          >
            <div
              class="MuiListItemText-root MuiListItemText-multiline WelcomeMessagemessageCard css-konndc-MuiListItemText-root"
            >
              <div
                class="MuiGrid-root MuiGrid-container MuiGrid-wrap-xs-nowrap css-aii0rt-MuiGrid-root"
              >
                <div
                  class="MuiGrid-root MuiGrid-item WelcomeMessageavatar css-13i4rnv-MuiGrid-root"
                >
                  <img
                    class="WelcomeMessageicon"
                    src="test-file-stub"
                  />
                </div>
                <div
                  class="MuiGrid-root MuiGrid-container MuiGrid-item css-9pwih8-MuiGrid-root"
                >
                  <div
                    class="MuiGrid-root MuiGrid-container MuiGrid-item MuiGrid-wrap-xs-nowrap MuiGrid-grid-xs-true css-1unmp8r-MuiGrid-root"
                  >
                    <div
                      class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
                    >
                      <p
                        class="MuiTypography-root MuiTypography-body1 WelcomeMessageusername css-cl2jau-MuiTypography-root"
                      >
                        Quiet
                      </p>
                    </div>
                    <div
                      class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
                    >
                      <p
                        class="MuiTypography-root MuiTypography-body1 WelcomeMessagetime css-ghvhpl-MuiTypography-root"
                      >
                        string
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div
                class="MuiGrid-root MuiGrid-item WelcomeMessagemessageInput css-13i4rnv-MuiGrid-root"
              >
                <p
                  class="MuiTypography-root MuiTypography-body2 WelcomeMessagemessage css-16d47hw-MuiTypography-root"
                >
                  random message
                </p>
              </div>
            </div>
          </li>
        </div>
      </body>
    `)
  })
})
