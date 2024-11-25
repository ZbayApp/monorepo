import fs from 'fs'
import getPort from 'get-port'
import path from 'path'
import { Server } from 'socket.io'
import { UserData } from '@quiet/types'
import createHttpsProxyAgent from 'https-proxy-agent'
import PeerId from 'peer-id'
import tmp from 'tmp'
import crypto, { sign } from 'crypto'
import { type PermsData } from '@quiet/types'
import { TestConfig } from '../const'
import { Libp2pNodeParams } from '../libp2p/libp2p.types'
import { createLibp2pAddress, createLibp2pListenAddress, isDefined } from '@quiet/common'
import { Libp2pService } from '../libp2p/libp2p.service'
import { CertFieldsTypes, getReqFieldValue, loadCSR } from '@quiet/identity'
import { execFile } from 'child_process'
import { createLogger } from './logger'

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

export const getLibp2pAddressesFromCsrs = async (csrs: string[]): Promise<string[]> => {
  const addresses = await Promise.all(
    csrs.map(async csr => {
      const parsedCsr = await loadCSR(csr)
      const peerId = getReqFieldValue(parsedCsr, CertFieldsTypes.peerId)
      const onionAddress = getReqFieldValue(parsedCsr, CertFieldsTypes.commonName)
      if (!peerId || !onionAddress) return

      return createLibp2pAddress(onionAddress, peerId)
    })
  )
  return addresses.filter(isDefined)
}

/**
 * Compares given numbers
 *
 * @param tolerance In percentage (0.0 - 1.0)
 */
export const compare = (given: number, base: number, tolerance = 0) => {
  const margin = base * tolerance
  const min = base - margin
  const max = base + margin
  return given >= min && given <= max
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
  createLibp2pAddress(generateRandomOnionAddress(56), 'QmfLUJcDSLVYnNqSPSRK4mKG8MGw51m9K2v59k3yq1C8s4'),
]

export const libp2pInstanceParams = async (): Promise<Libp2pNodeParams> => {
  const port = await getPort()
  const peerId = await createPeerId()
  const address = '0.0.0.0'
  const peerIdRemote = await createPeerId()
  const remoteAddress = createLibp2pAddress(address, peerIdRemote.toString())
  const libp2pKey = Libp2pService.generateLibp2pPSK().fullKey
  return {
    peerId,
    listenAddresses: [createLibp2pListenAddress('localhost')],
    agent: createHttpsProxyAgent({ port: 1234, host: 'localhost' }),
    localAddress: createLibp2pAddress('localhost', peerId.toString()),
    targetPort: port,
    peers: [remoteAddress],
    psk: libp2pKey,
  }
}

export const createTmpDir = (prefix = 'quietTestTmp_'): tmp.DirResult => {
  return tmp.dirSync({ mode: 0o750, prefix, unsafeCleanup: true })
}
export const tmpQuietDirPath = (name: string): string => {
  return path.join(name, TestConfig.QUIET_DIR)
}

export function createFile(filePath: string, size: number) {
  const stream = fs.createWriteStream(filePath)
  const maxChunkSize = 1048576 // 1MB
  if (size < maxChunkSize) {
    stream.write(crypto.randomBytes(size))
  } else {
    const chunks = Math.floor(size / maxChunkSize)
    for (let i = 0; i < chunks; i++) {
      stream.write(crypto.randomBytes(Math.min(size, maxChunkSize)))
      size -= maxChunkSize
    }
  }
  stream.end()
}

export async function createPeerId(): Promise<PeerId> {
  const { peerIdFromKeys } = await eval("import('@libp2p/peer-id')")
  const peerId = await PeerId.create()
  return peerIdFromKeys(peerId.marshalPubKey(), peerId.marshalPrivKey())
}
