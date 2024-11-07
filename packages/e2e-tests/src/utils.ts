import { Browser, Builder, type ThenableWebDriver } from 'selenium-webdriver'
import { spawn, exec, execSync, type ChildProcessWithoutNullStreams } from 'child_process'
import { type SupportedPlatformDesktop } from '@quiet/types'
import getPort from 'get-port'
import path from 'path'
import fs from 'fs'
import { DESKTOP_DATA_DIR, getAppDataPath } from '@quiet/common'
import { RetryConfig, TimeoutMetadata } from './types'
import { config } from 'dotenv'

import { createLogger } from './logger'

const logger = createLogger('utils')

export const BACKWARD_COMPATIBILITY_BASE_VERSION = '2.3.1' // Pre-latest production version
const appImagesPath = `${__dirname}/../Quiet`

export interface BuildSetupInit {
  port?: number
  debugPort?: number
  defaultDataDir?: boolean
  dataDir?: string
  fileName?: string
}

export class BuildSetup {
  private driver?: ThenableWebDriver | null
  public port?: number
  public debugPort?: number
  public dataDir?: string
  public dataDirPath: string
  private child?: ChildProcessWithoutNullStreams
  private defaultDataDir: boolean
  private fileName?: string

  constructor({ port, debugPort, defaultDataDir = false, dataDir, fileName }: BuildSetupInit) {
    this.port = port
    this.debugPort = debugPort
    this.defaultDataDir = defaultDataDir
    this.dataDir = dataDir
    this.fileName = fileName
    if (this.defaultDataDir) this.dataDir = DESKTOP_DATA_DIR
    if (!this.dataDir) {
      this.dataDir = `e2e_${(Math.random() * 10 ** 18).toString(36)}`
    }
    this.dataDirPath = getAppDataPath({ dataDir: this.dataDir })
  }

  async initPorts() {
    this.port = await getPort()
    this.debugPort = await getPort()
  }

  // Note: .env file is being used locally right now, mainly by script e2e:linux:build
  static getEnvFileName() {
    const { parsed, error } = config()
    logger.info('Dotenv config', { parsed, error })
    return process.env.FILE_NAME
  }

  private getBinaryLocation() {
    switch (process.platform) {
      case 'linux':
        logger.info('filename', this.fileName)
        return `${__dirname}/../Quiet/${this.fileName ? this.fileName : BuildSetup.getEnvFileName()}`
      case 'win32':
        return `${process.env.LOCALAPPDATA}\\Programs\\@quietdesktop\\Quiet.exe`
      case 'darwin':
        return this.getMacBinaryDir()
      default:
        throw new Error('wrong SYSTEM env')
    }
  }

  private getMacBinaryDir(): string {
    let basePath = '/Applications'
    if (process.env.IS_LOCAL === 'true') {
      logger.warn('RUNNING ON LOCAL BINARY')
      const distDirByArch = process.arch === 'arm64' ? 'mac-arm64' : 'mac'
      basePath = `${__dirname}/../../desktop/dist/${distDirByArch}`
    }

    return `${basePath}/Quiet.app/Contents/MacOS/Quiet`
  }

  public getVersionFromEnv() {
    const envFileName = BuildSetup.getEnvFileName()
    if (!envFileName) {
      throw new Error('file name not specified')
    }
    switch (process.platform) {
      case 'linux':
        const linuxIndex = envFileName.indexOf('.AppImage')
        const linuxVersion = envFileName.slice(6, linuxIndex)
        return linuxVersion
      case 'win32':
        const winIndex = envFileName.indexOf('.exe')
        const winVersion = envFileName.slice(12, winIndex)
        return winVersion
      case 'darwin':
        const darwinIndex = envFileName.indexOf('.dmg')
        const darwinVersion = envFileName.slice(6, darwinIndex)
        return darwinVersion
      default:
        throw new Error('wrong SYSTEM env')
    }
  }

  public killNine() {
    exec(`kill -9 $(lsof -t -i:${this.port})`)
    exec(`kill -9 $(lsof -t -i:${this.debugPort})`)
  }

