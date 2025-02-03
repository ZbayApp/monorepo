/* eslint-disable */
import { setEngine, CryptoEngine } from 'pkijs'
import { setEngine as setIdentityEngine } from '../../identity/node_modules/pkijs'
import { Crypto } from '@peculiar/webcrypto'
import React from 'react'

import { io } from 'socket.io-client'

const webcrypto = new Crypto()
global.crypto = webcrypto

setEngine(
  'newEngine',
  webcrypto,
  new CryptoEngine({
    name: '',
    crypto: webcrypto,
    subtle: webcrypto.subtle,
  })
)

setIdentityEngine(
  'newEngine',
  webcrypto,
  new CryptoEngine({
    name: '',
    crypto: webcrypto,
    subtle: webcrypto.subtle,
  })
)

jest.mock('react-native-config', () => ({
  NODE_ENV: 'staging',
}))

jest.mock('redux-persist-filesystem-storage', () => { })

jest.mock('redux-persist', () => {
  const real = jest.requireActual('redux-persist')
  return {
    ...real,
    persistReducer: jest.fn().mockImplementation((config, reducers) => reducers),
  }
})

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter')

jest.mock('redux-persist-filesystem-storage', () => ({
  config: jest.fn()
}))

jest.mock('react-native-blob-util', () => ({
  fs: {
    dirs: {
      DocumentDir: 'dir'
    }
  }
}))

jest.mock('react-native-mathjax-html-to-svg', () => { })

jest.mock('react-native-qrcode-svg', () => jest.fn())

jest.mock('react-native-progress', () => ({
  CircleSnail: jest.fn(),
}))

jest.mock(
  '@ronradtke/react-native-markdown-display', () => ({
    __esModule: true,
    default: (props: any) => {
      return <div>{props.children}</div>
    },
    MarkdownIt: jest.fn()
  }))

jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}))

// Mocked because of: 
// 
// "Invariant Violation: TurboModuleRegistry.getEnforcing(...): 'RNDocumentPicker'
// could not be found. Verify that a module by this name is registered in the native binary."
jest.mock('react-native-document-picker', () => { })

// Mocked because of:
//
// /Users/isla/Dev/quiet/packages/mobile/node_modules/react-native-image-picker/src/index.ts:1
// ({"Object.<anonymous>":function(module,exports,require,__dirname,__filename,jest){import {Platform} from 'react-native';
// ^^^^^^
// 
// SyntaxError: Cannot use import statement outside a module
jest.mock('react-native-image-picker', () => { })

jest.mock('react-native-device-info', () => {
  return {
    getVersion: () => { return '1.0.0' }
  }
})

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => {
    return {
      bottom: 0
    }
  }
}))

export const ioMock = io as jest.Mock

jest.resetAllMocks()
