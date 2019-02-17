const log = require('./log')

const { autoUpdater } = require('electron-updater')
autoUpdater.logger = log

module.exports = autoUpdater


