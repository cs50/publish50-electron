const electron = require('electron')
const ipc = electron.ipcMain
const { app, BrowserWindow, dialog } = electron
const { rasters } = require('./constants')
const settings = require('electron-settings')

const path = require('path')
const url = require('url')
const isDev = require('electron-is-dev')

const jobsPath = path.join(__dirname, 'jobs')

const Queue = require('bull')
const queueNames = [ 'image processing', 'video transcoding', 'metadata' ]
const queues = {}
queueNames.forEach((queueName) => queues[queueName] = new Queue(queueName))

let mainWindow
const defaults = {
  general: {
    redisPort: 6379,
    imageProcessingWorkers: 64,
    videoTranscodingWorkers: 8
  },
  awsCredentials: {
    accessKeyId:'',
    secretAccessKey:''
  },
  ffmpeg: {
    thumbnailFrequency: 5,
    thumbnailHeight: 90,
    thumbnailStackSize: 12,
    thumbnailStacksOnly: true
  },
  s3: {
    bucket: 'cdn.cs50.net',
    prefix: ''
  },
  about: {
    version: app.getVersion()
  }
}

let prefs = loadSettings()

function initialize() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    icon: path.join(__dirname, '../src/assets/logos/128x128.png'),
    show: false
  })

  mainWindow.loadURL(isDev ?
    'http://localhost:3000' :
    `file://${path.join(__dirname, '../build/index.html')}`
  )

  mainWindow.webContents.on('did-finish-load', () => mainWindow.show())
  mainWindow.on('closed', () => {
    Object.values(queues).forEach((queue) => {

      // Abort running jobs
      Object.values(queue.childPool.retained).forEach((child) => {
        child.send({__abortJobId__: '__self__'})
      })

      // Close queues
      queue.close().catch((err) => {
        dialog.showErrorBox(`Failed to close queue ${queue.name}`, err)
      })
    })

    mainWindow = null
  })
}

function loadSettings(reset=false) {
  if (reset || Object.keys(settings.getAll()).length < 1) {
    settings.setAll(defaults)
    return defaults
  }

  const prefs_ = {}
  Object.keys(defaults).forEach((key) => {
    prefs_[key] = settings.get(key, defaults[key])
  })

  return prefs_
}

function validateSettings(s) {
  s.general.redisPort = parseInt(s.general.redisPort) ||
    defaults.general.redisPort

  s.general.imageProcessingWorkers = parseInt(s.general.imageProcessingWrokers) ||
    defaults.general.imageProcessingWorkers

  s.general.videoTranscodingWorkers = parseInt(s.general.videoTranscodingWorkers) ||
    defaults.general.videoTranscoldingWorkers

  s.ffmpeg.thumbnailFrequency = parseInt(s.ffmpeg.thumbnailFrequency) ||
    defaults.ffmpeg.thumbnailFrequency

  s.ffmpeg.thumbnailStackSize = parseInt(s.ffmpeg.thumbnailStackSize) ||
    defaults.ffmpeg.thumbnailStackSize

  s.ffmpeg.thumbnailStacksOnly = s.ffmpeg.thumbnailStacksOnly && true

  return s
}

function sendToMainWindow(event, data) {
  if (!mainWindow)
    return

  mainWindow.send(event, data)
}

Object.values(queues).forEach((queue) => {
  queue.on('error', (err) => {
    console.error(err)
  })

  queue.on('waiting', async (jobId) => {
    try {
      const job = await queue.getJob(jobId)
      sendToMainWindow('job pending', { job })
    }
    catch (err) {
      dialog.showErrorBox('Failed to get job', err.toString())
    }
  })

  queue.on('active', (job, jobPromise) => {
    sendToMainWindow('job started', { job })
  })

  queue.on('stalled', (job) => {
    sendToMainWindow('job stalled', { job })
  })

  queue.on('progress', (job, progress) => {
    sendToMainWindow('job progress', { job, progress })
  })

  queue.on('completed', (job, result) => {
    sendToMainWindow('job succeeded', { job, result })
  })

  queue.on('failed', (job, err) => {
    sendToMainWindow('job failed', { job, err })
  })
})

ipc.on('get preferences', (event, data) => {
  event.returnValue = loadSettings()
})

ipc.on('save preferences', (event, data) => {
  prefs = validateSettings(data)
  settings.setAll(prefs)
})

ipc.on('reset preferences', (event, data) => {
  settings.setAll(defaults)
  event.returnValue = defaults
})

ipc.on('get job', async (event, data) => {
  const queueName = data.job.queue.name
  try {
    event.returnValue = await queues[queueName].getJob(data.job.id)
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

queues['metadata'].process('update metadata', 1, path.join(jobsPath, 'metadata.js'))
ipc.on('update metadata', (event, data) => {
  const { bucket, prefix, metadata } = data
  queues['metadata'].add('update metadata', {
    ...prefs.awsCredentials,
    bucket,
    prefix,
    metadata
  })
})

queues['image processing'].process(
  'resize still',
  prefs.general.imageProcessingWorkers,
  path.join(jobsPath, 'resize-still.js')
)

ipc.on('resize stills', (event, data) => {
  new Set(data.files).forEach((imagePath) => {
    Object.keys(rasters).forEach((raster) => {
      queues['image processing'].add('resize still', { imagePath, raster })
    })
  })
})

queues['video transcoding'].process(
  'transcode',
  prefs.general.videoTranscodingWorkers,
  path.join(jobsPath, '/transcode.js')
)

ipc.on('transcode', (event, data) => {
  const { files, formats, rasters, passes } = data
  new Set(files).forEach((videoPath) => {
    // Generate thumbnails
    if (!formats) {
      return queues['video transcoding'].add(
        'transcode',
        {
          videoPath,
          thumbnailFrequency: prefs.ffmpeg.thumbnailFrequency,
          thumbnailHeight: prefs.ffmpeg.thumbnailHeight,
          thumbnailStackSize: prefs.ffmpeg.thumbnailStackSize,
          thumbnailStacksOnly: prefs.ffmpeg.thumbnailStacksOnly
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

app.on('ready', initialize)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    initialize()
  }
})
