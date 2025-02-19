import { hangingBackendProcessCommand } from '@quiet/common'
import { execSync } from 'child_process'
import getPort from 'get-port'
import { createLogger } from './logger'

const logger = createLogger('backendHelpers')

export const getPorts = async (): Promise<{
  socksPort: number
  libp2pHiddenService: number
  controlPort: number
  httpTunnelPort: number
  dataServer: number
}> => {
  const controlPort = await getPort()
  const httpTunnelPort = await getPort()
  const socksPort = await getPort()
  const libp2pHiddenService = await getPort()
  const dataServer = await getPort()
  return {
    socksPort,
    libp2pHiddenService,
    controlPort,
    httpTunnelPort,
    dataServer,
  }
}

export type ApplicationPorts = Awaited<ReturnType<typeof getPorts>>

export const closeHangingBackendProcess = (backendBundlePath: string, dataDir: string) => {
  const command = hangingBackendProcessCommand({ backendBundlePath, dataDir })
  if (!command) return
  const backendPids = execSync(command).toString('utf8').trim()
  if (!backendPids) return
  logger.info('PIDs', backendPids)
  const PIDs = backendPids.split('\n')
  logger.info(`Found ${PIDs.length} hanging backend process(es) with pid(s) ${PIDs}. Killing...`)
  for (const pid of PIDs) {
    try {
      process.kill(Number(pid), 'SIGKILL')
    } catch (e) {
      logger.error(`Tried killing hanging backend process (PID: ${pid}). Failed`, e)
    }
  }
}
