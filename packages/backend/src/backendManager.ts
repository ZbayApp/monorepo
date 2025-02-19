import { Crypto } from '@peculiar/webcrypto'
import { Command } from 'commander'
import { NestFactory } from '@nestjs/core'
import path from 'path'
import getPort from 'get-port'
import { AppModule } from './nest/app.module'
import { ConnectionsManagerService } from './nest/connections-manager/connections-manager.service'
import { TorControl } from './nest/tor/tor-control.service'
import { torBinForPlatform, torDirForPlatform } from './nest/common/utils'
import initRnBridge from './rn-bridge'
import { INestApplicationContext } from '@nestjs/common'
import { OpenServices, validateOptions } from './options'
import { SOCKS_PROXY_AGENT } from './nest/const'
import { createLogger } from './nest/common/logger'
import { HttpsProxyAgent } from 'https-proxy-agent'

const logger = createLogger('backendManager')

logger.info('Launching backend manager')

const program = new Command()

logger.info('Launching backend manager program')

program
  .option('-p, --platform <platform>', 'platform')
  .option('-dpth, --dataPath <dataPath>', 'data directory path')
  .option('-dprt, --dataPort <dataPort>', 'data port')
  .option('-t, --torBinary <torBinary>', 'tor binary path')
  .option('-ac, --authCookie <authCookie>', 'tor authentication cookie')
  .option('-cp, --controlPort <controlPort>', 'tor control port')
  .option('-htp, --httpTunnelPort <httpTunnelPort>', 'http tunnel port')
  .option('-a, --appDataPath <string>', 'Path of application data directory')
  .option('-d, --socketIOPort <number>', 'Socket io data server port')
  .option('-r, --resourcesPath <string>', 'Application resources path')
  .option('-scrt, --socketIOSecret <string>', 'socketIO secret')
  .option('-hl, --headless', 'Run the backend in headless mode', false)
  .option('-hlp, --headlessPort <string>', 'Port to run the headless backend on', '3000')
  .option('-hlip, --headlessIp <string>', 'IP to run the headless backend on', '0.0.0.0')
  .option('-hlh, --headlessHostname <string>', 'Hostname of this server', 'localhost')

logger.info('Parsing args')

program.parse(process.argv)
const options = program.opts()

logger.info('options', options)

export const runBackendDesktop = async () => {
  logger.info('Running backend manager desktop')

  const isDev = process.env.NODE_ENV === 'development'

  const webcrypto = new Crypto()

  // @ts-ignore
  global.crypto = webcrypto

  validateOptions(options)

  const resourcesPath = isDev ? null : options.resourcesPath.trim()

  const app = await NestFactory.createApplicationContext(
    AppModule.forOptions({
      socketIOPort: options.socketIOPort,
      socketIOSecret: options.socketIOSecret,
      torBinaryPath: options.headless == null ? torBinForPlatform(resourcesPath) : undefined,
      torResourcesPath: options.headless == null ? torDirForPlatform(resourcesPath) : undefined,
      torControlPort: await getPort(),
      headless: options.headless
        ? { ip: options.headlessIp, port: Number(options.headlessPort), hostname: options.headlessHostname }
        : undefined,
      options: {
        env: {
          appDataPath: path.join(options.appDataPath.trim(), 'Quiet'),
        },
      },
    })
  )

  const connectionsManager = app.get<ConnectionsManagerService>(ConnectionsManagerService)

  process.on('message', async message => {
    if (message === 'close') {
      try {
        await connectionsManager.closeAllServices()
      } catch (e) {
        logger.error('Error occurred while closing backend services', e)
      }
      if (process.send) process.send('closed-services')
    }
    if (message === 'leaveCommunity') {
      try {
        await connectionsManager.leaveCommunity()
      } catch (e) {
        logger.error('Error occurred while leaving community', e)
      }
      if (process.send) process.send('leftCommunity')
    }
  })
}

export const runBackendMobile = async () => {
  logger.info('Running backend manager mobile')

  // Enable triggering push notifications
  process.env['BACKEND'] = 'mobile'
  process.env['CONNECTION_TIME'] = (new Date().getTime() / 1000).toString() // Get time in seconds

  const rn_bridge = initRnBridge()

  const app: INestApplicationContext = await NestFactory.createApplicationContext(
    AppModule.forOptions({
      socketIOPort: options.dataPort,
      socketIOSecret: options.socketIOSecret,
      httpTunnelPort: options.httpTunnelPort ? options.httpTunnelPort : null,
      torAuthCookie: options.authCookie ? options.authCookie : null,
      torControlPort: options.controlPort ? options.controlPort : await getPort(),
      torBinaryPath: options.torBinary ? options.torBinary : null,
      options: {
        env: {
          appDataPath: options.dataPath,
        },
        createPaths: false,
      },
    }),
    { logger: ['warn', 'error', 'log', 'debug', 'verbose'] }
  )

  let proxyAgent: HttpsProxyAgent<string> | undefined

  rn_bridge.channel.on('close', () => {
    const connectionsManager = app.get<ConnectionsManagerService>(ConnectionsManagerService)
    connectionsManager.pause()
  })

  rn_bridge.channel.on('open', (msg: OpenServices) => {
    const connectionsManager = app.get<ConnectionsManagerService>(ConnectionsManagerService)
    const torControl = app.get<TorControl>(TorControl)
    proxyAgent = app.get<HttpsProxyAgent<string>>(SOCKS_PROXY_AGENT)

    torControl.torControlParams.port = msg.torControlPort
    torControl.torControlParams.auth.value = msg.authCookie
    proxyAgent.connectOpts.port = msg.httpTunnelPort
    proxyAgent.proxy.port = msg.httpTunnelPort

    connectionsManager.resume()
  })
}

const platform = options.platform

if (platform === 'desktop') {
  runBackendDesktop().catch(error => {
    logger.error('Error occurred while initializing backend', error)
    throw error
  })
} else if (platform === 'mobile') {
  runBackendMobile().catch(async error => {
    logger.error('Error occurred while initializing backend', error)
    // Prevent stopping process before getting output
    await new Promise<void>(resolve => {
      setTimeout(() => {
        resolve()
      }, 10000)
    })
    throw error
  })
} else {
  throw Error(`Platfrom must be either desktop or mobile, received ${options.platform}`)
}
