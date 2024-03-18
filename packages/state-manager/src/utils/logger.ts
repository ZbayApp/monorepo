import * as path from 'path'

import { getAppDataPath } from '@quiet/common'
import { LOG_PATH, LogFile, LogLevel, LogTransportType, LoggingHandler, TransportConfig } from '@quiet/logger'

export enum LoggerModuleName {
  // top-level module names
  APP = 'app',
  APP_CONNECTION = 'appConnection',
  COMMUNITIES = 'communities',
  PUBLIC_CHANNELS = 'publicChannels',
  NETWORK = 'network',
  IDENTITY = 'identity',
  SOCKET = 'socket',
  USER_PROFILES = 'userProfiles',
  FILES = 'files',
  MESSAGES = 'messages',
  USERS = 'users',

  // sub module names
  SAGA = 'saga',
  SELECTORS = 'selectors',
  ADAPTER = 'adapter',
  SLICE = 'slice',
  TRANSFORM = 'transform',
  MASTER = 'master',
}

const PACKAGE_NAME = 'state-manager'
const transportConfigs: TransportConfig[] = [
  process.env.TEST_MODE === 'true' ? {
    type: LogTransportType.CONSOLE,
    shared: true
  } : {
    type: LogTransportType.ROTATE_FILE,
    shared: true,
    fileName: LogFile.STATE_MANAGER,
  }
]

export const loggingHandler = new LoggingHandler({
  packageName: PACKAGE_NAME,
  logPath: path.join(getAppDataPath(), LOG_PATH),
  defaultLogLevel: LogLevel.INFO,
  defaultLogTransports: transportConfigs,
})
