import * as main from './main'
import * as backendHelpers from './backendHelpers'

import { autoUpdater } from 'electron-updater'
import { BrowserWindow, app, ipcMain, Menu } from 'electron'
import { waitFor } from '@testing-library/dom'
import path from 'path'
import { composeInvitationDeepUrl, getValidInvitationUrlTestData, validInvitationCodeTestData } from '@quiet/common'
import { InvitationData } from '@quiet/types'

// eslint-disable-next-line
const remote = require('@electron/remote/main')

const mockShowWindow = jest.fn()
const mockWindowWebContentsSend = jest.fn()
const mockwebContentsOn = jest.fn()
const mockwebContentsOnce = jest.fn()
const mockDestroyWindow = jest.fn()
const mockWindowOnce = jest.fn()
const mockSetMovable = jest.fn()
const mockSetAlwaysOnTop = jest.fn()

const spyCreateWindow = jest.spyOn(main, 'createWindow')
const spyGetPorts = jest.spyOn(backendHelpers, 'getPorts')

jest.spyOn(main, 'isBrowserWindow').mockReturnValue(true)
jest.spyOn(path, 'join').mockReturnValue('path')

jest.mock('electron-store', () => {
  return {
    initRenderer: jest.fn(),
  }
})

jest.mock('@electron/remote/main', () => {
  return {
    initialize: jest.fn(),
    enable: jest.fn(),
  }
})

jest.mock('electron-localshortcut', () => {
  return {
    register: jest.fn(),
  }
})

jest.mock('child_process', () => {
  return {
    ...jest.requireActual('child_process'),
    fork: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn(),
        send: jest.fn(),
      }
    }),
  }
})

jest.mock('electron', () => {
  return {
    ...jest.requireActual('electron'),
    app: {
      getPath: jest.fn().mockImplementation(() => {
        return '.'
      }),
      setPath: jest.fn(),
      getName: jest.fn(),
      getVersion: jest.fn(),
      requestSingleInstanceLock: jest.fn().mockReturnValue(true),
      quit: jest.fn(),
      exit: jest.fn(),
      on: jest.fn(),
      setAsDefaultProtocolClient: jest.fn(),
    },
    BrowserWindow: jest.fn().mockImplementation(() => {
      return {
        loadURL: jest.fn(),
        show: mockShowWindow,
        setMinimumSize: jest.fn(),
        on: jest.fn(),
        once: mockWindowOnce,
        getTitle: jest.fn(),
        destroy: mockDestroyWindow,
        isDestroyed: jest.fn(),
        setAlwaysOnTop: mockSetAlwaysOnTop,
        setMovable: mockSetMovable,
        getSize: jest.fn().mockImplementation(() => [600, 800]),
        getPosition: jest.fn().mockImplementation(() => [600, 800]),
        setSize: jest.fn(),
        setPosition: jest.fn(),
        isMinimized: jest.fn(),
        restore: jest.fn(),
        focus: jest.fn(),
        webContents: {
          on: mockwebContentsOn,
          once: mockwebContentsOnce,
          send: mockWindowWebContentsSend,
        },
      }
    }),
    Menu: {
      setApplicationMenu: jest.fn(),
    },
    ipcMain: {
      on: jest.fn(),
    },
  }
})

jest.mock('electron-updater', () => {
  return {
    autoUpdater: {
      checkForUpdates: jest.fn(),
      on: jest.fn(),
    },
  }
})

jest.mock('backend-bundle', jest.fn())

const appOn = app.on as jest.Mock<any, any>
const setApplicationMenu = Menu.setApplicationMenu as jest.Mock<any, any>
const autoUpdaterOn = autoUpdater.on as jest.Mock<any, any>
const mockAppOnCalls = appOn.mock.calls
const mockIpcMainOn = ipcMain.on as jest.Mock<any, any>

