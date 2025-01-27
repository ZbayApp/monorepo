import { jest } from '@jest/globals'

import { Test, TestingModule } from '@nestjs/testing'
import { defaultConfigForTest, TestModule } from '../common/test.module'
import { createTmpDir, tmpQuietDirPath } from '../common/utils'
import { removeFilesFromDir, torBinForPlatform, torDirForPlatform } from '../common/utils'
import { QUIET_DIR, TOR_CONTROL_PARAMS, TOR_PARAMS_PROVIDER, TOR_PASSWORD_PROVIDER } from '../const'
import { TorModule } from './tor.module'
import { Tor } from './tor.service'
import { type DirResult } from 'tmp'
import { TorControlAuthType } from './tor.types'
import { TorControl } from './tor-control.service'
import { sleep } from '../common/sleep'

jest.setTimeout(200_000)

describe('TorControl', () => {
  let module: TestingModule
  let torService: Tor
  let torControl: TorControl
  let tmpDir: DirResult
  let tmpAppDataPath: string

  const torPassword = 'b5e447c10b0d99e7871636ee5e0839b5'
  const torHashedPassword = '16:FCFFE21F3D9138906021FAADD9E49703CC41848A95F829E0F6E1BDBE63'

  beforeEach(async () => {
    jest.clearAllMocks()
    tmpDir = createTmpDir()
    tmpAppDataPath = tmpQuietDirPath(tmpDir.name)
    module = await Test.createTestingModule({
      imports: [TestModule, TorModule],
    })
      .overrideProvider(TOR_PASSWORD_PROVIDER)
      .useValue({ torPassword, torHashedPassword })
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
    torControl = await module.resolve(TorControl)
    torControl.authString = 'AUTHENTICATE ' + torPassword + '\r\n'
  })

  afterEach(async () => {
    await torService.kill()
    tmpDir.removeCallback()
    removeFilesFromDir(tmpAppDataPath)
    torService.clearHangingTorProcess()
    await module.close()
  })

  it('Init tor', async () => {
    expect(torService).toBeDefined()
    await torService.init()
  })

  // it('should detect and kill old tor process before new tor is spawned', async () => {
  //   const torPath = torBinForPlatform()
  //   const httpTunnelPort = await getPort()
  //   const libPath = torDirForPlatform()
  //   const tor = new Tor({
  //     appDataPath: tmpAppDataPath,
  //     torPath,
  //     httpTunnelPort,
  //     options: {
  //       env: {
  //         LD_LIBRARY_PATH: libPath,
  //         HOME: tmpAppDataPath,
  //       },
  //       detached: true,
  //     },
  //   })

  //   await tor.init()

  //   const torSecondInstance = new Tor({
  //     appDataPath: tmpAppDataPath,
  //     torPath,
  //     httpTunnelPort,
  //     options: {
  //       env: {
  //         LD_LIBRARY_PATH: libPath,
  //         HOME: tmpAppDataPath,
  //       },
  //       detached: true,
  //     },
  //   })
  //   await torSecondInstance.init({})
  //   await torSecondInstance.kill()
  // })

  it('spawns new hidden service', async () => {
    await torService.init()
    const hiddenService = await torService.createNewHiddenService({ targetPort: 4343 })
    expect(hiddenService.onionAddress.split('.')[0]).toHaveLength(56)
  })

  it('spawns hidden service using private key', async () => {
    await torService.init()
    const hiddenServiceOnionAddress = await torService.spawnHiddenService({
      targetPort: 4343,
      privKey: 'ED25519-V3:uCr5t3EcOCwig4cu7pWY6996whV+evrRlI0iIIsjV3uCz4rx46sB3CPq8lXEWhjGl2jlyreomORirKcz9mmcdQ==',
    })
    expect(hiddenServiceOnionAddress).toBe('u2rg2direy34dj77375h2fbhsc2tvxj752h4tlso64mjnlevcv54oaad.onion')
  })

  it('tor spawn repeats', async () => {
    const spyOnInit = jest.spyOn(torService, 'init')
    await torService.init(1000)
    await sleep(4000)
    expect(spyOnInit).toHaveBeenCalledTimes(2)
  })

  it('tor is initializing correctly with 40 seconds timeout', async () => {
    await torService.init()
  })

  it('creates and destroys hidden service', async () => {
    await torService.init()
    const hiddenService = await torService.createNewHiddenService({ targetPort: 4343 })
    const serviceId = hiddenService.onionAddress.split('.')[0]
    const status = await torService.destroyHiddenService(serviceId)
    expect(status).toBe(true)
  })

  it('attempt destroy nonexistent hidden service', async () => {
    await torService.init()

    const status = await torService.destroyHiddenService('u2rg2direy34dj77375h2fbhsc2tvxj752h4tlso64mjnlevcv54oaad')
    expect(status).toBe(false)
  })

  it('should find hanging tor processes and kill them', async () => {
    const processKill = jest.spyOn(process, 'kill')
    await torService.init()
    const torIds = torService.getTorProcessIds()
    torService.clearHangingTorProcess()
    expect(processKill).toHaveBeenCalledTimes(torIds.length) // Spawning with {shell:true} starts 2 processes so we need to kill 2 processes
  })

  it('should find hanging tor processes and kill them if Quiet path includes space', async () => {
    tmpDir = createTmpDir('quietTest Tmp_') // On MacOS quiet data lands in '(...)/Application Support/(...)' which caused problems with grep
    tmpAppDataPath = tmpQuietDirPath(tmpDir.name)
    const processKill = jest.spyOn(process, 'kill')
    await torService.init()
    const torIds = torService.getTorProcessIds()
    torService.clearHangingTorProcess()
    expect(processKill).toHaveBeenCalledTimes(torIds.length) // Spawning with {shell:true} starts 2 processes so we need to kill 2 processes
  })
})
