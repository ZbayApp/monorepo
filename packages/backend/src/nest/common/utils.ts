import fs from 'fs'
import fsAsync from 'fs/promises'
import getPort from 'get-port'
import path from 'path'
import { Server } from 'socket.io'
import { UserData } from '@quiet/types'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import tmp from 'tmp'
import crypto from 'crypto'
import { type PermsData } from '@quiet/types'
import { TestConfig } from '../const'
import { CreatedLibp2pPeerId, Libp2pNodeParams } from '../libp2p/libp2p.types'
import { createLibp2pAddress, createLibp2pListenAddress, isDefined } from '@quiet/common'
import { Libp2pService } from '../libp2p/libp2p.service'
import { CertFieldsTypes, getReqFieldValue, loadCSR } from '@quiet/identity'
import { createLogger } from './logger'
import { pureJsCrypto } from '@chainsafe/libp2p-noise'
import { webSockets } from '@libp2p/websockets'

const logger = createLogger('utils')

export interface Ports {
  socksPort: number
  libp2pHiddenService: number
  controlPort: number
  dataServer: number
  httpTunnelPort: number
}

export function createPaths(paths: string[]) {
  logger.info('creating paths in fn - utils')
  for (const path of paths) {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true })
    }
  }
}

export function removeFilesFromDir(dirPath: string) {
  if (fs.existsSync(dirPath)) {
    logger.info(`Removing ${dirPath}`)
    fs.rmdirSync(dirPath, { recursive: true })
  }
}

export const getFilesRecursively = (directory: string, arr: string[]) => {
  if (!fs.existsSync(directory)) return arr
  const filesInDirectory = fs.readdirSync(directory)
  for (const file of filesInDirectory) {
    const absolute = path.join(directory, file)
    if (fs.statSync(absolute).isDirectory()) {
      getFilesRecursively(absolute, arr)
    } else {
      arr.push(absolute)
    }
  }
}

export const removeFiles = (appPath: string, filename: string) => {
  if (!fs.existsSync(appPath)) return
  const IpfsAndOrbitDb = fs.readdirSync(appPath).filter(i => i.startsWith('Ipfs') || i.startsWith('OrbitDB'))
  const files: string[] = []
  IpfsAndOrbitDb.forEach(e => {
    const directory = path.resolve(appPath, e)
    getFilesRecursively(directory, files)
  })
  files.forEach(e => {
    if (e.endsWith(filename)) {
      fs.unlinkSync(e)
    }
  })
}

export const getDirsRecursively = (directory: string, arr: string[]) => {
  if (!fs.existsSync(directory)) return arr
  const filesInDirectory = fs.readdirSync(directory)
  for (const file of filesInDirectory) {
    const absolute = path.join(directory, file)
    if (fs.statSync(absolute).isDirectory()) {
      arr.push(absolute)
      getDirsRecursively(absolute, arr)
    }
  }
}

export const removeDirs = (appPath: string, filename: string) => {
  if (!fs.existsSync(appPath)) return
  const IpfsAndOrbitDb = fs.readdirSync(appPath).filter(i => i.startsWith('Ipfs'))
  const dirs: string[] = []
  IpfsAndOrbitDb.forEach(e => {
    const directory = path.resolve(appPath, e)
    getDirsRecursively(directory, dirs)
  })
  dirs.forEach(e => {
    if (e.endsWith(filename)) {
      fs.rmdirSync(e)
    }
  })
}

export const getPorts = async (): Promise<Ports> => {
  const controlPort = await getPort()
  const socksPort = await getPort()
  const libp2pHiddenService = await getPort()
  const dataServer = await getPort()
  const httpTunnelPort = await getPort()
  return {
    socksPort,
    libp2pHiddenService,
    controlPort,
    dataServer,
    httpTunnelPort,
  }
}

/**
 * Generate a random onion address
 * @param length Length of the onion address, provided for testing invalid lengths (default: 56)
 * @returns Random onion address
 **/
export function generateRandomOnionAddress(length: number = 56): string {
  const charset = 'abcdefghijklmnopqrstuvwxyz' // Lowercase letters only
  const charsetLength = charset.length
  let randomString = ''

  const randomValues = new Uint32Array(length)
  crypto.webcrypto.getRandomValues(randomValues)

  for (let i = 0; i < length; i++) {
    randomString += charset[randomValues[i] % charsetLength]
  }

  return randomString + '.onion'
}

export class DummyIOServer extends Server {
  emit(event: string, ...args: any[]): boolean {
    logger.info(`Emitting ${event} with args:`, args)
    return true
  }

  close() {
    logger.info('Closing DummyIOServer')
  }
}

export const torBinForPlatform = (basePath = '', binName = 'tor'): string => {
  if (process.env.BACKEND === 'mobile') {
    return basePath
  }
  const ext = process.platform === 'win32' ? '.exe' : ''
  // Wrap path in quotes to handle spaces in path
  return `"${path.join(torDirForPlatform(basePath), `${binName}`.concat(ext))}"`
}

