const { dialog } = require('electron')

let messageBoxOpen = false

function showMessageBox(options, cb) {
  if (messageBoxOpen) {
    return
  }

  messageBoxOpen = true
  dialog.showMessageBox(
    options,
    (selectedIndex) => {
      try {
        cb(selectedIndex)
      }
      finally {
        messageBoxOpen = false
      }
    }
  )
}

module.exports = { showMessageBox }
