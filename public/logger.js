const logger = require('electron-log')

logger.transports.file.appName = 'publish50'
logger.transports.file.fileName = 'main.log'

module.exports = logger
