import React, { FC, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { settings } from '@quiet/state-manager'
import { ThemeComponent } from './Theme.component'
import { ThemePreference } from '@quiet/state-manager'

interface useThemeDataReturnType {
  themePreference: ThemePreference
}

export const useThemeData = (): useThemeDataReturnType => {
  const themePreference = useSelector(settings.selectors.getThemePreference)
  return {
    themePreference,
  }
}

export const useThemeActions = () => {
  const dispatch = useDispatch()

  const setThemePreference = useCallback(
    (theme: ThemePreference) => {
      dispatch(settings.actions.setThemePreference(theme))
    },
    [dispatch]
  )

  return { setThemePreference }
}

export const Theme: FC = () => {
  const { themePreference } = useThemeData()
  const { setThemePreference } = useThemeActions()

  return <ThemeComponent currentTheme={themePreference} onThemeChange={setThemePreference} />
}
