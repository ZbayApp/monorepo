import { jest } from '@jest/globals'

import { webSockets } from './index'
import { all } from './filters'
import { multiaddr } from '@multiformats/multiaddr'
import getPort from 'get-port'
import { type DirResult } from 'tmp'
import { torBinForPlatform, torDirForPlatform, createTmpDir, tmpQuietDirPath } from '../common/utils'
import { type CreateListenerOptions, type ComponentLogger } from '@libp2p/interface'
import { createServer } from 'it-ws/server'
import { createCertificatesTestHelper } from '../common/client-server'
import { TestingModule, Test } from '@nestjs/testing'
import { TestModule, defaultConfigForTest } from '../common/test.module'
import { TOR_PASSWORD_PROVIDER, TOR_PARAMS_PROVIDER, TOR_CONTROL_PARAMS, QUIET_DIR, SOCKS_PROXY_AGENT } from '../const'
import { TorModule } from '../tor/tor.module'
import { Tor } from '../tor/tor.service'
import crypto from 'crypto'
import { TorControl } from '../tor/tor-control.service'
import { TorControlAuthType } from '../tor/tor.types'
import { createLibp2pAddress } from '@quiet/common'
import { createLogger } from '../common/logger'

const logger = createLogger('websocketOverTor:test')

jest.setTimeout(120000)

