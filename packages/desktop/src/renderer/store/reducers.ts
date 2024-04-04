import { AnyAction, combineReducers } from '@reduxjs/toolkit'
import ElectronStore from 'electron-store'
import createElectronStorage from 'redux-persist-electron-storage'
import path from 'path'
import { createMigrate, persistReducer } from 'redux-persist'

import stateManagerReducers, {
  storeKeys as StateManagerStoreKeys,
  CommunitiesTransform,
  PublicChannelsTransform,
  MessagesTransform,
  FilesTransform,
  communities,
  ConnectionTransform,
  resetStateAndSaveTorConnectionData,
  UsersTransform,
  storeMigrations,
} from '@quiet/state-manager'

import { StoreType } from './handlers/types'
import { StoreKeys } from './store.keys'

import { socketReducer } from '../sagas/socket/socket.slice'
import { modalsReducer } from '../sagas/modals/modals.slice'
import { navigationReducer } from './navigation/navigation.slice'

import appHandlers from './handlers/app'

import { Store } from '../sagas/store.types'
import { DESKTOP_DATA_DIR, DESKTOP_DEV_DATA_DIR } from '@quiet/common'

const dataPath =
  process.env.APPDATA ||
  (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config')
const appPath =
  process.env.DATA_DIR || (process.env.NODE_ENV === 'development' ? DESKTOP_DEV_DATA_DIR : DESKTOP_DATA_DIR)

const options = {
  projectName: 'quiet',
  cwd: path.join(dataPath, appPath),
}

const store = new ElectronStore<Store>(options)

const reduxStorage = createElectronStorage({ electronStore: store })

const persistConfig = {
  key: 'root',
  version: 0,
  storage: reduxStorage,
  throttle: 1000,
  whitelist: [
    StateManagerStoreKeys.Identity,
    StateManagerStoreKeys.Communities,
    StateManagerStoreKeys.PublicChannels,
    StateManagerStoreKeys.Messages,
    StateManagerStoreKeys.Files,
    StateManagerStoreKeys.Settings,
    StateManagerStoreKeys.Users,
    StateManagerStoreKeys.Connection,
    StoreKeys.App,
  ],
  transforms: [
    CommunitiesTransform,
    PublicChannelsTransform,
    MessagesTransform,
    FilesTransform,
    ConnectionTransform,
    UsersTransform,
  ],
  migrate: createMigrate(storeMigrations, { debug: true }),
}

export const reducers = {
  ...stateManagerReducers.reducers,
  [StoreKeys.App]: appHandlers.reducer,
  [StoreKeys.Socket]: socketReducer,
  [StoreKeys.Modals]: modalsReducer,
  [StoreKeys.Navigation]: navigationReducer,
}

const allReducers = combineReducers(reducers)

export const rootReducer = (state: any, action: AnyAction) => {
  // TODO: what is state?
  if (action.type === communities.actions.resetApp.type) {
    state = resetStateAndSaveTorConnectionData()
  }

  return allReducers(state, action)
}

export type StoreReducers = StoreType<typeof reducers>

export default persistReducer(persistConfig, rootReducer)
