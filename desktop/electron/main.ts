import { app, BrowserWindow, globalShortcut } from 'electron'
import { installExtension, REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } from 'electron-devtools-installer'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  installExtension([REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS])
    .then(([redux, react]) => console.log(`Added Extensions: ${redux.name}, ${react.name}`))
    .catch((err) => console.log('An error occurred: ', err))

  createWindow()

  globalShortcut.register('Ctrl+Tab', () => {
    mainWindow?.webContents.executeJavaScript(
      `console.log('[TabNav] __milkdownTabNavigate:', typeof window.__milkdownTabNavigate); window.__milkdownTabNavigate?.(false)`
    )
  })

  globalShortcut.register('Ctrl+Shift+Tab', () => {
    mainWindow?.webContents.executeJavaScript(
      `console.log('[TabNav] __milkdownTabNavigate:', typeof window.__milkdownTabNavigate); window.__milkdownTabNavigate?.(true)`
    )
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
