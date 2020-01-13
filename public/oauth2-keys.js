const path = require('path')

const logger = require('./logger')

let client_id = '', client_secret = '', redirect_uris = []
try {
  ({ client_id, client_secret, redirect_uris }  = require(
    path.join(require('os').homedir(), '.publish50', 'client_secret.json')
  ).installed)
}
catch (err) {
  logger.error(err)
}

module.exports = {
  client_id,
  client_secret,
  redirect_uri: redirect_uris.length > 0 && redirect_uris[redirect_uris.length - 1] || ''
}

