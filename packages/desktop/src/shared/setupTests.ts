import { setEngine, CryptoEngine } from 'pkijs'
import { Crypto } from '@peculiar/webcrypto'

import { io } from 'socket.io-client'

const webcrypto = new Crypto()
setEngine(
  'newEngine',
  webcrypto,
  new CryptoEngine({
    name: '',
    crypto: webcrypto,
    subtle: webcrypto.subtle,
  })
)
// @ts-ignore
global.crypto = webcrypto

// @ts-ignore
process._linkedBinding = name => name

jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}))

export const ioMock = io as jest.Mock

jest.mock('electron-store-webpack-wrapper')

jest.mock('electron', () => {
  return { ipcRenderer: { on: () => {}, send: jest.fn(), sendSync: jest.fn() } }
})

jest.mock('electron-store', () => {
  return class ElectronStore {
    // eslint-disable-next-line
    constructor() { }
  }
})

// Setup a type that includes [Symbol.iterator]
type ElectronRemoteMock = {
  BrowserWindow: {
    getAllWindows: () => Array<{
      isFocused: () => boolean
      show: jest.Mock
    }>
  }
  [Symbol.iterator]: () => Generator<number, void, unknown>
}

jest.mock('@electron/remote', () => {
  function* mockIterator(): Generator<number, void, unknown> {
    yield 1
    yield 2
    yield 3
  }

  const mock: ElectronRemoteMock = {
    BrowserWindow: {
      getAllWindows: () => [
        {
          isFocused: () => true,
          show: jest.fn(),
        },
      ],
    },
    [Symbol.iterator]: mockIterator,
  }
  return mock
})

jest.mock('../renderer/components/Jdenticon/Jdenticon', () => () => 'Jdenticon')

// eslint-disable-next-line
const mockFetch: typeof fetch = async () => await Promise.resolve({} as Response)
global.fetch = mockFetch

// This helps with getting the @ipld/dag-cbor library working with
// Jest.
import { TextEncoder, TextDecoder } from 'util'
Object.assign(global, { TextDecoder, TextEncoder })

jest.resetAllMocks()
