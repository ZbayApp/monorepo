import { Global, Module } from '@nestjs/common'
import express from 'express'
import getPort from 'get-port'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { Level } from 'level'
import {
  EXPRESS_PROVIDER,
  CONFIG_OPTIONS,
  QUIET_DIR,
  ORBIT_DB_DIR,
  TestConfig,
  IPFS_REPO_PATCH,
  SERVER_IO_PROVIDER,
  SOCKS_PROXY_AGENT,
  DB_PATH,
  LEVEL_DB,
  TEST_DATA_PORT,
  LIBP2P_DB_PATH,
} from '../const'
import { ConfigOptions } from '../types'
import path from 'path'
import { Server as SocketIO } from 'socket.io'
import { createServer } from 'http'
import cors from 'cors'
import { createTmpDir, getCors, torBinForPlatform, torDirForPlatform } from './utils'

const torPath = torBinForPlatform()
const libPath = torDirForPlatform()
export const defaultConfigForTest = {
  socketIOPort: TEST_DATA_PORT,
  torBinaryPath: torPath,
  torResourcesPath: torPath,
  torControlPort: await getPort(),
  options: {
    env: {
      LD_LIBRARY_PATH: libPath,
      appDataPath: '',
    },
    detached: true,
  },
}
@Global()
@Module({
  imports: [],
  providers: [
    {
      provide: EXPRESS_PROVIDER,
      useFactory: () => express(),
    },
    {
      provide: CONFIG_OPTIONS,
      useValue: defaultConfigForTest,
    },
    {
      provide: QUIET_DIR,
      useFactory: () => path.join(createTmpDir().name, TestConfig.QUIET_DIR),
    },
    {
      provide: ORBIT_DB_DIR,
      useFactory: (_quietDir: string) => path.join(createTmpDir().name, TestConfig.ORBIT_DB_DIR),
      inject: [QUIET_DIR],
    },
    {
      provide: IPFS_REPO_PATCH,
      useFactory: (_quietDir: string) => path.join(createTmpDir().name, TestConfig.IPFS_REPO_PATH),
      inject: [QUIET_DIR],
    },

    {
      provide: SERVER_IO_PROVIDER,
      useFactory: async (expressProvider: express.Application) => {
        const _app = expressProvider
        _app.use(cors())
        const server = createServer(_app)
        const io = new SocketIO(server, {
          cors: getCors(),
          pingInterval: 1000_000,
          pingTimeout: 1000_000,
        })
        return { server, io }
      },
      inject: [EXPRESS_PROVIDER],
    },
    {
      provide: SOCKS_PROXY_AGENT,
      useFactory: async (configOptions: ConfigOptions) => {
        if (!configOptions.httpTunnelPort) {
          configOptions.httpTunnelPort = await getPort()
        }
        return new HttpsProxyAgent(`http://127.0.0.1:${configOptions.httpTunnelPort}`)
      },
      inject: [CONFIG_OPTIONS],
    },
    {
      provide: DB_PATH,
      useFactory: () => path.join(createTmpDir().name, 'testDB-nest'),
    },
    {
      provide: LIBP2P_DB_PATH,
      useFactory: () => path.join(createTmpDir().name, 'testDB-libp2p'),
    },
    {
      provide: LEVEL_DB,
      useFactory: (dbPath: string) => new Level<string, any>(dbPath, { valueEncoding: 'json' }),
      inject: [DB_PATH],
    },
  ],
  exports: [
    CONFIG_OPTIONS,
    QUIET_DIR,
    ORBIT_DB_DIR,
    IPFS_REPO_PATCH,
    SERVER_IO_PROVIDER,
    SOCKS_PROXY_AGENT,
    LEVEL_DB,
    EXPRESS_PROVIDER,
    LIBP2P_DB_PATH,
  ],
})
export class TestModule {}
