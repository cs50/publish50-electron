const { app, dialog } = require('electron')

let isBoxOpen = false
let userResponse = -1

function showMessageBox(options, cb) {

  if (isBoxOpen) {
    return
  }
  else {
    isBoxOpen = true
  }

  dialog.showMessageBox(
    options,
    (selectedIndex) => {
      cb(selectedIndex)
    })

  isBoxOpen = false
}

module.exports = { showMessageBox }
