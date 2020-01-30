const fs = require('fs-extra')
const path = require('path')
const { BrowserWindow, dialog, ipcMain: ipc } = require('electron')
const { distFolder } = require('./util')
const preferences = require('./preferences')
const { queues } = require('./queues')
const s3 = require('./s3')
const { rasters } = require('./constants')
const logger = require('./logger')
const googleOAuth = require('./google-oauth')
const youtube = require('./youtube')
const dialog_ = require('./dialog')

function sendToCurrentWindow(event, data) {
  const currentWindow = BrowserWindow.getFocusedWindow()
  if (!currentWindow)
    return false

  currentWindow.send(event, data)
  return true
}

// TODO move to images?
function resizeStills(data) {
  const jobPromises = []
  new Set(data.files).forEach((imagePath) => {
   // Copy original to destination
   // TODO handle if same folder?
   const outFolder = distFolder(imagePath)
    if (!fs.existsSync(outFolder))
        fs.mkdirpSync(outFolder)

    fs.copyFile(
      imagePath,
      path.join(outFolder, path.basename(imagePath)),
      (err) => {
        if (err)
          logger.error(err.toString())
      }
    )

    Object.keys(rasters).filter((raster) => raster !== '4k').forEach((raster) => {
      jobPromises.push(queues['image processing'].add('resize still', { imagePath, raster, outFolder }))
    })
  })

  return jobPromises
}

ipc.on('resize stills', (event, data) => {
  resizeStills(data)
})

ipc.on('update metadata', (event, data) => {
  const { bucket, prefix, metadata } = data
  queues['metadata'].add('update metadata', {
    ...preferences.get('awsCredentials'),
    bucket,
    prefix,
    metadata,
    ...preferences.get('cloudfront')
  })
})

// TODO move somewhere else?
function transcode(data) {
  const jobPromises = []

  const { files, formats, rasters: rasters_, twoPasses } = data
  new Set(files).forEach((videoPath) => {

    // Generate thumbnails
    if (!formats && !isCameras(videoPath) && !isScreens(videoPath)) {
      jobPromises.push(queues['video transcoding'].add(
        'transcode',
        {
          videoPath,
          thumbnailFrequency: preferences.get('ffmpeg.thumbnailFrequency'),
          thumbnailHeight: preferences.get('ffmpeg.thumbnailHeight'),
          thumbnailStackSize: preferences.get('ffmpeg.thumbnailStackSize'),
          thumbnailStacksOnly: preferences.get('ffmpeg.thumbnailStacksOnly')
        }
      ))

      return
    }

    // Transcode to mp3
    if (formats.mp3 && !/-(a|b).mov$/.test(videoPath)) {
      jobPromises.push(queues['video transcoding'].add('transcode', { videoPath, format: 'mp3' }))
    }

    // Transcode to mp4
    if (formats.mp4) {
      Object.keys(rasters)
      .filter((raster) => rasters_[raster] && (rasters[raster].videoBitrate || {}).mp4)
      .sort((a, b) => parseInt(rasters[b].videoBitrate.mp4) - parseInt(rasters[a].videoBitrate.mp4))
      .forEach((raster) => {
          jobPromises.push(queues['video transcoding'].add(
            'transcode',
            { videoPath, format: 'mp4', raster, passes: twoPasses ? 2 : 1 }
          ))
      })
    }
  })

  return jobPromises
}

ipc.on('transcode', (event, data) => {
  transcode(data)
})

ipc.on('get preferences', (event, data) => {
  if (data) {
    const { preferences: prefs } = data
    if (prefs && Array.isArray(prefs)) {
      const rt = {}
      new Set(prefs).forEach((pref) => {
        const value = preferences.get(pref)
        const prefix = pref.split('.')
        const key = prefix.pop()
        let cur = rt
        prefix.forEach((key_) => {
          cur = cur[key_] || (cur[key_] = {})
        })

        cur[key] = value
      })

      event.sender.send('preferences', rt)
    }
  }
  else {
    event.sender.send('preferences', preferences.load())
  }
})

ipc.on('save preferences', (event, data) => {
  preferences.save(data)
})