  public async createChromeDriver() {
    await this.initPorts()
    const env = {
      DEBUG:
        'backend*,quiet*,state-manager*,desktop*,utils*,identity*,common*,main,libp2p:connection-manager:auto-dial',
      DATA_DIR: this.dataDir,
    }
    if (process.platform === 'win32') {
      logger.info('!WINDOWS!')
      this.child = spawn(`cd node_modules/.bin & chromedriver.cmd --port=${this.port} --verbose`, [], {
        shell: true,
        env: Object.assign(process.env, env),
      })
    } else {
      this.child = spawn(`node_modules/.bin/chromedriver --port=${this.port} --verbose`, [], {
        shell: true,
        detached: false,
        env: Object.assign(process.env, env),
      })
    }
    // Extra time for chromedriver to setup
    await new Promise<void>(resolve =>
      setTimeout(() => {
        resolve()
      }, 2000)
    )

    this.child.on('error', () => {
      logger.error('ERROR')
      this.killNine()
    })

    this.child.on('exit', () => {
      logger.info('EXIT')
      this.killNine()
    })

    this.child.on('close', () => {
      logger.info('CLOSE')
      this.killNine()
    })

    this.child.on('message', data => {
      logger.info('message', data)
    })
    this.child.on('error', data => {
      logger.error('error', data)
    })

    this.child.stdout.on('data', data => {
      logger.info(`stdout:\n${data}`)
    })

    this.child.stderr.on('data', data => {
      // Quiet logs (handled by 'debug' package) are available in stderr and only with 'verbose' flag on chromedriver
      const trashLogs = ['DevTools', 'COMMAND', 'INFO:CONSOLE', '[INFO]:', 'libnotify-WARNING', 'ALSA lib']
      const dataString = `${data}`
      for (const l of trashLogs) {
        if (dataString.includes(l)) return
      }
      logger.info(`[${this.dataDir}]: ${dataString}`)
    })

    this.child.stdin.on('data', data => {
      logger.info(`stdin: ${data}`)
    })
  }

  public async getTorPid() {
    const execAsync = async (cmd: string) => {
      return await new Promise(resolve => {
        exec(cmd, (error, stdout, stderr) => {
          if (error) {
            logger.warn(error)
          }
          resolve(stdout || stderr)
        })
      })
    }
    const torPid = await execAsync('lsof -t -c tor')
    logger.info({ torPid })
    return torPid
  }

  public getDriver(): ThenableWebDriver {
    if (!this.driver) {
      const binary: string = this.getBinaryLocation()
      try {
        this.driver = new Builder()
          .usingServer(`http://localhost:${this.port}`)
          .withCapabilities({
            'goog:chromeOptions': {
              binary,
              args: [`--remote-debugging-port=${this.debugPort}`, '--enable-logging'],
            },
          })
          .forBrowser(Browser.CHROME)
          .build()
      } catch (e) {
        logger.error(`Error while getting chrome driver`, e)
      }
    }

    if (this.driver == null || this.driver === undefined) {
      throw new Error('No driver')
    }

    return this.driver
  }

  public resetDriver() {
    this.driver = null
  }

  public async killChromeDriver() {
    logger.info(`Killing driver (DATA_DIR=${this.dataDir})`)
    this.child?.kill()
    await new Promise<void>(resolve =>
      setTimeout(() => {
        resolve()
      }, 2000)
    )
  }

  public async closeDriver() {
    logger.info(`Closing driver (DATA_DIR=${this.dataDir})`)
    await this.driver?.close()
  }

  public clearDataDir(force: boolean = false) {
    if (process.env.IS_CI === 'true' && !force) {
      logger.warn('Not deleting data directory because we are running in CI')
      return
    }
    logger.info(`Deleting data directory at ${this.dataDirPath}`)
    try {
      fs.rmdirSync(this.dataDirPath, { recursive: true })
    } catch (e) {
      logger.error(`Could not delete ${this.dataDirPath}`, e)
    }
  }

  public getProcessData = () => {
    let dataDirPath = ''
    let resourcesPath = ''
    const backendBundlePath = path.normalize('backend-bundle/bundle.cjs')
    const byPlatform = {
      linux: `pgrep -af "${backendBundlePath}" | grep -v egrep | grep "${this.dataDir}"`,
      darwin: `ps -A | grep "${backendBundlePath}" | grep -v egrep | grep "${this.dataDir}"`,
      win32: `powershell "Get-WmiObject Win32_process -Filter {commandline LIKE '%${backendBundlePath.replace(
        /\\/g,
        '\\\\'
      )}%' and commandline LIKE '%${
        this.dataDir
      }%' and name = 'Quiet.exe'} | Format-Table CommandLine -HideTableHeaders -Wrap -Autosize"`,
    }

    const command = byPlatform[process.platform as SupportedPlatformDesktop]
    const appBackendProcess = execSync(command).toString('utf8').trim()
    logger.info('Backend process info', appBackendProcess)
    let args = appBackendProcess.split(' ')
    if (process.platform === 'win32') {
      args = args.filter(item => item.trim() !== '')
      args = args.map(item => item.trim())
    }
    logger.info('Args:', args)
    if (args.length >= 5) {
      if (process.platform === 'win32') {
        dataDirPath = args[5]
        resourcesPath = args[7]
      } else {
        dataDirPath = args[6]
        resourcesPath = args[8]
      }
    }
    logger.info('Extracted dataDirPath:', dataDirPath, 'resourcesPath:', resourcesPath)
    return {
      dataDirPath,
      resourcesPath,
    }
  }
}

