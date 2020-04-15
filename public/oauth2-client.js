const { google } = require('googleapis')

module.exports = new google.auth.OAuth2(
  '746882777446-hbhmr8filtaqbu873lo7s1u6ppkur9fc.apps.googleusercontent.com',
  'nxyhiA7prfkSstPYBqUD9YMO',
  ['urn:ietf:wg:oauth:2.0:oob', 'http://localhost']
)
