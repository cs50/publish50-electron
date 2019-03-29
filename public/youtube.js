const { google } = require('googleapis')
const fs = require('fs')
const EventEmitter = require('events')

const logger = require('./logger')

module.exports = {
  scopes: [
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube.upload'
  ],

  maxVideoSize: 64 * 1024 * 1024 * 1024,

  upload(auth, options) {
    const emitter = new EventEmitter()

    const service = google.youtube({
      version: 'v3',
      auth
    })

    const {
      videoPath,
      title,
      privacyStatus,
      description='',
      tags=[],

      // Education
      categoryId=27
    } = options

    const fileSize = fs.statSync(videoPath).size
    service.videos.insert(
      {
        part: 'snippet,status',
        notifySubscribers: false,
        requestBody: {
          snippet: { title, description },
          status: { privacyStatus },
        },
        media: {
          body: fs.createReadStream(videoPath)
        }
      },
      {
        // Use the `onUploadProgress` event from Axios to track the
        // number of bytes uploaded to this point.
        onUploadProgress: event => {
          const progress = Math.min(
            parseInt((event.bytesRead / fileSize) * 100),
            100
          )

          emitter.emit('progress', progress)
        },
      }
    )
    .then((response) => {
      logger.info(response.data)
      emitter.emit('end', response)
    })

    emitter.on('abort', () => process.exit(1))

    return emitter
  },

  setThumbnail(auth, options) {
    const service = google.youtube({
      version: 'v3',
      auth
    })

    const { videoId, imagePath } = options
  }
}
