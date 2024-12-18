import { all, fork, cancelled, takeEvery } from 'typed-redux-saga'
import { uptimeSaga } from './uptime/uptime.saga'

import { type Socket } from '../../types'
import { createLogger } from '../../utils/logger'
import { connectionActions } from './connection.slice'
import { createInviteSaga } from './invite/createInvite.saga'

const logger = createLogger('connectionMasterSaga')

export function* connectionMasterSaga(socket: Socket): Generator {
  logger.info('connectionMasterSaga starting')
  try {
    yield all([fork(uptimeSaga), takeEvery(connectionActions.createInvite.type, createInviteSaga, socket)])
  } finally {
    logger.info('connectionMasterSaga stopping')
    if (yield cancelled()) {
      logger.info('connectionMasterSaga cancelled')
    }
  }
}
