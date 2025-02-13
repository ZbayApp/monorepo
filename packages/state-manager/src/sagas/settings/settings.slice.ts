import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { StoreKeys } from '../store.keys'
import { NotificationsOptions, NotificationsSounds, ThemePreference } from './settings.types'

export class SettingsState {
  public notificationsOption: NotificationsOptions = NotificationsOptions.notifyForEveryMessage
  public notificationsSound: NotificationsSounds = NotificationsSounds.pow
  public themePreference: ThemePreference = ThemePreference.system
}

export const settingsSlice = createSlice({
  initialState: { ...new SettingsState() },
  name: StoreKeys.Settings,
  reducers: {
    setNotificationsOption: (state, action: PayloadAction<NotificationsOptions>) => {
      state.notificationsOption = action.payload
    },
    setNotificationsSound: (state, action: PayloadAction<NotificationsSounds>) => {
      state.notificationsSound = action.payload
    },
    setThemePreference: (state, action: PayloadAction<ThemePreference>) => {
      state.themePreference = action.payload
    },
  },
})

export const settingsActions = settingsSlice.actions
export const settingsReducer = settingsSlice.reducer
