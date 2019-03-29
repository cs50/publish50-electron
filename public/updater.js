const logger = require('./logger')

const { autoUpdater } = require('electron-updater')
autoUpdater.logger = logger

module.exports = autoUpdater


