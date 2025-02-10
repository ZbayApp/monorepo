import { produce, immerable } from 'immer'
import { createAction, handleActions } from 'redux-actions'
import { actionTypes } from '../../../shared/static'
import { ActionsType, PayloadType } from './types'

export class App {
  version: number | null = null

  constructor(values?: Partial<App>) {
    Object.assign(this, values)
  }
}

export const initialState: App = {
  ...new App({
    version: null,
  }),
}

const loadVersion = createAction(actionTypes.SET_APP_VERSION, () => 1.0)

export const actions = {
  loadVersion,
}

export type AppActions = ActionsType<typeof actions>

export const reducer = handleActions<App, PayloadType<AppActions>>(
  {
    [loadVersion.toString()]: (state, { payload: version }: AppActions['loadVersion']) =>
      produce(state, draft => {
        draft.version = version
      }),
  },
  initialState
)

export default {
  actions,
  reducer,
}
