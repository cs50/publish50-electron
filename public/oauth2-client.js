const { google } = require('googleapis')

const { client_id, client_secret, redirect_uri }  = require('./oauth2-keys')

module.exports = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uri
)