ipc.on('reset preferences', (event, data) => {
  event.sender.send('preferences', preferences.reset())
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

ipc.on('abort job', (event, data) => {
  dialog_.showMessageBox(
    {
      type: 'question',
      buttons: ['Cancel', 'Abort'],
      message: `Are you sure you want to abort ${`"${data.jobDescription}"`  || 'this task'}?`
    },
    (selectedIndex) => {
      if (selectedIndex === 1) {
        Object.values(queues[data.job.queue.name].childPool.retained).forEach((child) => {
          child.send({__abortJobId__: data.job.id})
        })
      }
    }
  )
})

ipc.on('abort jobs', (event, data) => {
  Object.values(queues).map((each) => {
    if (Object.values(each.childPool['retained']).length > 0) {
      dialog_.showMessageBox(
        {
          type: 'question',
          buttons: ['Cancel', 'Abort all'],
          message: 'Are you sure you want to abort all running tasks?'
        },
        (selectedIndex) => {
          if (selectedIndex === 1) {
            Object.values(queues).forEach((queue) => {
              Object.values(queue.childPool.retained).forEach((child) => {
                child.send({__abortJobId__: '__self__'})
              })
            })
          }
        }
      )
      return
    }
  })
})

ipc.on('remove job', async(event, data) => {
  try {
    const job = await queues[data.job.queue.name].getJob(data.job.id)
    job.remove()
  }
  catch(err) {
    logger.error(err.toString())
  }
})

ipc.on('remove jobs', async(event, data) => {
  const { type } = data
  let types = []
  if (type === 'finished') {
    types.push('completed', 'failed')
  }
  else if (type === 'pending') {
    types.push('delayed', 'wait')
  }

  Object.values(queues).forEach(async (queue) => {
    try {
      types.forEach(async (type) => await queue.clean(0, type))
    }
    catch (err) {
      logger.error(err.toString())
    }
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
    logger.error(err.toString())
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

ipc.on('open bucket', (event, data) => {
  s3.openBucket()
})

function isCameras(videoPath) {
  return /-a\.(mp4|mov)$/.test(videoPath)
}

function isScreens(videoPath) {
  return /-b\.(mp4|mov)$/.test(videoPath)
}

function youtubeUpload(options) {

  const jobPromises = []
  const { credentials } = options
  const {
    files,
    metadata: { title, description },
    youtube: { privacyStatus }
  } = options.videoData

  new Set(files).forEach((videoPath) => {
    let title_ = title
    if (isCameras(videoPath) && !title.endsWith(', cameras')) {
      title_ += ', cameras'
    }
    else if (isScreens(videoPath) && !title.endsWith(', screens')) {
      title_ += ', screens'
    }

    jobPromises.push(queues['youtube'].add(
      'upload',
      { credentials, videoPath, title: title_, privacyStatus }
    ))
  })

  return jobPromises
}

ipc.on('publish', async (event, data) => {
  const jobPromises = []

  // Transcode
  let videoData = { ...data }

  // Youtube uploads
  const uploads = []
  const transcodeThenUpload = []

  videoData.files = videoData.files.filter((file) => {
    const isVideoFile = file.endsWith('.mp4') || file.endsWith('.mov')
    if (data.youtube.upload && isVideoFile) {
      if (fs.statSync(file).size <= youtube.maxVideoSize)
        uploads.push(file)
      else
        transcodeThenUpload.push(file)
    }

    return isVideoFile
  })

  if (data.youtube.upload) {
    const credentials = await googleOAuth.authenticate(youtube.scopes)
    const youtubeVideoData = { ...videoData }
    youtubeVideoData.files = uploads
    jobPromises.push(...youtubeUpload({ credentials, youtubeVideoData}))
  }

  jobPromises.push(...transcode(videoData))

  // Generate thumbnails
  let { formats, ...videoData_ } = videoData
  jobPromises.push(...transcode(videoData_))


  // Resize stills
  const imageData = { files: data.files.filter((file) => file.endsWith('.png')) }
  jobPromises.push(...resizeStills(imageData))

  const jobsByQueue = {}
  const jobs = (await Promise.all(jobPromises))
  jobs.forEach((job) => {
    (jobsByQueue[job.queue.name] || (jobsByQueue[job.queue.name] = [])).push(job.id)
  })

  // Object.keys(jobsByQueue).forEach((queueName) => {
  //   queues[queueName].on('completed', (job) => {

  //   })

  //   queues[queueName].on('failed', (job) => {

  //   })
  // })
})

module.exports = { sendToCurrentWindow }
