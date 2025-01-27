import { all, takeEvery, fork, cancelled } from 'typed-redux-saga'
import { uptimeSaga } from './uptime/uptime.saga'
import { connectionActions } from './connection.slice'
import { createLogger } from '../../utils/logger'
import { onConnectionProcessInfo } from './onConnectionProcessInfo/onConnectionProcessInfo.saga'

const logger = createLogger('connectionMasterSaga')

export function* connectionMasterSaga(): Generator {
  logger.info('connectionMasterSaga starting')
  try {
    yield all([fork(uptimeSaga), takeEvery(connectionActions.onConnectionProcessInfo.type, onConnectionProcessInfo)])
  } finally {
    logger.info('connectionMasterSaga stopping')
    if (yield cancelled()) {
      logger.info('connectionMasterSaga cancelled')
    }
  }
}
