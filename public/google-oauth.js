const { BrowserWindow } = require('electron')
const path = require('path')

const preferences = require('./preferences')
const logger = require('./logger')

class OAuth2Client {
  constructor() {
    this.client = require('./oauth2-client')
  }

  authenticate(scopes) {
    return new Promise((resolve, reject) => {
      const savedTokens = preferences.get('googleCredentials.tokens')
      if (savedTokens) {
        this.client.credentials = savedTokens
        resolve(savedTokens)
        return
      }

      const win = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        webPreferences: {
          nodeIntegration: false
        }
      })

      win.webContents.on('will-redirect', async (event, url_) => {
        const url = new URL(url_)
        const code = url.searchParams.get('code')
        const err = url.searchParams.get('error')

        if (code) {
          const { tokens } = await this.client.getToken(code)
          this.client.credentials = tokens
          preferences.save({
            googleCredentials: { tokens }
          })

          resolve(tokens)
          win.close()
        }
        else if (err) {
          // Error obtaining authorization code
          // e.g., user didn't grant permissions
          // TODO show error
          reject(new Error(err.toString()))
          win.close()
        }
      })

      // TODO use PKCE
      win.loadURL(this.client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes.join(' ')
      }))
    })
  }
}

module.exports = new OAuth2Client()
