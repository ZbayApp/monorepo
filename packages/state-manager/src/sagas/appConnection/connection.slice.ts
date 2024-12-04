import { createSlice, type EntityState, type PayloadAction } from '@reduxjs/toolkit'
import { StoreKeys } from '../store.keys'
import { peersStatsAdapter } from './connection.adapter'
import { ConnectionProcessInfo, type NetworkDataPayload, type NetworkStats } from '@quiet/types'
import { InviteResult } from '@localfirst/auth'

export class ConnectionState {
  public lastConnectedTime = 0
  public uptime = 0
  public peersStats: EntityState<NetworkStats> = peersStatsAdapter.getInitialState()
  public isTorInitialized = false
  public socketIOSecret: string | null = null
  public torBootstrapProcess = 'Bootstrapped 0% (starting)'
  public connectionProcess: { number: number; text: ConnectionProcessInfo } = {
    number: 5,
    text: ConnectionProcessInfo.CONNECTION_STARTED,
  }
  public longLivedInvite: InviteResult | undefined = undefined
}

export const connectionSlice = createSlice({
  initialState: { ...new ConnectionState() },
  name: StoreKeys.Connection,
  reducers: {
    updateUptime: (state, action) => {
      state.uptime = state.uptime + action.payload
    },
    updateNetworkData: (state, action: PayloadAction<NetworkDataPayload>) => {
      const prev = state.peersStats?.entities[action.payload.peer]?.connectionTime || 0
      const _peerStats = state.peersStats || peersStatsAdapter.getInitialState()
      peersStatsAdapter.upsertOne(_peerStats, {
        peerId: action.payload.peer,
        lastSeen: action.payload.lastSeen,
        connectionTime: prev + action.payload.connectionDuration,
      })
    },
    setLastConnectedTime: (state, action: PayloadAction<number>) => {
      state.lastConnectedTime = action.payload
    },
    setTorBootstrapProcess: (state, action: PayloadAction<string>) => {
      const info = action.payload
      if (info.includes('Bootstrapped')) {
        const firstChar = info.indexOf(']') + 1
        const lastChar = info.indexOf(')') + 1
        const formattedInfo = info.slice(firstChar, lastChar).trim()
        state.torBootstrapProcess = formattedInfo
      }
    },
    torBootstrapped: (state, _action: PayloadAction<any>) => state,
    setTorInitialized: state => {
      state.isTorInitialized = true
    },
    setLongLivedInvite: (state, action: PayloadAction<InviteResult>) => {
      state.longLivedInvite = action.payload
    },
    setSocketIOSecret: (state, action: PayloadAction<string>) => {
      state.socketIOSecret = action.payload
    },
    setConnectionProcess: (state, action: PayloadAction<string>) => {
      const info = action.payload

      switch (info) {
        case ConnectionProcessInfo.REGISTERING_OWNER_CERTIFICATE:
          state.connectionProcess = { number: 50, text: ConnectionProcessInfo.REGISTERING_OWNER_CERTIFICATE }
          break
        case ConnectionProcessInfo.INITIALIZING_IPFS:
          if (state.connectionProcess.number > 30) break
          state.connectionProcess = { number: 30, text: ConnectionProcessInfo.BACKEND_MODULES }
          break
        case ConnectionProcessInfo.CONNECTING_TO_COMMUNITY:
          if (state.connectionProcess.number == 50) break
          state.connectionProcess = { number: 50, text: ConnectionProcessInfo.CONNECTING_TO_COMMUNITY }
          break
        case ConnectionProcessInfo.CHANNELS_STORED || ConnectionProcessInfo.CERTIFICATES_STORED:
          let number = 90
          if (state.connectionProcess.number == 90) number = 95
          state.connectionProcess = { number, text: ConnectionProcessInfo.LOADING_MESSAGES }
          break
      }
    },
    createInvite: (state, _action: PayloadAction<any>) => state,
  },
})

export const connectionActions = connectionSlice.actions
export const connectionReducer = connectionSlice.reducer
