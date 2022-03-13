import {
  createSlice,
  EntityState,
  PayloadAction
} from '@reduxjs/toolkit'

import { StoreKeys } from '../store.keys'
import { errorsAdapter } from './errors.adapter'
import { ErrorPayload } from './errors.types'

export class ErrorsState {
  public errors: EntityState<ErrorPayload> =
  errorsAdapter.getInitialState()
}

export const errorsSlice = createSlice({
  initialState: {
    ...new ErrorsState()
  },
  name: StoreKeys.Errors,
  reducers: {
    addError: (state, action: PayloadAction<ErrorPayload>) => {
      errorsAdapter.upsertOne(
        state.errors,
        action.payload
      )
    },
    clearError: (state, action: PayloadAction<ErrorPayload>) => {
      errorsAdapter.removeOne(state.errors, action.payload.type)
    }
  }
})

export const errorsActions = errorsSlice.actions
export const errorsReducer = errorsSlice.reducer
