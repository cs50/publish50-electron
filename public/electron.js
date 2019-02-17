const { app, BrowserWindow, dialog, ipcMain: ipc } = require('electron')
const path = require('path')
const redis = require('redis')
const url = require('url')

const preferences = require('./preferences')(app.getVersion())

let mainWindow
let queues
function initialize(queues) {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    icon: path.join(__dirname, '../src/assets/logos/128x128.png'),
    show: false
  })

  mainWindow.loadURL(process.env.ELECTRON_DEV ?
    'http://localhost:3000' :
    `file://${path.join(__dirname, '../build/index.html')}`
  )

  mainWindow.webContents.on('did-finish-load', () => mainWindow.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', () => {
  queues = require('./queues')(preferences)
  initialize(queues)
  require('./ipc')(ipc, () => mainWindow, dialog, preferences, queues.queues)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    initialize(queues)
  }
})

app.on('quit', () => queues.close())