export const torDirForPlatform = (basePath?: string): string => {
  let torPath: string
  if (!basePath) {
    const platformPath = process.platform === 'darwin' ? path.join(process.platform, process.arch) : process.platform
    basePath = path.join(process.cwd(), '..', '..', '3rd-party')
    torPath = path.join(basePath, 'tor', platformPath)
  } else {
    if (process.platform === 'darwin') {
      torPath = path.join(basePath, 'tor', process.arch)
    } else {
      torPath = path.join(basePath, 'tor')
    }
  }
  return torPath
}

export const getUsersAddresses = async (users: UserData[]): Promise<string[]> => {
  const peers = users.map(async (userData: UserData) => {
    return createLibp2pAddress(userData.onionAddress, userData.peerId)
  })

  return await Promise.all(peers)
}

export const getUsersFromCsrs = async (csrs: string[]): Promise<UserData[]> => {
  const users = await Promise.all(
    csrs.map(async csr => {
      const parsedCsr = await loadCSR(csr)
      const username = getReqFieldValue(parsedCsr, CertFieldsTypes.nickName)
      const peerId = getReqFieldValue(parsedCsr, CertFieldsTypes.peerId)
      const onionAddress = getReqFieldValue(parsedCsr, CertFieldsTypes.commonName)

      return username && peerId && onionAddress ? { username, onionAddress, peerId } : undefined
    })
  )
  return users.filter(isDefined)
}

/**
 * Compares given numbers
 *
 * @param tolerance In percentage (0.0 - 1.0)
 */
export const compare = (given: number | bigint, base: number | bigint, tolerance: number = 0) => {
  // convert all of our values to bigint for consistency
  const biBase: bigint = typeof base === 'bigint' ? base : BigInt(base)
  const biGiven: bigint = typeof given === 'bigint' ? given : BigInt(given)
  const biTolerance: bigint = typeof tolerance === 'bigint' ? tolerance : BigInt(tolerance * 100)

  // perform the comparison
  const margin = (biBase * biTolerance) / BigInt(100)
  const min = biBase - margin
  const max = biBase + margin
  return biGiven >= min && biGiven <= max
}

export const getCors = () => {
  // TODO: is this still necessary?
  if (process.env.TEST_MODE === 'true' && process.env.E2E_TEST === 'true') {
    return {
      origin: '*',
      methods: ['GET', 'POST'],
    }
  }
  return {}
}

export const rootPermsData: PermsData = {
  certificate:
    'MIIBNjCB3AIBATAKBggqhkjOPQQDAjASMRAwDgYDVQQDEwdaYmF5IENBMCYYEzIwMjEwNjIyMDkzMDEwLjAyNVoYDzIwMzAwMTMxMjMwMDAwWjASMRAwDgYDVQQDEwdaYmF5IENBMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEV5a3Czy+L7IfVX0FpJtSF5mi0GWGrtPqv5+CFSDPrHXijsxWdPTobR1wk8uCLP4sAgUbs/bIleCxQy41kSSyOaMgMB4wDwYDVR0TBAgwBgEB/wIBAzALBgNVHQ8EBAMCAAYwCgYIKoZIzj0EAwIDSQAwRgIhAPOzksuipKyBALt/o8O/XwsrVSzfSHXdAR4dOWThQ1lbAiEAmKqjhsmf50kxWX0ekhbAeCTjcRApXhjnslmJkIFGF2o=+lmBImw3BMNjA0FTlK5iRmVC+w/T6M04Es+yiYL608vOhx2slnoyAwHjAPBgNVHRMECDAGAQH/AgEDMAsGA1UdDwQEAwIABjAKBggqhkjOPQQDAgNIADBFAiEA+0kIz0ny/PLVERTcL0+KCpsztyA6Zuwzj05VW5NMdx0CICgdzf0lg0/2Ksl1AjSPYsy2w+Hn09PGlBnD7TiExBpx',
  privKey:
    'MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgTvNuJL0blaYq6zmFS53WmmOfHshlqn+8wNHDzo4df5WgCgYIKoZIzj0DAQehRANCAARXlrcLPL4vsh9VfQWkm1IXmaLQZYau0+q/n4IVIM+sdeKOzFZ09OhtHXCTy4Is/iwCBRuz9siV4LFDLjWRJLI5+lmBImw3BMNjA0FTlK5iRmVC+w/T6M04Es+yiYL608vOhx2sln',
}

tmp.setGracefulCleanup()

export const testBootstrapMultiaddrs = [
  createLibp2pAddress(generateRandomOnionAddress(56), '12D3KooWKCWstmqi5gaQvipT7xVneVGfWV7HYpCbmUu626R92hXx'),
]

// generate a local multiaddr: /ip4/127.0.0.1/tcp/<PORT>/ws
function createLocalListenAddr(port: number): string {
  return `/ip4/127.0.0.1/tcp/${port}/ws`
}

// for dialPeer(...) we add /p2p/<peerId> at the end
function createLocalDialAddr(port: number, peerIdStr: string): string {
  return `/ip4/127.0.0.1/tcp/${port}/ws/p2p/${peerIdStr}`
}

