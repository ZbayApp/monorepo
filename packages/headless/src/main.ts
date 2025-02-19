import fs from 'fs'
import os from 'os'
import path from 'path'
import { getPorts, ApplicationPorts, closeHangingBackendProcess } from './backendHelpers'
import { setEngine, CryptoEngine } from 'pkijs'
import { Crypto } from '@peculiar/webcrypto'
import { createLogger } from './logger'
import { fork, ChildProcess } from 'child_process'
import { createRequire } from 'module'

const logger = createLogger('main')

const run = async (): Promise<void> => {
  const webcrypto = new Crypto()

  global.crypto = webcrypto

  const dataDir = 'Quiet'
  const appDataPath = path.join(os.homedir(), `/quiet-headless`)

  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath)
  }

  if (!fs.existsSync(`${appDataPath}/${dataDir}`)) {
    fs.mkdirSync(`${appDataPath}/${dataDir}`)
  }

  setEngine(
    'newEngine',
    webcrypto,
    new CryptoEngine({
      name: '',
      crypto: webcrypto,
      subtle: webcrypto.subtle,
    })
  )

  const SOCKET_IO_SECRET = webcrypto.getRandomValues(new Uint32Array(5)).join('')

  const ports: ApplicationPorts = await getPorts()
  let backendProcess: ChildProcess | null = null

  const closeBackendProcess = () => {
    if (backendProcess !== null) {
      /* OrbitDB released a patch (0.28.5) that omits error thrown when closing the app during heavy replication
        it needs mending though as replication is not being stopped due to pednign ipfs block/dag calls.
        https://github.com/orbitdb/orbit-db-store/issues/121
        ...
        Quiet side workaround is force-killing backend process.
        It may result in problems caused by post-process leftovers (like lock-files),
        nevertheless developer team is aware of that and has a response
        https://github.com/TryQuiet/monorepo/issues/469
      */
      const forceClose = setTimeout(() => {
        const killed = backendProcess?.kill()
        logger.warn(`Backend killed: ${killed}, Quitting.`)
        process.exit()
      }, 2000)
      backendProcess.send('close')
      backendProcess.on('message', message => {
        if (message === 'closed-services') {
          logger.info('Closing the app')
          clearTimeout(forceClose)
          process.exit()
        }
      })
    } else {
      process.exit()
    }
  }

  const temporaryFilesDirectory = path.join(appDataPath, 'temporaryFiles')
  fs.mkdirSync(temporaryFilesDirectory, { recursive: true })
  fs.readdir(temporaryFilesDirectory, (err, files) => {
    if (err) throw err
    for (const file of files) {
      fs.unlink(path.join(temporaryFilesDirectory, file), err => {
        if (err) throw err
      })
    }
  })

  const forkArgvs = [
    '-d',
    `${ports.dataServer}`,
    '-a',
    `${appDataPath}`,
    '-p',
    'desktop',
    '-scrt',
    `${SOCKET_IO_SECRET}`,
    '-hl',
    '-hlp',
    '3000',
    '-hlip',
    '0.0.0.0',
    '-hlh',
    'localhost',
  ]

  logger.info('Fork argvs for backend process', forkArgvs)

  const require = createRequire(import.meta.url)
  const backendBundlePath = path.normalize(require.resolve('backend-bundle'))
  try {
    closeHangingBackendProcess(path.normalize(path.join('backend-bundle', 'bundle.cjs')), path.normalize(appDataPath))
  } catch (e) {
    logger.error('Error occurred while trying to close hanging backend process', e)
  }

  backendProcess = fork(backendBundlePath, forkArgvs, {
    env: {
      NODE_OPTIONS: '--experimental-global-customevent',
      DEBUG: 'backend*,quiet*,state-manager*,desktop*,utils*,identity*,common*,libp2p*,helia*,blockstore*',
      COLORIZE: 'true',
    },
  })
  logger.info('Forked backend, PID:', backendProcess.pid)

  backendProcess.on('error', e => {
    logger.error('Backend process returned error', e)
    throw Error(e.message)
  })

  backendProcess.on('exit', (code, signal) => {
    logger.warn('Backend process exited', code, signal)
    if (code === 1) {
      throw Error('Abnormal backend process termination')
    }
  })
}

run().catch(reason => {
  logger.error(`Error while running headless`, reason)
  process.exit(1)
})