describe('electron app ready event', () => {
  it('application will trigger ready event, next run listener function of ready event', async () => {
    expect(mockAppOnCalls[2][0]).toBe('ready')
    await mockAppOnCalls[2][1]()
  })

  it('application menu will set one time as null - remove menu bar', async () => {
    expect(setApplicationMenu).toHaveBeenCalledTimes(1)
    expect(setApplicationMenu).toHaveBeenCalledWith(null)
  })

  it('get ports logic will trigger and will return propper ports', async () => {
    expect(spyGetPorts).toHaveBeenCalledTimes(1)
    const getPortsResult = async (): Promise<any> => spyGetPorts.mock.results[0].value
    await waitFor(async () =>
      expect(Object.keys(await getPortsResult())).toEqual([
        'socksPort',
        'libp2pHiddenService',
        'controlPort',
        'httpTunnelPort',
        'dataServer',
      ])
    )
  })

  it('creates splash screen and main window, show splash screen', async () => {
    expect(spyCreateWindow).toHaveBeenCalledTimes(1)

    // create 2 windows, splash screen and main window
    expect(BrowserWindow).toHaveBeenCalledTimes(2)
    // show spalsh screen
    expect(mockShowWindow).toHaveBeenCalledTimes(1)

    expect(mockSetAlwaysOnTop).toHaveBeenCalledWith(false)
    expect(mockSetMovable).toHaveBeenCalledWith(true)
  })

  it('replacing splash screen with main window in webcontents did-finish-load window event', async () => {
    const mockwebContentsOnCalls = mockwebContentsOn.mock.calls
    expect(mockwebContentsOnCalls[0][0]).toBe('did-finish-load')
    mockShowWindow.mockClear()

    mockwebContentsOnCalls[0][1]()

    // expect the splash screen to be destroyed and the main window to appear
    expect(mockDestroyWindow).toHaveBeenCalledTimes(1)
    expect(mockShowWindow).toHaveBeenCalledTimes(1)
  })

  it('close application and save state correctly', async () => {
    const mockWindowOnceCalls = mockWindowOnce.mock.calls

    expect(mockWindowOnce).toHaveBeenCalledTimes(2)
    expect(mockWindowOnceCalls[0][0]).toBe('close')
    const event = { preventDefault: () => {} }
    mockWindowOnceCalls[0][1](event)
    expect(mockWindowWebContentsSend).toHaveBeenCalledWith('force-save-state')

    const mockIpcMainOnCalls = mockIpcMainOn.mock.calls
    expect(mockIpcMainOnCalls[0][0]).toBe('state-saved')
  })

  it('checks for updates in webcontents once did-finish-load window event', async () => {
    const mockwebContentsOnceCalls = mockwebContentsOnce.mock.calls
    expect(mockwebContentsOnceCalls[0][0]).toBe('did-finish-load')

    await mockwebContentsOnceCalls[0][1]()

    // checking is autoUpdater strat
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1)

    // checking autoUpdater events are triggered
    expect(autoUpdaterOn.mock.calls[0][0]).toBe('checking-for-update')
    expect(autoUpdaterOn.mock.calls[1][0]).toBe('error')
    expect(autoUpdaterOn.mock.calls[2][0]).toBe('update-not-available')
    expect(autoUpdaterOn.mock.calls[3][0]).toBe('update-available')

    // update-downloaded event will send contet about available update to renderer process
    expect(autoUpdaterOn.mock.calls[4][0]).toBe('update-downloaded')
    autoUpdaterOn.mock.calls[4][1]()
    expect(mockWindowWebContentsSend).toHaveBeenCalledWith('newUpdateAvailable')
  })
})

// to improve
describe('other electron app events ', () => {
  it('app events listeners triggering', async () => {
    expect(mockAppOnCalls[0][0]).toBe('second-instance')
    expect(mockAppOnCalls[1][0]).toBe('open-url')
    expect(mockAppOnCalls[2][0]).toBe('ready')
    // browser-window-created app event
    const window = new BrowserWindow()
    expect(mockAppOnCalls[3][0]).toBe('browser-window-created')
    mockAppOnCalls[3][1](null, window)
    expect(remote.enable).toHaveBeenCalled()

    // window-all-closed app event
    expect(mockAppOnCalls[4][0]).toBe('window-all-closed')
    mockAppOnCalls[4][1]()

    // activate app event
    expect(mockAppOnCalls[5][0]).toBe('activate')
    mockAppOnCalls[5][1]()
  })
})

describe('Invitation code', () => {
  let codes: InvitationData

  beforeEach(() => {
    codes = { ...getValidInvitationUrlTestData(validInvitationCodeTestData[0]).data }
  })

  it('handles invitation code on open-url event (on macos)', async () => {
    expect(mockAppOnCalls[2][0]).toBe('ready')
    await mockAppOnCalls[2][1]()

    expect(mockAppOnCalls[1][0]).toBe('open-url')
    const event = { preventDefault: () => {} }
    const deepUrl = composeInvitationDeepUrl(codes)
    mockAppOnCalls[1][1](event, deepUrl)
    expect(mockWindowWebContentsSend).toHaveBeenCalledWith('invitation', { code: deepUrl })
  })

  it('do not process invitation code on open-url event (on macos) if url is empty', async () => {
    expect(mockAppOnCalls[2][0]).toBe('ready')
    await mockAppOnCalls[2][1]()

    expect(mockAppOnCalls[1][0]).toBe('open-url')
    const event = { preventDefault: () => {} }
    mockAppOnCalls[1][1](event, '')
    expect(mockWindowWebContentsSend).not.toHaveBeenCalledWith('invitation', { code: '' })
  })

  it('process invitation code on second-instance event', async () => {
    await mockAppOnCalls[2][1]()
    const deepUrl = composeInvitationDeepUrl(codes)
    const commandLine = ['/tmp/.mount_Quiet-TVQc6s/quiet', deepUrl, 'something/else']
    expect(mockAppOnCalls[0][0]).toBe('second-instance')
    const event = { preventDefault: () => {} }
    mockAppOnCalls[0][1](event, commandLine)
    expect(mockWindowWebContentsSend).toHaveBeenCalledWith('invitation', { code: deepUrl })
  })
})
