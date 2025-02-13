import { createTheme, type Theme } from '@mui/material/styles'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { settings } from '@quiet/state-manager'
import { ThemePreference } from '@quiet/state-manager'

const font = "'Rubik', sans-serif"
const fontLogs = 'Menlo Regular'

const lightTheme = createTheme({
  typography: {
    fontFamily: [font, fontLogs].join(','),
    fontStyle: 'normal',
    fontWeight: 'normal',
    useNextVariants: true,
    overline: {
      fontSize: 10,
      lineHeight: '16px',
      fontWeight: 500,
    },
    caption: {
      fontSize: 12,
      lineHeight: '20px',
      color: '#b2b2b2',
    },
    body1: {
      fontSize: 16,
      lineHeight: '26px',
    },
    body2: {
      fontSize: 14,
      lineHeight: '24px',
    },
    subtitle1: {
      fontSize: 16,
      lineHeight: '26px',
    },
    subtitle2: {
      fontSize: 14,
      lineHeight: '23px',
    },
    h1: {
      fontWeight: 500,
      fontSize: 48,
      lineHeight: '40px',
    },
    h2: {
      fontWeight: 500,
      fontSize: 34,
      lineHeight: '40px',
    },
    h3: {
      fontWeight: 500,
      fontSize: 28,
      lineHeight: '34px',
    },
    h4: {
      fontWeight: 500,
      fontSize: 18,
      lineHeight: '27px',
    },
    h5: {
      fontSize: 16,
      lineHeight: '26px',
      fontWeight: 500,
    },
  },
  palette: {
    mode: 'light',
    background: {
      // Background colors (white-ish for light theme, black-ish for dark)
      default: '#ffffff',
      paper: '#F0F0F0',
    },
    // text: {}, // font colors (black-ish for light theme, white-ish for dark)
    primary: {
      // Primary Quiet brand purple
      main: '#521C74',
      dark: '#461863',
    },
    secondary: {
      // Secondary Quiet brand red (TODO: Make sure this is Secondary, not error/warning)
      main: '#E42656',
      dark: '#C41743',
    },
    error: {
      main: '#D13135',
    },
    warning: {
      main: '#FFCC00',
    },
    // TO BE ADDED IF NEEDED: Success, Warning, Neutral
    colors: {
      // Misc colors. For primary / secondary brand, text, and background colors, use those objects
      // For canonical colors, see: https://www.figma.com/file/0j7Nna9zWmfOSNmRmQK1Uh/Quiet-Design-Library?type=design&node-id=2667-0&mode=design&t=i0cXovHohRKxWGaA-0
      contrastText: '#000', // Contrasts with the background colors
      // Blues
      blue: '#2196f3',
      purple: '#521C74', // To be replaced with theme.palette.primary.main
      quietBlue: '#521c74', // To be replaced with theme.palette.primary.main
      darkPurple: '#4d1a6d', // To be replaced with theme.palette.primary.dark?
      lushSky: '#67BFD3',
      lushSky12: '#EDF7FA',
      linkBlue: '#1B6FEC', // Used in a variety of places - likely wants to be split / consolidated
      // Reds
      red: '#FF0000', // Replace with D13135 ?
      hotRed: '#E42656', // Replaced by theme.palette.secondary.main?
      hotPink: '#E42656', // Replaced by theme.palette.secondary.main?
      // Grays (including white and black)
      white: '#FFFFFF',
      trueBlack: '#000000', // To be replaced with text color and border color
      gray: '#e7e7e7',
      darkGray: '#7F7F7F',
      mediumGray: '#8d8d8d',
      lightGray: '#B2B2B2', // To be replaced with gray30?
      gray03: '#F7F7F7',
      gray30: '#FAFAFA', // Unused and not aligned with Figma
      gray40: '#999999',
      gray50: '#7F7F7F',
      gray70: '#4C4C4C',
      // Border colors
      border01: '#F0F0F0',
      border02: '#B3B3B3',
      border03: '#D2D2D2',
      // Other custom colors
      sidebarBackground: '#511974',
      sidebarSelected: '#FFFFFF19',
      sidebarHover: '#FFFFFF0C',
    },
  },
  //@ts-ignore MUI types expect 25 shadows - see: https://github.com/mui/material-ui/issues/28820
  shadows: [
    'none',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 1px 0px #F0F0F0',
    '0px 1px 3px rgba(0, 0, 0, 0.0)',
    '0px 2px 25px rgba(0, 0, 0, 0.2)',
    // From here, this is just 20 repeats until we figure out shadows
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
    '0px 0px 4px rgba(0, 0, 0, 0.25)',
  ],
  components: {
    // Body font size changed in mui v5: https://mui.com/material-ui/migration/v5-component-changes/#update-body-font-size
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontSize: '14px',
          lineHeight: '24px',
          letterSpacing: '0.01071em',
        },
      },
    },
    MuiSnackbarContent: {
      // Replace with atomic Snackbar component. Put styling in that file.
      styleOverrides: {
        root: {
          wordBreak: 'break-all',
        },
      },
    },
    MuiButton: {
      // Replace with atomic Button component. Put styling in that file.
      styleOverrides: {
        sizeSmall: {
          textTransform: 'none',
          boxShadow: 'none',
          paddingLeft: '16px',
          paddingRight: '14px',
          fontWeight: 400,
          fontSize: '14px',
          '&:active': {
            boxShadow: 'none',
          },
        },
        sizeLarge: {
          textTransform: 'none',
          boxShadow: 'none',
          fontWeight: 400,
          paddingTop: 12,
          paddingBottom: 12,
          fontSize: 14,
          '&:active': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiOutlinedInput: {
      // Replace with atomic Input component. Put styling in that file.
      styleOverrides: {
        input: {},
      },
    },
    MuiPopover: {
      // Replace with atomic Popover component. Put styling in that file.
      styleOverrides: {
        paper: {
          borderRadius: 8,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFF',
        },
      },
    },
  },
})

