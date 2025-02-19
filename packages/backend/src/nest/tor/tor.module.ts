import { Module } from '@nestjs/common'
import { CONFIG_OPTIONS, TOR_CONTROL_PARAMS, TOR_PARAMS_PROVIDER, TOR_PASSWORD_PROVIDER } from '../const'
import { ConfigOptions } from '../types'
import { TorControl } from './tor-control.service'
import { Tor } from './tor.service'
import { TorControlAuthType, TorParamsProvider, TorPasswordProvider } from './tor.types'
import path from 'path'
import * as os from 'os'
import * as child_process from 'child_process'
import crypto from 'crypto'
import { SocketModule } from '../socket/socket.module'

const torParamsProvider = {
  provide: TOR_PARAMS_PROVIDER,
  useFactory: (configOptions: ConfigOptions) => {
    const torPath = configOptions.torBinaryPath ? path.normalize(configOptions.torBinaryPath) : ''
    const options = {
      env: {
        LD_LIBRARY_PATH: configOptions.torResourcesPath,
        HOME: os.homedir(),
      },
      // detached: true, // TODO: check if this is needed
    }

    return { torPath, options }
  },
  inject: [CONFIG_OPTIONS],
}

const torPasswordProvider = {
  provide: TOR_PASSWORD_PROVIDER,
  useFactory: (torParamsProvider: TorParamsProvider) => {
    const password = crypto.randomBytes(16).toString('hex')
    if (!torParamsProvider.torPath) return null
    const hashedPassword = child_process.execSync(`${torParamsProvider.torPath} --quiet --hash-password ${password}`, {
      env: torParamsProvider.options?.env,
    })
    const torPassword = password
    const torHashedPassword = hashedPassword.toString().trim()

    return { torPassword, torHashedPassword }
  },
  inject: [TOR_PARAMS_PROVIDER],
}

const torControlParams = {
  provide: TOR_CONTROL_PARAMS,
  useFactory: (configOptions: ConfigOptions, torPasswordProvider: TorPasswordProvider | null) => {
    if (!torPasswordProvider) return null
    return {
      port: configOptions.torControlPort,
      host: 'localhost',
      auth: {
        value: configOptions.torAuthCookie || torPasswordProvider.torPassword,
        type: configOptions.torAuthCookie ? TorControlAuthType.COOKIE : TorControlAuthType.PASSWORD,
      },
    }
  },
  inject: [CONFIG_OPTIONS, TOR_PASSWORD_PROVIDER],
}

@Module({
  imports: [SocketModule],
  providers: [Tor, TorControl, torControlParams, torPasswordProvider, torParamsProvider],
  exports: [Tor, TorControl],
})
export class TorModule {}