export const libp2pInstanceParams = async (): Promise<Libp2pNodeParams> => {
  const port = await getPort()
  const peerId = await createPeerId()
  const libp2pKey = Libp2pService.generateLibp2pPSK().fullKey
  return {
    peerId,
    listenAddresses: [createLibp2pListenAddress('localhost')],
    agent: new HttpsProxyAgent('http://localhost:1234'),
    localAddress: createLibp2pAddress('localhost', peerId.peerId.toString()),
    targetPort: port,
    psk: libp2pKey,
  }
}

/**
 * Generates params for use in testing libp2p instances locally
 * Replaces websocketOverTor with default websockets transport
 * @returns {Promise<Libp2pNodeParams>}
 */
export async function getLocalLibp2pInstanceParams(): Promise<Libp2pNodeParams> {
  const port = await getPort()
  const peerId = await createPeerId()
  const libp2pKey = Libp2pService.generateLibp2pPSK().fullKey
  return {
    peerId,
    listenAddresses: [createLocalListenAddr(port)],
    agent: undefined,
    localAddress: createLocalDialAddr(port, peerId.peerId.toString()),
    targetPort: port,
    psk: libp2pKey,
    transport: [webSockets()],
    useConnectionProtector: false,
  }
}

export const createTmpDir = (prefix = 'quietTestTmp_'): tmp.DirResult => {
  return tmp.dirSync({ mode: 0o750, prefix, unsafeCleanup: true })
}

export const tmpQuietDirPath = (name: string): string => {
  return path.join(name, TestConfig.QUIET_DIR)
}

export async function createPeerId(): Promise<CreatedLibp2pPeerId> {
  const privKey = await generateKeyPair('Ed25519', 32)
  const noiseKey = pureJsCrypto.generateX25519KeyPair().privateKey
  const peerId = peerIdFromPrivateKey(privKey)
  return {
    peerId,
    privKey,
    noiseKey,
  }
}

export const createArbitraryFile = async (filePath: string, sizeBytes: number) => {
  const maxChunkSize = 1048576 // 1MB

  let remainingSize = sizeBytes

  while (remainingSize > 0) {
    const chunkSize = Math.min(maxChunkSize, remainingSize)
    await fsAsync.appendFile(filePath, crypto.randomBytes(chunkSize))
    remainingSize -= chunkSize
  }
}

export async function* asyncGeneratorFromIterator<T>(asyncIterator: AsyncIterable<T>): AsyncGenerator<T> {
  for await (const value of asyncIterator) {
    yield value
  }
}

// Shamelessly stolen from https://github.com/whatwg/streams/issues/1255#issuecomment-2442964298
// This is necessary because AsyncIterators are fickle and if you just wrap them in a try/catch or try to use
// catch/then/finally on a wrapper promise it ultimately generates an unhandled rejection.  JS is so much fun.
export function abortableAsyncIterable<
  T,
  TReturn,
  TNext,
  IterType = AsyncIterable<T> | AsyncGenerator<T, TReturn, TNext>,
>(iter: IterType, signal?: AbortSignal, timeoutMs?: number): IterType {
  const abortedPromise = new Promise<IteratorResult<T, TReturn>>((resolve, reject) => {
    const ABORT_MESSAGE = 'Operation aborted'
    const TIMEOUT_MESSAGE = `Operation exceeded timeout of ${timeoutMs}ms`
    const ABORT_ERROR_NAME = 'AbortError'
    const TIMEOUT_ERROR_NAME = 'TimeoutError'

    let timeoutSignal: AbortSignal | undefined = undefined
    if (timeoutMs != null) {
      timeoutSignal = AbortSignal.timeout(timeoutMs)
    }

    if (signal?.aborted) {
      reject(new DOMException(ABORT_MESSAGE, ABORT_ERROR_NAME))
    }

    if (timeoutSignal?.aborted) {
      reject(new DOMException(TIMEOUT_MESSAGE, TIMEOUT_ERROR_NAME))
    }

    if (signal != null) {
      signal.addEventListener('abort', () => reject(new DOMException(ABORT_MESSAGE, ABORT_ERROR_NAME)))
    }

    if (timeoutSignal != null) {
      timeoutSignal.addEventListener('abort', () => reject(new DOMException(TIMEOUT_MESSAGE, TIMEOUT_ERROR_NAME)))
    }
  })
  abortedPromise.catch(() => {})

  const abortableIterable: AsyncIterable<T> = {
    [Symbol.asyncIterator]: () => {
      const inner = (iter as AsyncIterable<T>)[Symbol.asyncIterator]()
      const { return: _return, throw: _throw } = inner
      return {
        next: (...args) => Promise.race([inner.next(...args), abortedPromise]),
        return: _return ? (...args) => _return.apply(inner, args) : undefined,
        throw: _throw ? (...args) => _throw.apply(inner, args) : undefined,
      }
    },
  }

  if (Object.prototype.toString.call(iter) === '[object AsyncGenerator]') {
    return asyncGeneratorFromIterator(abortableIterable) as IterType
  }

  return abortableIterable as IterType
}
