import { createSlice, type EntityState, type PayloadAction } from '@reduxjs/toolkit'
import { StoreKeys } from '../store.keys'
import { peersStatsAdapter } from './connection.adapter'
import { ConnectionProcessInfo, type NetworkDataPayload, type NetworkStats } from '@quiet/types'

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
}

export const connectionSlice = createSlice({
  initialState: { ...new ConnectionState() },
  name: StoreKeys.Connection,
  reducers: {
    updateUptime: (state, action) => {
      state.uptime = state.uptime + action.payload
    },
    setNetworkData: (state, action: PayloadAction<NetworkDataPayload>) => {
      const _peerStats = state.peersStats || peersStatsAdapter.getInitialState()
      peersStatsAdapter.upsertOne(_peerStats, {
        peerId: action.payload.peer,
        lastSeen: action.payload.lastSeen,
        connectionTime: 0,
      })
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
    torBootstrapped: (state, _action: PayloadAction<any>) => state,
    setTorInitialized: state => {
      state.isTorInitialized = true
    },
    setSocketIOSecret: (state, action: PayloadAction<string>) => {
      state.socketIOSecret = action.payload
    },
    onConnectionProcessInfo: (state, _action: PayloadAction<string>) => state,
    setConnectionProcess: (state, action: PayloadAction<{ info: string; isOwner: boolean }>) => {
      const { info, isOwner } = action.payload

      if (info === ConnectionProcessInfo.INITIALIZING_IPFS) {
        if (state.connectionProcess.number > 30) return
        state.connectionProcess = { number: 30, text: ConnectionProcessInfo.BACKEND_MODULES }
      } else if (!isOwner) {
        if (info === ConnectionProcessInfo.CONNECTING_TO_COMMUNITY) {
          if (state.connectionProcess.number == 50) return
          state.connectionProcess = { number: 50, text: ConnectionProcessInfo.CONNECTING_TO_COMMUNITY }
        } else if (
          info === ConnectionProcessInfo.CHANNELS_STORED ||
          info === ConnectionProcessInfo.CERTIFICATES_STORED
        ) {
          let number = 90
          if (state.connectionProcess.number == 90) number = 95
          state.connectionProcess = { number, text: ConnectionProcessInfo.LOADING_MESSAGES }
        }
      }
    },
  },
})

export const connectionActions = connectionSlice.actions
export const connectionReducer = connectionSlice.reducer
