const { app, BrowserWindow, dialog, ipcMain: ipc } = require('electron')
const { exec } = require('child_process')
const isDev = require('electron-is-dev')
const path = require('path')
const redis = require('redis')
const url = require('url')

const preferences = require('./preferences')(app.getVersion())

let mainWindow
function initialize(queues) {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    icon: path.join(__dirname, '../src/assets/logos/128x128.png'),
    show: false
  })

  mainWindow.loadURL(isDev ?
    'http://localhost:3000' :
    `file://${path.join(__dirname, '../build/index.html')}`
  )

  mainWindow.webContents.on('did-finish-load', () => mainWindow.show())
  mainWindow.on('closed', () => {
    queues.close()
    mainWindow = null
  })
}

app.on('ready', () => {
  const queues = require('./queues')(preferences)
  initialize(queues)
  require('./ipc')(ipc, mainWindow, preferences, queues.queues)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    initialize()
  }
})
