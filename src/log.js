const log = window.require('electron-log')
log.transports.file.appName = 'publish50'
log.transports.file.fileName = 'renderer.log'

module.exports = log
