import { Inject, Injectable } from '@nestjs/common'
import net from 'net'
import { CONFIG_OPTIONS, TOR_CONTROL_PARAMS } from '../const'
import { ConfigOptions } from '../types'
import { TorControlAuthType, TorControlParams } from './tor.types'
import { createLogger } from '../common/logger'

@Injectable()
export class TorControl {
  connection: net.Socket | null
  isSending: boolean
  authString: string
  private readonly logger = createLogger(TorControl.name)

  constructor(
    @Inject(TOR_CONTROL_PARAMS) public torControlParams: TorControlParams,
    @Inject(CONFIG_OPTIONS) public configOptions: ConfigOptions
  ) {
    this.isSending = false
  }

  private updateAuthString() {
    if (this.torControlParams.auth.type === TorControlAuthType.PASSWORD) {
      this.authString = 'AUTHENTICATE "' + this.torControlParams.auth.value + '"\r\n'
    }
    if (this.torControlParams.auth.type === TorControlAuthType.COOKIE) {
      // Cookie authentication must be invoked as a hexadecimal string passed without double quotes
      this.authString = 'AUTHENTICATE ' + this.torControlParams.auth.value + '\r\n'
    }
  }

  private async _connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.connection = net.connect({
        port: this.torControlParams.port,
        family: 4,
      })

      this.connection.once('error', err => {
        this.disconnect()
        reject(new Error(`Connection via Tor control failed: ${err}`))
      })

      this.connection.once('data', (data: any) => {
        if (/250 OK/.test(data.toString())) {
          resolve()
        } else {
          this.disconnect()
          reject(new Error(`Tor Control port error: ${data.toString() as string}`))
        }
      })

      this.updateAuthString()
      this.connection.write(this.authString)
    })
  }

  private async connect(): Promise<void> {
    // TODO: We may want to limit the number of connection attempts.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        this.logger.info(`Connecting to Tor, host: ${this.torControlParams.host} port: ${this.torControlParams.port}`)
        await this._connect()
        this.logger.info('Tor connected')
        return
      } catch (e) {
        this.logger.error('Retrying due to error...', e)
        await new Promise(r => setTimeout(r, 500))
      }
    }
  }

  private disconnect() {
    try {
      this.connection?.end()
    } catch (e) {
      this.logger.error('Disconnect failed:', e)
    }
    this.connection = null
  }

  public _sendCommand(command: string): Promise<{ code: number; messages: string[] }> {
    return new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        reject('Timeout while sending command to Tor')
      }, 5000)

      this.connection?.on('data', async data => {
        const dataArray = data.toString().split(/\r?\n/)

        if (dataArray[0].startsWith('250')) {
          resolve({ code: 250, messages: dataArray })
        } else {
          clearTimeout(connectionTimeout)
          this.logger.error(`TOR CONNECTION ERROR:`, dataArray)
          reject(`${dataArray[0]}`)
        }
        clearTimeout(connectionTimeout)
      })

      this.connection?.write(command + '\r\n')
    })
  }

  public async sendCommand(command: string): Promise<{ code: number; messages: string[] }> {
    this.logger.info(`Sending tor command: ${command}`)
    // Only send one command at a time.
    if (this.isSending) {
      this.logger.info('Tor connection already established, waiting...')
    }

    // Wait for existing command to finish.
    while (this.isSending) {
      const timeout = 750
      this.logger.info(`Waiting for ${timeout}ms to retry command...`)
      await new Promise(r => setTimeout(r, timeout))
    }

    this.isSending = true
    await this.connect()
    // FIXME: Errors are not caught here. Is this what we want?
    const res = await this._sendCommand(command)
    this.disconnect()
    this.isSending = false
    return res
  }
}
