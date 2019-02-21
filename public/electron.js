const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const redis = require('redis')
const url = require('url')

const util = require('util')
const childProcess = require('child_process')
const execFile = util.promisify(childProcess.execFile)

const logger = require('./logger')
const preferences = require('./preferences')
const updater = require('./updater')
const { getBin } = require('./util')

let mainWindow
let queues

async function startRedis() {
  const redisPort = preferences.get('general.redisPort')
  await execFile(getBin('redis-server'), [ '--daemonize', 'yes', '--port', redisPort ])
  try {
    await new Promise((resolve, reject) => {
      let retries = 3
      const interval = setInterval(async () => {
        let { stdout, stderr } = (await execFile(getBin('redis-cli'), [ '-p', redisPort, 'ping']))
        retries--
        if (stdout.trim() === 'PONG') {
          clearInterval(interval)
          resolve(stdout)
        }
        else if (retries <= 0) {
          clearInterval(interval)
          reject(stderr)
        }
      }, 1000)
    })
  }
  catch(err) {
    logger.error(err.toString())
    dialog.showMessageBox({
      type: 'error',
      buttons: [ 'OK' ],
      message: 'Failed to connect to redis server',
      detail: `Are you sure port ${redisPort} is available? Try killing any process listening on port ${redisPort} or changing redis port from Preferences, restart publish50, and try again!`
    })
  }
}

function initialize(queues) {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    icon: path.join(__dirname, '../src/assets/logos/128x128.png'),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
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

app.on('ready', async () => {

  // Download update, install when the app quits
  updater.checkForUpdatesAndNotify()

  try {
    await startRedis()
  }
  catch (err) {
    logger.error(err)
    dialog.showMessageBox({
      type: 'error',
      buttons: [ 'OK' ],
      message: 'Failed to start redis server',
      detail: err.toString()
    })
  }
  queues = require('./queues')
  initialize(queues)
  require('./ipc')
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
