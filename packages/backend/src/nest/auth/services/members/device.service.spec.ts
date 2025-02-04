import { SigChain } from '../../sigchain'
import { createLogger } from '../../../common/logger'
import { DeviceWithSecrets, LocalUserContext } from '3rd-party/auth/packages/auth/dist'
import { RoleName } from '..//roles/roles'
import { DeviceService } from './device.service'

const logger = createLogger('auth:services:device.spec')

describe('invites', () => {
  let adminSigChain: SigChain
  let newDevice: DeviceWithSecrets

  it('should initialize a new sigchain and be admin', () => {
    adminSigChain = SigChain.create('test', 'user')
    expect(adminSigChain).toBeDefined()
    expect(adminSigChain.context).toBeDefined()
    expect(adminSigChain.team!.teamName).toBe('test')
    expect(adminSigChain.localUserContext.user.userName).toBe('user')
    expect(adminSigChain.roles.amIMemberOfRole(adminSigChain.localUserContext, RoleName.ADMIN)).toBe(true)
    expect(adminSigChain.roles.amIMemberOfRole(adminSigChain.localUserContext, RoleName.MEMBER)).toBe(true)
  })
  it('sigchain should contain admin device', () => {
    adminSigChain.team!.hasDevice(adminSigChain.localUserContext.device.deviceId)
  })
  it('should generate a new device', () => {
    newDevice = DeviceService.generateDeviceForUser(adminSigChain.localUserContext.user.userId)
    expect(newDevice).toBeDefined()
  })
  it('should redactDevice', () => {
    const redactedDevice = DeviceService.redactDevice(newDevice)
    expect(redactedDevice).toBeDefined()
    expect(redactedDevice.deviceId).toBe(newDevice.deviceId)
    expect(redactedDevice.deviceName).toBe(newDevice.deviceName)
  })
})
