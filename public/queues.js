module.exports = function (preferences) {
  const path = require('path')
  const Queue = require('bull')
  const queueNames = [ 'image processing', 'video transcoding', 'metadata', 'audio waveform' ]
  const queues = {}

  const jobsPath = path.join(__dirname, 'jobs')

  queueNames.forEach((queueName) => {
    try {
      queues[queueName] = new Queue(queueName, {
        redis: {
          port: preferences.get('general.redisPort')
        }
      })
    }
    catch (err) {
      console.error(err.toString())
    }
  })

  queues['metadata'].process('update metadata', 1, path.join(jobsPath, 'metadata.js'))

  queues['image processing'].process(
    'resize still',
    preferences.get('general.imageProcessingWorkers'),
    path.join(jobsPath, 'resize-still.js')
  )

  queues['video transcoding'].process(
    'transcode',
    preferences.get('general.videoTranscodingWorkers'),
    path.join(jobsPath, '/transcode.js')
  )

  queues['audio waveform'].process(
    'audio waveform',
    4,
     path.join(jobsPath, 'audioWaveform.js')
  )

  return {
    queues,
    close() {
      Object.values(queues).forEach((queue) => {

        // Abort running jobs
        Object.values(queue.childPool.retained).forEach((child) => {
          child.send({__abortJobId__: '__self__'})
        })

        // Close queues
        queue.close().catch((err) => {
          console.error(err.toString())
        })
      })
    }
  }
}
