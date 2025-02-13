import { StoreKeys } from '../store.keys'
import { createSelector } from 'reselect'
import { type CreatedSelectors, type StoreState } from '../store.types'

const settingsSlice: CreatedSelectors[StoreKeys.Settings] = (state: StoreState) => state[StoreKeys.Settings]

export const getNotificationsOption = createSelector(settingsSlice, reducerState => reducerState.notificationsOption)

export const getNotificationsSound = createSelector(settingsSlice, reducerState => reducerState.notificationsSound)

export const getThemePreference = createSelector(settingsSlice, reducerState => reducerState.themePreference)

export const settingsSelectors = {
  getNotificationsOption,
  getNotificationsSound,
  getThemePreference,
}
