import { type Socket } from '../../types'
import { all, takeEvery, cancelled } from 'typed-redux-saga'
import { identityActions } from './identity.slice'
import { registerUsernameSaga } from './registerUsername/registerUsername.saga'
import { verifyJoinTimestampSaga } from './verifyJoinTimestamp/verifyJoinTimestamp.saga'
import { usersActions } from '../users/users.slice'
import { updateCertificateSaga } from './updateCertificate/updateCertificate.saga'
import { createLogger } from '../../utils/logger'

const logger = createLogger('identityMasterSaga')

export function* identityMasterSaga(socket: Socket): Generator {
  logger.info('identityMasterSaga starting')
  try {
    yield all([
      takeEvery(identityActions.registerUsername.type, registerUsernameSaga, socket),
      takeEvery(identityActions.verifyJoinTimestamp.type, verifyJoinTimestampSaga),
      takeEvery(usersActions.responseSendCertificates.type, updateCertificateSaga),
    ])
  } finally {
    logger.info('identityMasterSaga stopping')
    if (yield cancelled()) {
      logger.info('identityMasterSaga cancelled')
    }
  }
}
