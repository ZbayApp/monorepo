import { SigChain } from '../../sigchain'
import { createLogger } from '../../../common/logger'
import { DeviceWithSecrets, LocalUserContext } from '3rd-party/auth/packages/auth/dist'
import { RoleName } from '..//roles/roles'
import { DeviceService } from './device.service'

const logger = createLogger('auth:services:device.spec')

describe('invites', () => {
  let adminSigChain: SigChain
  let adminContext: LocalUserContext
  let newDevice: DeviceWithSecrets

  it('should initialize a new sigchain and be admin', () => {
    ;({ sigChain: adminSigChain, context: adminContext } = SigChain.create('test', 'user'))
    expect(adminSigChain).toBeDefined()
    expect(adminContext).toBeDefined()
    expect(adminSigChain.team.teamName).toBe('test')
    expect(adminContext.user.userName).toBe('user')
    expect(adminSigChain.roles.amIMemberOfRole(adminContext, RoleName.ADMIN)).toBe(true)
    expect(adminSigChain.roles.amIMemberOfRole(adminContext, RoleName.MEMBER)).toBe(true)
  })
  it('sigchain should contain admin device', () => {
    const adminDeviceName = DeviceService.determineDeviceName()
    adminSigChain.team.hasDevice(adminContext.device.deviceId)
  })
  it('should generate a new device', () => {
    newDevice = DeviceService.generateDeviceForUser(adminContext.user.userId)
    expect(newDevice).toBeDefined()
  })
  it('should redactDevice', () => {
    const redactedDevice = DeviceService.redactDevice(newDevice)
    expect(redactedDevice).toBeDefined()
    expect(redactedDevice.deviceId).toBe(newDevice.deviceId)
    expect(redactedDevice.deviceName).toBe(newDevice.deviceName)
  })
})
