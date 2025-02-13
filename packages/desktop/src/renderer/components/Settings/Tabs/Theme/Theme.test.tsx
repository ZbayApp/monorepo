import { ThemePreference } from '@quiet/state-manager'
import React from 'react'
import { renderComponent } from '../../../../testUtils/renderComponent'
import { ThemeComponent } from './Theme.component'
import { screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

describe('Theme', () => {
  it('renders component', () => {
    const props = {
      currentTheme: ThemePreference.dark,
      onThemeChange: jest.fn(),
    }
    const result = renderComponent(<ThemeComponent {...props} />)
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <div
            class="MuiGrid-root MuiGrid-container css-10ecepr-MuiGrid-root"
          >
            <div
              class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-12 ThemeSettingstitleContainer css-1idn90j-MuiGrid-root"
            >
              <h4
                class="MuiTypography-root MuiTypography-h4 css-ajdqea-MuiTypography-root"
              >
                Theme
              </h4>
            </div>
            <div
              class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-12 ThemeSettingsoptionsContainer css-1idn90j-MuiGrid-root"
            >
              <hr
                class="MuiDivider-root MuiDivider-fullWidth css-rr7dug-MuiDivider-root"
              />
              <div
                class="MuiButtonBase-root MuiListItemButton-root MuiListItemButton-gutters MuiListItemButton-root MuiListItemButton-gutters css-4nokum-MuiButtonBase-root-MuiListItemButton-root"
                data-testid="theme-light-button"
                role="button"
                tabindex="0"
              >
                <div
                  class="MuiListItemText-root css-tlelie-MuiListItemText-root"
                >
                  <span
                    class="MuiTypography-root MuiTypography-body1 MuiListItemText-primary css-m1llqv-MuiTypography-root"
                  >
                    Light
                  </span>
                </div>
                <div
                  class="MuiListItemIcon-root css-qklaqr-MuiListItemIcon-root"
                />
                <span
                  class="MuiTouchRipple-root css-8je8zh-MuiTouchRipple-root"
                />
              </div>
              <hr
                class="MuiDivider-root MuiDivider-fullWidth css-rr7dug-MuiDivider-root"
              />
              <hr
                class="MuiDivider-root MuiDivider-fullWidth css-rr7dug-MuiDivider-root"
              />
              <div
                class="MuiButtonBase-root MuiListItemButton-root MuiListItemButton-gutters MuiListItemButton-root MuiListItemButton-gutters css-4nokum-MuiButtonBase-root-MuiListItemButton-root"
                data-testid="theme-dark-button"
                role="button"
                tabindex="0"
              >
                <div
                  class="MuiListItemText-root css-tlelie-MuiListItemText-root"
                >
                  <span
                    class="MuiTypography-root MuiTypography-body1 MuiListItemText-primary css-m1llqv-MuiTypography-root"
                  >
                    Dark
                  </span>
                </div>
                <div
                  class="MuiListItemIcon-root css-qklaqr-MuiListItemIcon-root"
                >
                  <svg
                    aria-hidden="true"
                    class="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium css-138yfas-MuiSvgIcon-root"
                    data-testid="CheckIcon"
                    focusable="false"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                    />
                  </svg>
                </div>
                <span
                  class="MuiTouchRipple-root css-8je8zh-MuiTouchRipple-root"
                />
              </div>
              <hr
                class="MuiDivider-root MuiDivider-fullWidth css-rr7dug-MuiDivider-root"
              />
              <hr
                class="MuiDivider-root MuiDivider-fullWidth css-rr7dug-MuiDivider-root"
              />
              <div
                class="MuiButtonBase-root MuiListItemButton-root MuiListItemButton-gutters MuiListItemButton-root MuiListItemButton-gutters css-4nokum-MuiButtonBase-root-MuiListItemButton-root"
                data-testid="theme-system-button"
                role="button"
                tabindex="0"
              >
                <div
                  class="MuiListItemText-root css-tlelie-MuiListItemText-root"
                >
                  <span
                    class="MuiTypography-root MuiTypography-body1 MuiListItemText-primary css-m1llqv-MuiTypography-root"
                  >
                    System
                  </span>
                </div>
                <div
                  class="MuiListItemIcon-root css-qklaqr-MuiListItemIcon-root"
                />
                <span
                  class="MuiTouchRipple-root css-8je8zh-MuiTouchRipple-root"
                />
              </div>
              <hr
                class="MuiDivider-root MuiDivider-fullWidth css-rr7dug-MuiDivider-root"
              />
            </div>
          </div>
        </div>
      </body>
    `)
  })

  it('changes theme when buttons are clicked', async () => {
    const mockThemeChange = jest.fn()
    renderComponent(<ThemeComponent currentTheme={ThemePreference.dark} onThemeChange={mockThemeChange} />)

    // Click light theme
    await userEvent.click(screen.getByTestId('theme-light-button'))
    expect(mockThemeChange).toHaveBeenCalledWith(ThemePreference.light)

    // Click dark theme
    await userEvent.click(screen.getByTestId('theme-dark-button'))
    expect(mockThemeChange).toHaveBeenCalledWith(ThemePreference.dark)

    // Click system theme
    await userEvent.click(screen.getByTestId('theme-system-button'))
    expect(mockThemeChange).toHaveBeenCalledWith(ThemePreference.system)
  })

  it('displays check mark for current theme', () => {
    const props = {
      currentTheme: ThemePreference.dark,
      onThemeChange: jest.fn(),
    }
    renderComponent(<ThemeComponent {...props} />)

    // Find all check icons
    const checkIcons = screen.queryAllByTestId('CheckIcon')
    expect(checkIcons).toHaveLength(1) // Only one should be visible

    // Verify it's in the dark theme button
    const darkButton = screen.getByTestId('theme-dark-button')
    expect(darkButton).toContainElement(checkIcons[0])
  })
})
