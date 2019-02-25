const path = require('path')

const { client_id, client_secret, redirect_uris }  = require(
  path.join(require('os').homedir(), '.publish50', 'client_secret')
).installed

module.exports = {
  client_id,
  client_secret,
  redirect_uri: redirect_uris[redirect_uris.length - 1]
}

