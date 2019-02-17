module.exports = function (ipc, getCurrentWindow, dialog, preferences, queues) {

  const { rasters } = require('./constants')

  function sendToCurrentWindow(event, data) {
    if (!getCurrentWindow())
      return false

    getCurrentWindow().send(event, data)
    return true
  }

  ipc.on('resize stills', (event, data) => {
    new Set(data.files).forEach((imagePath) => {
      Object.keys(rasters).forEach((raster) => {
        queues['image processing'].add('resize still', { imagePath, raster })
      })
    })
  })

  ipc.on('update metadata', (event, data) => {
    const { bucket, prefix, metadata } = data
    queues['metadata'].add('update metadata', {
      ...preferences.get('awsCredentials'),
      bucket,
      prefix,
      metadata
    })
  })

  ipc.on('transcode', (event, data) => {
    const { files, formats, rasters, passes } = data
    new Set(files).forEach((videoPath) => {

      // Generate thumbnails
      if (!formats) {
        return queues['video transcoding'].add(
          'transcode',
          {
            videoPath,
            thumbnailFrequency: preferences.get('ffmpeg.thumbnailFrequency'),
            thumbnailHeight: preferences.get('ffmpeg.thumbnailHeight'),
            thumbnailStackSize: preferences.get('ffmpeg.thumbnailStackSize'),
            thumbnailStacksOnly: preferences.get('ffmpeg.thumbnailStacksOnly')
          }
        )
      }

      // Transcode to mp3
      if (formats.mp3 && !/-(a|b).mov$/.test(videoPath)) {
        queues['video transcoding'].add('transcode', { videoPath, format: 'mp3' })
      }

      // Transcode to mp4
      if (formats.mp4) {
        Object.keys(rasters).forEach((raster) => {
          if (rasters[raster])
            queues['video transcoding'].add('transcode', { videoPath, format: 'mp4', raster, passes })
        })
      }
    })
  })

  ipc.on('get preferences', (event, data) => {
    sendToCurrentWindow('preferences', preferences.load())
  })

  ipc.on('save preferences', (event, data) => {
    preferences.save(data)
  })

  ipc.on('reset preferences', (event, data) => {
    sendToCurrentWindow('preferences', preferences.reset())
  })

  ipc.on('get job', async (event, data) => {
    const queueName = data.job.queue.name
    try {
      event.sender.send('job', (await queues[queueName].getJob(data.job.id)))
    }
    catch (err) {
      dialog.showErrorBox('Failed to get job', err.toString())
    }
  })

  ipc.on('abort job', async (event, data) => {
    Object.values(queues[data.job.queue.name].childPool.retained).forEach((child) => {
      child.send({__abortJobId__: data.job.id})
    })
  })

  ipc.on('get finished jobs', async (event, data) => {
    let completedJobs, failedJobs

    try {
      // Get completed jobs from all queues
      completedJobs = (
        await Object.values(queues).reduce(async (acc, queue) => {
          return Promise.resolve([ ...(await acc), ...(await queue.getCompleted()) ])
        }, Promise.resolve([]))
      )

        // Sort completed jobs from all queues by finished time (desc)
        .sort((a, b) => parseInt(b.finishedOn) - parseInt(a.finishedOn))
    }
    catch (err) {
      dialog.showErrorBox('Failed to get completed jobs', err.toString())
    }

    try {
      // Get failed jobs from all queues
      failedJobs = (
        await Object.values(queues).reduce(async (acc, queue) => {
          return [ ...(await acc), ...(await queue.getFailed()) ]
        }, Promise.resolve([]))
      )

        // Sort failed jobs from all queues by finished time (desc)
        .sort((a, b) => parseInt(b.finishedOn) - parseInt(a.finishedOn))
    }
    catch (err) {
      dialog.showErrorBox('Failed to get failed jobs', err.toString())
    }

    const jobs = [ ... completedJobs, ...failedJobs ]
      .sort((a, b) => parseInt(b.finishedOn) - parseInt(a.finishedOn))

    event.sender.send(
      'finished jobs',
      {
        jobs: jobs.slice(0, data.limit || (completedJobs.length + failedJobs.length))
      }
    )
  })

  ipc.on('get pending jobs', async (event, data) => {
    let waitingJobs, delayedJobs
    try {
      waitingJobs = (
        await Object.values(queues).reduce(async (acc, queue) => {
          return Promise.resolve([ ...(await acc), ...(await queue.getWaiting()) ])
        }, Promise.resolve([]))
      )
        .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))
    }
    catch (err) {
      dialog.showErrorBox('Failed to get waiting jobs', err.toString())
    }

    try {
      delayedJobs = (
        await Object.values(queues).reduce(async (acc, queue) => {
          return Promise.resolve([ ...(await acc), ...(await queue.getDelayed()) ])
        }, Promise.resolve([]))
      )
        .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))
    }
    catch (err) {
      dialog.showErrorBox('Failed to get delayed jobs', err.toString())
    }

    const jobs = [ ...waitingJobs, ...delayedJobs]
      .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))

    event.sender.send('pending jobs', { jobs: jobs.slice(0, data.limit || waitingJobs.length) })
  })

  ipc.on('get active jobs', async (event, data) => {
    try {
      const jobs = (
        await Object.values(queues).reduce(async (acc, queue) => {
          return Promise.resolve([ ...(await acc), ...(await queue.getActive()) ])
        }, Promise.resolve([]))
      )
        .sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp))

      event.sender.send( 'active jobs', { jobs })
    }
    catch (err) {
      dialog.showErrorBox('Failed to get active jobs', err.toString())
    }
  })

  Object.values(queues).forEach((queue) => {
    queue.on('error', (err) => {
      console.error(err.toString())
    })

    queue.on('waiting', async (jobId) => {
      try {
        const job = await queue.getJob(jobId)
        sendToCurrentWindow('job pending', { job })
      }
      catch (err) {
        dialog.showErrorBox('Failed to get job', err.toString())
      }
    })

    queue.on('active', (job, jobPromise) => {
      sendToCurrentWindow('job started', { job })
    })

    queue.on('stalled', (job) => {
      sendToCurrentWindow('job stalled', { job })
    })

    queue.on('progress', (job, progress) => {
      sendToCurrentWindow('job progress', { job, progress })
    })

    queue.on('completed', (job, result) => {
      sendToCurrentWindow('job succeeded', { job, result })
    })

    queue.on('failed', (job, err) => {
      sendToCurrentWindow('job failed', { job, err })
    })
  })

  return { sendToCurrentWindow }
}