const darkTheme = createTheme({
  typography: {
    fontFamily: [font, fontLogs].join(','),
    fontStyle: 'normal',
    fontWeight: 'normal',
    useNextVariants: true,
    overline: {
      fontSize: 10,
      lineHeight: '16px',
      fontWeight: 500,
    },
    caption: {
      fontSize: 12,
      lineHeight: '20px',
    },
    body1: {
      fontSize: 16,
      lineHeight: '26px',
    },
    body2: {
      fontSize: 14,
      lineHeight: '24px',
    },
    subtitle1: {
      fontSize: 16,
      lineHeight: '26px',
    },
    subtitle2: {
      fontSize: 14,
      lineHeight: '23px',
    },
    h1: {
      fontWeight: 500,
      fontSize: 48,
      lineHeight: '40px',
    },
    h2: {
      fontWeight: 500,
      fontSize: 34,
      lineHeight: '40px',
    },
    h3: {
      fontWeight: 500,
      fontSize: 28,
      lineHeight: '34px',
    },
    h4: {
      fontWeight: 500,
      fontSize: 18,
      lineHeight: '27px',
    },
    h5: {
      fontSize: 16,
      lineHeight: '26px',
      fontWeight: 500,
    },
    h6: {
      fontSize: 16,
      lineHeight: '26px',
      fontWeight: 500,
      color: '#fff',
    },
  },
  palette: {
    mode: 'dark',
    background: {
      // Background colors (white-ish for light theme, black-ish for dark)
      default: '#151515',
      paper: '#222222',
    },
    // text: {}, // font colors (black-ish for light theme, white-ish for dark)
    primary: {
      // Primary Quiet brand purple
      main: '#521C74',
      dark: '#461863',
    },
    secondary: {
      // Secondary Quiet brand red (TODO: Make sure this is Secondary, not error/warning)
      main: '#E42656',
      dark: '#C41743',
    },
    error: {
      main: '#D13135',
    },
    warning: {
      main: '#FFCC00',
    },
    // TO BE ADDED IF NEEDED: Success, Warning, Neutral
    colors: {
      // Misc colors. For primary / secondary brand, text, and background colors, use those objects
      // For canonical colors, see: https://www.figma.com/file/0j7Nna9zWmfOSNmRmQK1Uh/Quiet-Design-Library?type=design&node-id=2667-0&mode=design&t=i0cXovHohRKxWGaA-0
      contrastText: '#FFF', // Contrasts with the background colors
      // Blues
      blue: '#2196f3',
      purple: '#521C74', // To be replaced with theme.palette.primary.main
      quietBlue: '#521c74', // To be replaced with theme.palette.primary.main
      darkPurple: '#4d1a6d', // To be replaced with theme.palette.primary.dark?
      lushSky: '#67BFD3',
      lushSky12: '#EDF7FA',
      linkBlue: '#59c0d5', // Used in a variety of places - likely wants to be split / consolidated
      // Reds
      red: '#FF0000', // Replace with D13135 ?
      hotRed: '#E42656', // Replaced by theme.palette.secondary.main?
      hotPink: '#E42656', // Replaced by theme.palette.secondary.main?
      // Grays (including white and black)
      white: '#FFFFFF',
      trueBlack: '#000000', // To be replaced with text color and border color
      gray: '#e7e7e7',
      darkGray: '#7F7F7F',
      mediumGray: '#8d8d8d',
      lightGray: '#B2B2B2', // To be replaced with gray30?
      gray03: '#F7F7F7',
      gray30: '#FAFAFA', // Unused and not aligned with Figma
      gray40: '#999999',
      gray50: '#7F7F7F',
      gray70: '#4C4C4C',
      // Border colors
      border01: '#F0F0F0',
      border02: '#B3B3B3',
      border03: '#D2D2D2',
      // Gradients and other run-of-the-mill things
      sidebarBackground: '#2F193D',
      sidebarSelected: '#FFFFFF19',
      sidebarHover: '#FFFFFF0C',
    },
  },
  //@ts-ignore MUI types expect 25 shadows - see: https://github.com/mui/material-ui/issues/28820
  shadows: [
    'none',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 1px 0px #0F0F0F',
    '0px 1px 3px rgba(1, 1, 1, 0.0)',
    '0px 2px 25px rgba(1, 1, 1, 0.2)',
    // Repeats until we design our shadows
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
    '0px 0px 4px rgba(1, 1, 1, 0.25)',
  ],
  components: {
    // Body font size changed in mui v5: https://mui.com/material-ui/migration/v5-component-changes/#update-body-font-size
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontSize: '14px',
          lineHeight: '24px',
          letterSpacing: '0.01071em',
        },
      },
    },
    MuiSnackbarContent: {
      // Replace with atomic Snackbar component. Put styling in that file.
      styleOverrides: {
        root: {
          wordBreak: 'break-all',
        },
      },
    },
    MuiButton: {
      // Replace with atomic Button component. Put styling in that file.
      styleOverrides: {
        sizeSmall: {
          textTransform: 'none',
          boxShadow: 'none',
          paddingLeft: '16px',
          paddingRight: '14px',
          fontWeight: 400,
          fontSize: '14px',
          '&:active': {
            boxShadow: 'none',
          },
        },
        sizeLarge: {
          textTransform: 'none',
          boxShadow: 'none',
          fontWeight: 400,
          paddingTop: 12,
          paddingBottom: 12,
          fontSize: 14,
          '&:active': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiOutlinedInput: {
      // Replace with atomic Input component. Put styling in that file.
      styleOverrides: {
        input: {},
      },
    },
    MuiPopover: {
      // Replace with atomic Popover component. Put styling in that file.
      styleOverrides: {
        paper: {
          borderRadius: 8,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
        },
      },
    },
  },
})

const getCurrentTheme = (preference: ThemePreference, systemIsDark: boolean | undefined): Theme => {
  switch (preference) {
    case ThemePreference.light:
      return lightTheme
    case ThemePreference.dark:
      return darkTheme
    case ThemePreference.system:
      return (systemIsDark ?? false) ? darkTheme : lightTheme
    default:
      return defaultTheme
  }
}

const defaultTheme = getCurrentTheme(
  ThemePreference.system,
  window.matchMedia?.('(prefers-color-scheme: dark)').matches
)

const useTheme = (): Theme => {
  const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)')
  const [theme, setTheme] = useState(() => getCurrentTheme(ThemePreference.system, mediaQuery?.matches))
  const themePreference = useSelector(settings.selectors.getThemePreference)

  useEffect(() => {
    const updateTheme = (isDark: boolean) => {
      setTheme(getCurrentTheme(themePreference, isDark))
    }

    updateTheme(mediaQuery?.matches)

    mediaQuery?.addEventListener('change', e => updateTheme(e.matches))
    return () => mediaQuery?.removeEventListener('change', e => updateTheme(e.matches))
  }, [themePreference])

  return theme
}

export { lightTheme, darkTheme, defaultTheme, useTheme }
