const electron = require('electron');
const ipc = electron.ipcMain
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');
const isDev = require('electron-is-dev');

const { rasters } = require('./constants')
const { ffprobe, ffmpeg } = require('./ffmpeg')
const images = require('./images')

const jobsPath = path.join(__dirname, 'jobs')

const Queue = require('bull')
const queueNames = [ 'image processing', 'video transcoding' ]
const queues = {}
queueNames.forEach((queueName) => queues[queueName] = new Queue(queueName))


let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    icon: path.join(__dirname, '../src/assets/logos/128x128.png'),
    show: false
  });

  mainWindow.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`);
  mainWindow.webContents.on('did-finish-load', () => mainWindow.show())
  mainWindow.on('closed', () => mainWindow = null);

  mainWindow.openDevTools()
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
    const job = await queue.getJob(jobId)
    sendToMainWindow('job pending', { job })
  })

  queue.on('active', (job, jobPromise) => {
    // TODO jobPromise.cancel() to abort
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

ipc.on('get job', async (event, data) => {
  const queueName = data.job.queue.name
  event.returnValue = await queues[queueName].getJob(data.job.id)
})

ipc.on('get finished jobs', async (event, data) => {
  // Get completed jobs from all queues
  const completedJobs = (
    await Object.values(queues).reduce(async (acc, queue) => {
      return Promise.resolve([ ...(await acc), ...(await queue.getCompleted()) ])
    }, Promise.resolve([]))
  )

    // Sort completed jobs from all queues by finished time (desc)
    .sort((a, b) => parseInt(b.finishedOn) - parseInt(a.finishedOn))

  // Get failed jobs from all queues
  const failedJobs = (
    await Object.values(queues).reduce(async (acc, queue) => {
      return [ ...(await acc), ...(await queue.getFailed()) ]
    }, Promise.resolve([]))
  )

    // Sort failed jobs from all queues by finished time (desc)
    .sort((a, b) => parseInt(b.finishedOn) - parseInt(a.finishedOn))

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
  const waitingJobs = (
    await Object.values(queues).reduce(async (acc, queue) => {
      return Promise.resolve([ ...(await acc), ...(await queue.getWaiting()) ])
    }, Promise.resolve([]))
  )
    .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))

  const delayedJobs = (
    await Object.values(queues).reduce(async (acc, queue) => {
      return Promise.resolve([ ...(await acc), ...(await queue.getDelayed()) ])
    }, Promise.resolve([]))
  )
    .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))

  const jobs = [ ...waitingJobs, ...delayedJobs]
    .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))

  event.sender.send('pending jobs', { jobs: jobs.slice(0, data.limit || waitingJobs.length) })
})

ipc.on('get active jobs', async (event, data) => {
  const jobs = (
    await Object.values(queues).reduce(async (acc, queue) => {
      return Promise.resolve([ ...(await acc), ...(await queue.getActive()) ])
    }, Promise.resolve([]))
  )
    .sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp))

  event.sender.send( 'active jobs', { jobs })
})

queues['image processing'].process('resize still', 64, path.join(jobsPath, 'resize-still.js'))
ipc.on('resize stills', (event, data) => {
  new Set(data.files).forEach((imagePath) => {
    Object.keys(rasters).forEach((raster) => {
      queues['image processing'].add('resize still', { imagePath, raster })
    })
  })
})

queues['video transcoding'].process('transcode', 8, path.join(jobsPath, '/transcode.js'))
ipc.on('transcode', (event, data) => {
  const { files, formats, rasters, passes } = data
  new Set(files).forEach((videoPath) => {
    if (!formats) {
      return queues['video transcoding'].add('transcode', { videoPath })
    }

    if (formats.mp3 && !/-(a|b).mov$/.test(videoPath)) {
      queues['video transcoding'].add('transcode', { videoPath, format: 'mp3' })
    }

    if (formats.mp4) {
      Object.keys(rasters).forEach((raster) => {
        if (rasters[raster])
          queues['video transcoding'].add('transcode', { videoPath, format: 'mp4', raster, passes })
      })
    }
  })
})

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
