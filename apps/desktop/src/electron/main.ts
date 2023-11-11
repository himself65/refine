import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import path from 'node:path'
import * as console from 'console'

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(
  process.env.DIST, '../public')

let browserWindow: BrowserWindow | null = null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

if (!process.env.VITE_PUBLIC) {
  throw new Error('VITE_PUBLIC is undefined')
}

const VITE_PUBLIC = process.env.VITE_PUBLIC
if (!process.env.DIST) {
  throw new Error('DIST is undefined')
}

const DIST = process.env.DIST

if (VITE_DEV_SERVER_URL && process.env.SESSION_DATA_PATH) {
  app.setPath('sessionData', process.env.SESSION_DATA_PATH)
}

function createWindow () {
  const window = new BrowserWindow({
    icon: path.join(VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      additionalArguments: process.env.PLAYGROUND ? [
        '--playground'
      ] : [],
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // Test active push message to Renderer-process.
  window.webContents.on('did-finish-load', () => {
    window?.webContents.send('main-process-message',
      (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    window.loadURL(VITE_DEV_SERVER_URL).catch((reason) => {
      console.error('loadURL failed:', reason)
    })
  } else {
    // win.loadFile('dist/index.html')
    window.loadFile(path.join(DIST, 'index.html')).catch((reason) => {
      console.error('loadFile failed:', reason)
    })
  }

  return window
}

function registerHandlers () {
  ipcMain.handle('get-theme', () => {
    return nativeTheme.themeSource
  })
  ipcMain.handle('change-theme', (_, theme: 'dark' | 'light') => {
    nativeTheme.themeSource = theme
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    browserWindow?.close()
    app.quit()
  }
})

app.on('activate', () => {
  if (browserWindow === null) {
    browserWindow = createWindow()
  }
})

app.whenReady().then(registerHandlers).then(createWindow)
