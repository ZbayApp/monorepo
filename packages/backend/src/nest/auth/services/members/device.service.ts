/**
 * Handles device-related chain operations
 */

import getMAC from 'getmac'
import { ChainServiceBase } from '../chainServiceBase'
import { Device, DeviceWithSecrets, redactDevice } from '@localfirst/auth'
import { SigChain } from '../../sigchain'
import { createLogger } from '../../../common/logger'

const logger = createLogger('auth:deviceService')
class DeviceService extends ChainServiceBase {
  public static init(sigChain: SigChain): DeviceService {
    return new DeviceService(sigChain)
  }

  /**
   * Generate a brand new QuietDevice for a given User ID
   *
   * @param userId User ID that this device is associated with
   * @returns A newly generated QuietDevice instance
   */
  public static generateDeviceForUser(userId: string): DeviceWithSecrets {
    const params = {
      userId,
      deviceName: DeviceService.determineDeviceName(),
    }

    return SigChain.lfa.createDevice(params)
  }

  /**
   * Get an identifier for the current device
   *
   * @returns Formatted MAC address of the current device
   */
  public static determineDeviceName(): string {
    const mac = getMAC()
    return mac.replace(/:/g, '')
  }

  public static redactDevice(device: DeviceWithSecrets): Device {
    return redactDevice(device)
  }
}

export { DeviceService }
