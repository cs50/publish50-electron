const { logger } = window
logger.transports.file.appName = 'publish50'
logger.transports.file.fileName = 'renderer.log'

module.exports = logger