describe('websocketOverTor', () => {
  const upgradeOutbound = jest.fn()
  const upgradeInbound = jest.fn(x => x)
  const removeEventListener = jest.fn()
  const addEventListener = jest.fn()

  let tmpAppDataPath: string
  let tmpDir: DirResult
  let service1: {
    onionAddress: string
    privateKey: string
  }
  let service2: {
    onionAddress: string
    privateKey: string
  }

  let listener: any
  let port1Target: number
  let port2Target: number
  let abortSignalOpts: AbortSignal

  let module: TestingModule
  let torService: Tor
  let agent: any
  let torControl: TorControl
  const torPassword = crypto.randomBytes(16).toString('hex')
  beforeAll(async () => {
    jest.clearAllMocks()
    tmpDir = createTmpDir()
    tmpAppDataPath = tmpQuietDirPath(tmpDir.name)
    const port1Arr = await getPort()
    const port2Arr = await getPort()
    port1Target = port1Arr
    port2Target = port2Arr
    const torPath = torBinForPlatform()

    module = await Test.createTestingModule({
      imports: [TestModule, TorModule],
    })
      .overrideProvider(TOR_PASSWORD_PROVIDER)
      .useValue({ torPassword: torPassword, torHashedPassword: '' })
      .overrideProvider(TOR_PARAMS_PROVIDER)
      .useValue({
        torPath: torBinForPlatform(),
        options: {
          env: {
            LD_LIBRARY_PATH: torDirForPlatform(),
            HOME: tmpAppDataPath,
          },
          detached: true,
        },
      })
      .overrideProvider(TOR_CONTROL_PARAMS)
      .useValue({
        port: defaultConfigForTest.torControlPort,
        host: 'localhost',
        auth: {
          value: torPassword,
          type: TorControlAuthType.PASSWORD,
        },
      })
      .overrideProvider(QUIET_DIR)
      .useValue(tmpAppDataPath)
      .compile()

    torService = await module.resolve(Tor)
    agent = await module.resolve(SOCKS_PROXY_AGENT)
    torControl = await module.resolve(TorControl)
    torControl.authString = 'AUTHENTICATE ' + torPassword + '\r\n'

    await torService.init()

    service1 = await torService.createNewHiddenService({ targetPort: port1Target })
    service2 = await torService.createNewHiddenService({ targetPort: port2Target })
    abortSignalOpts = {
      addEventListener,
      removeEventListener,
      aborted: false,
      onabort: null,
      reason: undefined,
      throwIfAborted: function (): void {
        throw new Error('Function not implemented.')
      },
      dispatchEvent: function (event: Event): boolean {
        throw new Error('Function not implemented.')
      },
    }
  })

  afterAll(async () => {
    await torService.kill()
    tmpDir.removeCallback()
  })

  afterEach(async () => {
    await listener?.close()
  })

  // Those are randomly failing and we do not use wss atm anyway.
  it.skip.each([
    ['string', String],
    ['array', Array],
  ])('connects successfully with CA passed as %s', async (_name: string, caType: (ca: string) => any) => {
    const pems = await createCertificatesTestHelper(`${service1.onionAddress}`, `${service2.onionAddress}`)
    // In case test fails on CI, we will be able to conduct test against failing credentials.
    logger.info(`serVert ${pems.servCert}`)
    logger.info(`servKey ${pems.servKey}`)
    logger.info(`ca ${pems.ca}`)
    logger.info(`caKey ${pems.ca_key}`)
    logger.info(`userCert ${pems.userCert}`)
    logger.info(`userKey ${pems.userKey}`)
    const prepareListenerArg: CreateListenerOptions = {
      handler: x => x,
      upgrader: {
        // @ts-ignore
        upgradeOutbound,
        // @ts-ignore
        upgradeInbound,
      },
    }

    const signal = {
      ...abortSignalOpts,
      addEventListener,
      removeEventListener,
    }

    const peerId1 = '12D3KooWHgLdRMqkepNiYnrur21cyASUNk1f9NZ5tuGa9He8QXNa'
    const peerId2 = '12D3KooWSZxWV6DmmTNf9sUgcTQqpN3CTuRiJFY4VthXr4yYxXxi'

    const websocketsOverTorData1 = {
      filter: all,
      websocket: {
        agent,
        cert: pems.servCert,
        key: pems.servKey,
        ca: caType(pems.ca),
      },
      localAddress: createLibp2pAddress(service1.onionAddress, peerId1),
      targetPort: port1Target,
      createServer,
    }

    const websocketsOverTorData2 = {
      filter: all,
      websocket: {
        agent,
        cert: pems.servCert,
        key: pems.servKey,
        ca: caType(pems.ca),
      },
      localAddress: createLibp2pAddress(service2.onionAddress, peerId2),
      targetPort: port2Target,
      createServer,
    }
    const multiAddress = multiaddr(createLibp2pAddress(service1.onionAddress, peerId1))

    const remoteAddress = multiaddr(createLibp2pAddress(service2.onionAddress, peerId2))

    const ws1 = webSockets(websocketsOverTorData1)({ logger: jest.fn() as unknown as ComponentLogger })
    const ws2 = webSockets(websocketsOverTorData2)({ logger: jest.fn() as unknown as ComponentLogger })

    listener = ws1.createListener(prepareListenerArg)

    await listener.listen(multiAddress)

    const onConnection = jest.fn()
    listener.on('connection', onConnection)

    let retryCount = 0

    const tryDial = async () => {
      try {
        await ws2.dial(multiAddress, {
          signal,
          // @ts-ignore
          upgrader: prepareListenerArg.upgrader,
        })
      } catch (e) {
        logger.info(`caught Error ${e.message as string}, retryCount is ${retryCount}`)
        if (retryCount < 2) {
          retryCount++
          await tryDial()
        }
      }
    }

    await tryDial()

    expect(onConnection).toBeCalled()
    expect((onConnection.mock.calls[0][0] as any).remoteAddr).toEqual(remoteAddress)
  })

  it.skip('rejects connection if user cert is invalid', async () => {
    const pems = await createCertificatesTestHelper(`${service1.onionAddress}`, `${service2.onionAddress}`)
    const anotherPems = await createCertificatesTestHelper(`${service1.onionAddress}`, `${service2.onionAddress}`)

    const prepareListenerArg: CreateListenerOptions = {
      handler: x => x,
      upgrader: {
        // @ts-ignore
        upgradeOutbound,
        // @ts-ignore
        upgradeInbound,
      },
    }

    const signal = {
      ...abortSignalOpts,
      addEventListener,
      removeEventListener,
    }

    const peerId1 = '12D3KooWHgLdRMqkepNiYnrur21cyASUNk1f9NZ5tuGa9He8QXNa'
    const peerId2 = '12D3KooWSZxWV6DmmTNf9sUgcTQqpN3CTuRiJFY4VthXr4yYxXxi'

    const websocketsOverTorDataServer = {
      filter: all,
      websocket: {
        agent,
        cert: pems.servCert,
        key: pems.servKey,
        ca: [pems.ca],
      },
      localAddress: createLibp2pAddress(service1.onionAddress, peerId1),
      targetPort: port1Target,
      createServer,
    }

    const websocketsOverTorDataClient = {
      filter: all,
      websocket: {
        agent,
        cert: pems.servCert,
        key: pems.servKey,
        ca: [anotherPems.ca],
      },
      localAddress: createLibp2pAddress(service2.onionAddress, peerId2),
      targetPort: port2Target,
      createServer,
    }
    const multiAddress = multiaddr(createLibp2pAddress(service1.onionAddress, peerId1))

    const ws1 = webSockets(websocketsOverTorDataServer)({ logger: jest.fn() as unknown as ComponentLogger })
    const ws2 = webSockets(websocketsOverTorDataClient)({ logger: jest.fn() as unknown as ComponentLogger })

    listener = ws1.createListener(prepareListenerArg)

    await listener.listen(multiAddress)

    const onConnection = jest.fn()
    listener.on('connection', onConnection)

    await expect(
      ws2.dial(multiAddress, {
        signal,
        // @ts-ignore
        upgrader: prepareListenerArg.upgrader,
      })
    ).rejects.toBeTruthy()
  })
})