const quietAppImage = (version = BACKWARD_COMPATIBILITY_BASE_VERSION) => {
  return `Quiet-${version}.AppImage`
}

export const downloadInstaller = (version = BACKWARD_COMPATIBILITY_BASE_VERSION) => {
  if (process.platform !== 'linux') throw new Error('Linux support only')

  const appImage = quietAppImage(version)
  const appImageTargetPath = path.join(appImagesPath, appImage)
  if (fs.existsSync(appImageTargetPath)) {
    logger.info(`${appImage} already exists. Skipping download.`)
    return appImage
  }
  const downloadUrl = `https://github.com/TryQuiet/quiet/releases/download/%40quiet%2Fdesktop%40${version}/${appImage}`
  logger.info(`Downloading Quiet version: ${version} from ${downloadUrl}`)
  // With newer curl: execSync(`curl -LO --output-dir ${appImagesPath} ${downloadUrl}`)
  execSync(`curl -LO ${downloadUrl}`)
  const appImageDownloadPath = path.join(process.cwd(), appImage)
  logger.info(`Downloaded to ${appImageDownloadPath}`)
  fs.renameSync(appImageDownloadPath, appImageTargetPath)
  logger.info('Moved to', appImageTargetPath)
  // Make it executable
  fs.chmodSync(appImageTargetPath, 0o755)
  return appImage
}

export const copyInstallerFile = (file: string) => {
  if (process.platform !== 'linux') throw new Error('Linux support only')

  const base = path.join(appImagesPath, file)
  const parsedBase = path.parse(file)
  const copiedFileName = `${parsedBase.name}-copy${parsedBase.ext}`
  const copiedFilePath = path.join(appImagesPath, copiedFileName)
  if (fs.existsSync(copiedFilePath)) {
    logger.info(`${copiedFileName} already exists. Skipping copy.`)
    return copiedFileName
  }

  fs.copyFileSync(base, copiedFilePath)
  logger.info(`Copied ${base} to ${copiedFilePath}`)
  return copiedFileName
}

export const sleep = async (timeMs = 1000) => {
  await new Promise<void>(resolve =>
    setTimeout(() => {
      resolve()
    }, timeMs)
  )
}

export class Timeout {
  private id: NodeJS.Timeout | number | undefined = undefined

  public set(timeoutMs: number, reason: string): Promise<unknown> {
    if (this.id != null) {
      throw new Error('Timeout already set')
    }

    return new Promise((resolve, reject) => {
      this.id = setTimeout(() => {
        reject(reason)
        this.clear()
      }, timeoutMs)
    })
  }

  public async wrap<T>(promise: Promise<T>, timeoutMs: number, reason: string): Promise<T> {
    return (Promise.race([promise, this.set(timeoutMs, reason)]) as Promise<T>)
      .catch(reason => {
        throw new Error(reason)
      })
      .finally(() => this.clear())
  }

  public clear(): void {
    clearTimeout(this.id as NodeJS.Timeout)
    this.id = undefined
  }
}

export const promiseWithTimeout = async <T>(
  promise: Promise<T>,
  reason: string,
  timeoutMs: number,
  onTimeout?: () => Promise<void>
): Promise<T> => {
  const timeout = new Timeout()
  try {
    const result: T = await timeout.wrap(promise, timeoutMs, reason)
    return result
  } catch (e) {
    if (e.message === reason) {
      if (onTimeout != null) await onTimeout()
      throw logAndReturnError(e)
    }
    throw e
  }
}

export const promiseWithRetries = async <T>(
  promise: Promise<T>,
  reason: string,
  retryConfig: RetryConfig,
  onTimeout?: () => Promise<void>
): Promise<T> => {
  const attempts = 0
  while (attempts < retryConfig.attempts) {
    try {
      const result: T = await promiseWithTimeout(promise, reason, retryConfig.timeoutMs, onTimeout)
      return result
    } catch (e) {
      logger.error(e.message)
      if (e.message === reason) {
        logger.warn(`Timeout exceeded on promise with reason: ${reason}`)
        continue
      }
      throw e
    }
  }

  throw logAndReturnError(`Exceeded ${retryConfig.attempts} retry attempts`)
}

export const logAndReturnError = (error: string | Error): Error => {
  let errorText: string
  let err: Error
  if (error instanceof Error) {
    errorText = error.message
    err = error
  } else {
    errorText = error
    err = new Error(errorText)
  }
  logger.error(errorText)
  return err
}
