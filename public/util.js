const path = require('path')

module.exports = {
  getBin(bin) {
    // TODO check if there's a better way to reference process.resourcesPath
    // from sandboxed process
    const resourcesPath = process.resourcesPath || path.dirname(path.dirname(__dirname))

    return path.join(
      path.dirname(process.env.ELECTRON_DEV ? __dirname : resourcesPath),
      'bin',
      process.platform === 'darwin' ? 'mac' : 'linux',
      bin
    )
  },

  distFolder(inputFile) {
    return path.join(path.dirname(inputFile), '../dist', path.basename(inputFile, path.extname(inputFile)))
  }
}
