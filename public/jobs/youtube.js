const youtube = require('../youtube')
const oauth2client = require('../oauth2-client')
const logger = require('../logger')

module.exports = function (job) {
  return new Promise(async (resolve, reject) => {
    ({ credentials: oauth2client.credentials } = job.data )
    const videoUpload = await youtube.upload(oauth2client, job.data)

    process.on('message', (message) => {
      if (message.__abortJobId__ === job.id || message.__abortJobId__ === '__self__') {
        reject(new Error("ABORTED"))
        videoUpload.emit('abort')
      }
    })

    videoUpload.on('progress', (progress) => {
      job.progress(progress)
    })

    videoUpload.on('end', (response) => {
      logger.info(response)
      resolve(response)
    })
  })
}
