import { createNavigationContainerRef } from '@react-navigation/native'

import { ScreenNames } from './const/ScreenNames.enum'

export const navigationRef = createNavigationContainerRef()

export const navigate = <Params extends {}>(
  screen: ScreenNames,
  params?: Params
): void => {
  if (navigationRef.isReady()) {
    // @ts-ignore
    navigationRef.navigate(screen, params)
  }
}

export const replaceScreen = <Params extends {}>(
  screen: ScreenNames,
  params?: Params
): void => {
  if (navigationRef.isReady()) {
    // @ts-ignore
    navigationRef.navigate(screen, params)
  }
}
