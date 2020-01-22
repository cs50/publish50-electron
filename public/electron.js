const { app, BrowserWindow, dialog, globalShortcut, Menu } = require('electron')
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
  await execFile(
    getBin('redis-server'),
    [
      '--daemonize', 'yes',
      '--port', redisPort,
      '--appendonly', 'yes',
      '--appendfsync', 'everysec'
    ],
    { cwd: app.getPath('userData') }
  )

  return new Promise((resolve, reject) => {
    const client = redis.createClient({
      port: redisPort,
      retry_strategy(options) {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.error(options.error)
        }

        if (options.attempt > 3) {
          const err = new Error(
            `Are you sure port ${redisPort} is available? Try killing any ` +
            `process listening on port ${redisPort} or changing redis port ` +
            'in Preferences, restart publish50, and try again!'
          )

          reject(err)
          return err
        }

        // Reconnect after 3 seconds
        return 3000
      }
    })

    client.once('connect', () => {
      // Rewrite AOF every minute
      setInterval(() => {
        client.bgrewriteaof()
      }, 60000)

      resolve()
    })
  })
}

function initialize(queues) {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    icon: path.join(__dirname, '../src/assets/logos/128x128.png'),
    show: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadURL(process.env.ELECTRON_DEV ?
    'http://localhost:3000' :
    `file://${path.join(__dirname, '../build/index.html')}`
  )

  mainWindow.webContents.on('did-finish-load', () => mainWindow.show())

  // open devtools if DEV_TOOLS is set to 1
  if (parseInt(process.env.DEV_TOOLS)) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', async () => {

  globalShortcut.register('CommandOrControl+Q', () => {

    // prompt user before closing the application if there are active jobs
    if (Object.keys(queues['queues']['video transcoding']['childPool'].retained).length != 0) {
      const dialogOptions = {type: 'info', buttons: ['Cancel', 'Quit'], message: 'There are active jobs running, quit anyway?'}
      dialog.showMessageBox(dialogOptions, i => {
        console.log("user has chosen: " + i)
        if (i == 1) { app.quit() }
      })
    } else { app.quit() }

  })

  // Download update, install when the app quits
  updater.checkForUpdatesAndNotify()

  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'delete' },
          { role: 'selectall' }
        ]
      }
    ]));
  }

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

app.on('quit', () => {
  queues.close()
})
