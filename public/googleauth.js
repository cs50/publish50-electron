const fetch = require('node-fetch')
const { BrowserWindow } = require('electron')
const logger = require('electron-log')

const CLIENT_ID = '721674863805-3sd3303klbp1rmrhnpb1s619budi16bd.apps.googleusercontent.com'
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const ACCESS_TOKEN_URL = 'https://1cvsdo7ric.execute-api.us-east-1.amazonaws.com/production'

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/youtube.upload'
]

module.exports = {
  getAccessToken() {
    return new Promise((resolve, reject) => {
      const win = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        webPreferences: {
          nodeIntegration: false
        }
      })

      win.webContents.on('will-navigate', (event, url_) => {
        const url = new URL(url_)
        const code = url.searchParams.get('code')
        const err = url.searchParams.get('error')

        if (code) {
          // Our API Gateway endpoint
          fetch(`${ACCESS_TOKEN_URL}?code=${code}`)
          .then((response) => response.json())
          .then((response) => {
            if (response.error) {
              // Error obtaining access token
              // TODO show error
              logger.error(response)
              reject(response)
            }
            else {
              resolve(response)
            }

            win.close()
          })
        }
        else if (err) {
          // Error obtaining authorization code
          // e.g., user didn't grant permissions
          // TODO show error
          logger.error(err)
          reject(response)
          win.close()
        }
      })

      // TODO use PKCE
      win.loadURL(encodeURI(
        `${GOOGLE_AUTH_URL}?` +
        'response_type=code&' +
        'redirect_uri=http://localhost&' +
        `client_id=${CLIENT_ID}&` +
        `scope=${SCOPES.join(' ')}`
      ))
    })
  }
}
