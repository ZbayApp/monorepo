import { createSlice, type EntityState, type PayloadAction } from '@reduxjs/toolkit'
import { DateTime } from 'luxon'
import { StoreKeys } from '../store.keys'
import { identityAdapter } from './identity.adapter'
import {
  type UpdateJoinTimestampPayload,
  type CreateUserCsrPayload,
  type Identity,
  type RegisterCertificatePayload,
  type StoreUserCertificatePayload,
  type RegisterUsernamePayload,
  SendCsrsResponse,
} from '@quiet/types'

export class IdentityState {
  public identities: EntityState<Identity> = identityAdapter.getInitialState()
}

export const identitySlice = createSlice({
  initialState: { ...new IdentityState() },
  name: StoreKeys.Identity,
  reducers: {
    addNewIdentity: (state, action: PayloadAction<Identity>) => {
      identityAdapter.addOne(state.identities, action.payload)
    },
    updateIdentity: (state, action: PayloadAction<Identity>) => {
      // addOne if action.payload.id is not in state.identities
      if (!state.identities.ids.includes(action.payload.id)) {
        console.log('Adding new identity')
        identityAdapter.addOne(state.identities, action.payload)
      } else {
        identityAdapter.updateOne(state.identities, {
          id: action.payload.id,
          changes: action.payload,
        })
      }
    },
    registerUsername: (state, _action: PayloadAction<RegisterUsernamePayload>) => state,
    addCsr: (state, action: PayloadAction<RegisterCertificatePayload>) => {
      identityAdapter.updateOne(state.identities, {
        id: action.payload.communityId,
        changes: {
          nickname: action.payload.nickname,
          userCsr: action.payload.userCsr,
        },
      })
    },
    storeUserCertificate: (state, action: PayloadAction<StoreUserCertificatePayload>) => {
      identityAdapter.updateOne(state.identities, {
        id: action.payload.communityId,
        changes: {
          userCertificate: action.payload.userCertificate,
          joinTimestamp: DateTime.utc().valueOf(),
        },
      })
    },
    saveUserCsr: state => state,
    verifyJoinTimestamp: state => state,
    updateJoinTimestamp: (state, action: PayloadAction<UpdateJoinTimestampPayload>) => {
      identityAdapter.updateOne(state.identities, {
        id: action.payload.communityId,
        changes: {
          joinTimestamp: DateTime.utc().valueOf(),
        },
      })
    },
  },
})

export const identityActions = identitySlice.actions
export const identityReducer = identitySlice.reducer
