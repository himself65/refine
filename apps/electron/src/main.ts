import { app, BrowserWindow } from 'electron'
import path from 'node:path'

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(
  process.env.DIST, '../public')

let browserWindow: BrowserWindow | null = null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
if (VITE_DEV_SERVER_URL && process.env.SESSION_DATA_PATH) {
  app.setPath('sessionData', process.env.SESSION_DATA_PATH)
}

function createWindow () {
  const window = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg')
  })

  // Test active push message to Renderer-process.
  window.webContents.on('did-finish-load', () => {
    window?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    window.loadURL(VITE_DEV_SERVER_URL).catch((reason) => {
      console.error('loadURL failed:', reason)
    })
  } else {
    // win.loadFile('dist/index.html')
    window.loadFile(path.join(process.env.DIST, 'index.html')).catch((reason) => {
      console.error('loadFile failed:', reason)
    })
  }

  return window
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

app.whenReady().then(createWindow)
