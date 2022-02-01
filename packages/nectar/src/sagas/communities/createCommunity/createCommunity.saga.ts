import { createRootCA } from '@quiet/identity'
import { Time } from 'pkijs'
import { call, apply, put } from 'typed-redux-saga'
import { communitiesActions, Community } from '../communities.slice'
import { SocketActionTypes } from '../../socket/const/actionTypes'
import { generateId } from '../../../utils/cryptography/cryptography'
import { PayloadAction } from '@reduxjs/toolkit'
import { publicChannelsActions } from '../../publicChannels/publicChannels.slice'

export function* createCommunitySaga(socket, action: PayloadAction<string>): Generator {
  const notBeforeDate = new Date(Date.UTC(2010, 11, 28, 10, 10, 10))
  const notAfterDate = new Date(Date.UTC(2030, 11, 28, 10, 10, 10))
  const rootCa = yield* call(
    createRootCA,
    new Time({ type: 0, value: notBeforeDate }),
    new Time({ type: 0, value: notAfterDate }),
    action.payload
  )
  const id = yield* call(generateId)
  const payload: Community = {
    id: id,
    CA: rootCa,
    name: action.payload,
    registrarUrl: '',
    rootCa: '',
    peerList: [],
    registrar: null,
    onionAddress: '',
    privateKey: '',
    port: 0
  }
  yield* put(communitiesActions.addNewCommunity(payload))
  yield* put(communitiesActions.setCurrentCommunity(id))
  yield* put(publicChannelsActions.addPublicChannelsList({ id: id }))
  yield* apply(socket, socket.emit, [SocketActionTypes.CREATE_NETWORK, id])
}
