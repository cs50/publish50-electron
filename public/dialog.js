const { dialog } = require('electron')

let messageBoxOpen = false

function showMessageBox(options, cb) {
  if (messageBoxOpen) {
    return
  }
  messageBoxOpen = true

  dialog.showMessageBox(options).then((data) => {
    try {
      cb(data.response)
    }
    finally {
      messageBoxOpen = false
    }
  })
}

module.exports = { showMessageBox }
