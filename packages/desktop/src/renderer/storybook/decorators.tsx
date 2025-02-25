import React from 'react'
import { Provider } from 'react-redux'
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles'

import { lightTheme } from '../theme'
import { Store } from '../sagas/store.types'

const theme = lightTheme

export const withStore = (store: Store) => (Story: React.FC) => (
  <Provider store={store}>
    <Story />
  </Provider>
)

export const withTheme = (Story: React.FC) => (
  <StyledEngineProvider injectFirst>
    <ThemeProvider theme={theme}>
      <Story />
    </ThemeProvider>
  </StyledEngineProvider>
)
