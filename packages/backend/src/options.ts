/* eslint-disable @typescript-eslint/no-explicit-any */
import commander from 'commander'

export interface OpenServices {
  torControlPort?: any
  socketIOPort?: any
  socketIOSecret?: any
  httpTunnelPort?: any
  authCookie?: any
}

interface Options {
  platform?: any
  dataPath?: any
  dataPort?: any
  torBinary?: any
  authCookie?: any
  controlPort?: any
  httpTunnelPort?: any
  appDataPath?: string
  socketIOPort?: number
  resourcesPath?: string
  socketIOSecret: string
  headless?: boolean
  headlessPort?: string
  headlessIp?: string
  headlessHostname?: string
}

// concept
export const validateOptions = (_options: commander.OptionValues) => {
  const options = _options as Options
  if (!options.socketIOSecret) {
    throw new Error('socketIOSecret is missing in options')
  }

  if (options.headless && (!options.headlessPort || !options.headlessHostname || !options.headlessIp)) {
    throw new Error(`Configured for headless mode but is missing one of: ip, hostname, port!`)
  }
}
