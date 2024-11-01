export class NoCryptoEngineError extends Error {}

export interface ErrorPayload {
  type: string
  code?: number
  message?: string
  community?: string
  trace?: string
}

export enum ErrorTypes {
  REGISTRAR = 'registrar',
  COMMUNITY = 'community',
  ACTIVITY = 'activity',
  OTHER = 'other',
}

export enum ErrorCodes {
  BAD_REQUEST = 400,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

export enum ErrorMessages {
  // Registrar
  REGISTRAR_NOT_FOUND = 'Address not found',
  REGISTRAR_CONNECTION_FAILED = 'Connecting to registrar failed',
  REGISTRAR_LAUNCH_FAILED = 'Could not launch registrar',
  REGISTRATION_FAILED = 'Registering username failed.',
  USERNAME_TAKEN = 'Username already taken.',
  INVALID_USERNAME = 'Username is not valid',

  // Community
  COMMUNITY_LAUNCH_FAILED = 'Could not launch community',

  // Network
  NETWORK_SETUP_FAILED = 'Creating network failed',
  NOT_CONNECTED = "You're not connected with other peers.",

  // Identity
  USER_CSR_CREATION_FAILED = 'Creating user CSR failed',
  IDENTITY_NOT_FOUND = 'Identity not found',
  USER_CSR_NOT_FOUND = 'User CSR not found',

  // Channels
  CHANNEL_NAME_TAKEN = 'Channel with this name already exists',

  // General
  GENERAL = 'Something went wrong',

  // Storage Server
  STORAGE_SERVER_CONNECTION_FAILED = 'Connecting to storage server failed',
}
