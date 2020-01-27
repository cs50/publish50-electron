const { app, dialog } = require('electron')

let isBoxOpen = false
let userResponse = -1

function show(type, buttons, message) {

  if (isBoxOpen) {
    return
  }
  else {
    isBoxOpen = true
  }

  userResponse = dialog.showMessageBox(
    {
      type: type,
      buttons: buttons,
      message: message
    }
  )
  isBoxOpen = false

  return userResponse
}

module.exports = { show }
