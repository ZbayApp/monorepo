export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export enum LogTransportType {
  CONSOLE = 'CONSOLE',
  CONSOLE_ELECTRON = 'CONSOLE_ELECTRON',
  FILE = 'FILE',
  ROTATE_FILE = 'ROTATE_FILE',
}

export enum LogFile {
  STATE_MANAGER = 'state-manager.log',
}
