const log = require('electron-log')
log.transports.file.appName = 'publish50'
log.transports.file.fileName = 'main.log'

module.exports = log
