import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { BrowserWindow } from 'electron'
import { createLogger } from './logger'

const logger = createLogger('invitation')

export const processInvitationCode = (mainWindow: BrowserWindow, code: string | string[]) => {
  if (!code || !code.length) return
  mainWindow.webContents.send('invitation', {
    code,
  })
}

export const updateDesktopFile = (isDev: boolean) => {
  if (isDev || process.platform !== 'linux') return

  const appDesktopFile = path.join(os.homedir(), '.local/share/applications/quiet.desktop')
  const resource = path.join(process.resourcesPath, 'quiet.desktop')

  try {
    if (!fs.existsSync(appDesktopFile)) {
      fs.cpSync(resource, appDesktopFile)
    }
  } catch (e) {
    logger.error(`Can't copy .desktop file`, e)
  }

  try {
    updateExecPath(appDesktopFile)
  } catch (e) {
    logger.error(`Can't update .desktop file`, e)
  }

  try {
    execSync('xdg-settings set default-url-scheme-handler quiet quiet.desktop')
  } catch (e) {
    logger.error("Couldn't set default scheme handler", e)
  }
}

export const updateExecPath = (desktopFilePath: string) => {
  /** Update Exec in case user moved .AppImage */
  const execInfo = `Exec=${process.env.APPIMAGE} %U`
  const desktopFile = fs.readFileSync(desktopFilePath, { encoding: 'utf-8' })
  if (!desktopFile.includes(execInfo)) {
    // Replace old Exec with new Exec
    const lines = desktopFile.split('\n')
    const newLines = lines.filter(line => !line.includes('Exec=') && line !== '')
    newLines.push(execInfo)
    fs.writeFileSync(desktopFilePath, newLines.join('\n'))
  }
}
