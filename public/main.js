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

const Queue = require('bull')
const queue = new Queue('queue')

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({width: 1024, height: 768});
  mainWindow.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`);
  mainWindow.on('closed', () => mainWindow = null);

  mainWindow.openDevTools()
}

function sendToMainWindow(event, data) {
  if (!mainWindow)
    return

  mainWindow.send(event, data)
}

function simpleJob(job) {
  const { queue, toKey, ...job_ } = job
  return job_
}

queue.on('error', (err) => {
  console.error(err)
})

queue.on('waiting', (jobId) => {
  // ipc.send('job waiting', { jobId })
})

queue.on('active', (job, jobPromise) => {
  // TODO jobPromise.cancel() to abort
  sendToMainWindow('job started', { job: simpleJob(job) })
})

queue.on('stalled', (job) => {
  sendToMainWindow('job stalled', { job: simpleJob(job) })
})

queue.on('progress', (job, progress) => {
  sendToMainWindow('job progress', { job: simpleJob(job), progress })
})

queue.on('completed', (job, result) => {
  sendToMainWindow('job succeeded', { job: simpleJob(job), result })
})

queue.on('failed', (job, err) => {
  sendToMainWindow('job failed', { job: simpleJob(job), err })
})

ipc.on('get job', async (event, data) => {
  event.returnValue = await queue.getJob(data.jobId)
})

ipc.on('get finished jobs', async (event, data) => {
  let completedJobs = (await queue.getCompleted())
    .sort((a, b) => parseInt(b.finishedOn) - parseInt(a.finishedOn))

  let failedJobs = (await queue.getFailed())
    .sort((a, b) => parseInt(b.finishedOn) - parseInt(a.finishedOn))

  let jobs = []

  const limit = data.limit || (completedJobs.length + failedJobs.length)
  for (let i = 0, j = 0, k = 0; i < limit; i++) {

    // No more jobs or limit reached
    if ((j >= completedJobs.length && k >= failedJobs.length) || jobs.length >= limit)
      break

    // No more completed jobs
    else if (j >= completedJobs.length)
      jobs.push(simpleJob(failedJobs[k++]))

    // No more failed jobs
    else if (k >= failedJobs.length)
      jobs.push(simpleJob(completedJobs[j++]))

    // Completed job came later
    else if (parseInt(completedJobs[j].id) > parseInt(failedJobs[k].id))
      jobs.push(simpleJob(completedJobs[j++]))

    // Failed job came later (prioirty to failed jobs)
    else if (parseInt(failedJobs[k].id) >= parseInt(completedJobs[j].id))
      jobs.push(simpleJob(failedJobs[k++]))
  }

  event.sender.send('finished jobs', { jobs })
})

ipc.on('get pending jobs', async (event, data) => {
  let waitingJobs = (await queue.getWaiting())
    .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))

  const limit = data.limit || waitingJobs.length
  event.sender.send('pending jobs', { jobs: waitingJobs.slice(0, limit).map(simpleJob) })
})

ipc.on('get active jobs', async (event, data) => {
  event.sender.send(
    'active jobs',
    { jobs: (await queue.getActive()).sort((a, b) => a.timestamp - b.timestamp) }
  )
})

queue.process('resize still', 32, (job) => {
  return images.resizeStill(job.data)
})

ipc.on('resize stills', (event, data) => {
  new Set(data.files).forEach((imagePath) => {
    Object.keys(rasters).forEach((raster) => {
      queue.add('resize still', { imagePath, raster })
    })
  })
})

function distFolder(videoPath) {
  return path.join(path.dirname(videoPath), '../dist')
}

queue.process('generate thumbnails', 4, async (job) => {
  const { videoPath } = job.data
  const basename = path.basename(videoPath, path.extname(videoPath))
  const outFolder = path.join(distFolder(videoPath), 'thumbnails')
  const stackSize = 12
  const thumbnailHeight = 90
  const frequency = 5

  // Calculate thumbnail width in terms of height
  const { aspectRatio } = await ffprobe(videoPath)
  const thumbnailWidth = Math.round(thumbnailHeight * aspectRatio)
  const size = `${thumbnailWidth}x${thumbnailHeight}`

  return new Promise(async (resolve, reject) => {
    const job_ = await ffmpeg(videoPath).thumbnails({
      videoPath,
      outFolder,
      frequency,
      size
    })


    job_.on('progress', (progress) => {
      job.progress(progress.percent)
      sendToMainWindow('job progress', { job: simpleJob(job), progress })
    })
    .on('end', async () => {
      const stacks = await images.stackThumbnails({
        thumbnailsFolder: outFolder,
        stackSize,
        basename
      })

      await images.generateVTT({
        outFile: path.join(path.dirname(outFolder), `${basename}.vtt`),
        stacks,
        stackSize,
        frequency,
        thumbnailWidth,
        thumbnailHeight
      })

      resolve()
    })
  })
})

ipc.on('generate thumbnails', (event, data) => {
  new Set(data.files).forEach((videoPath) => {
    queue.add('generate thumbnails', { videoPath })
  })
})

queue.process('transcode to mp3', 4, async (job) => {
  const { videoPath } = job.data
  const basename = path.basename(videoPath, path.extname(videoPath))
  const outFolder = path.join(distFolder(videoPath))
  const outFile = path.join(outFolder, `${basename}.mp3`)

  const job_ = await ffmpeg(videoPath).transcode({
    format: 'mp3',
    outFile
  })

  job_.on('progress', (progress) => {
    job.progress(progress.percent)
    sendToMainWindow('job progress', { job: simpleJob(job), progress })
  })
})

ipc.on('transcode to mp3', (event, data) => {
  new Set(data.files).forEach((videoPath) => {
    queue.add('transcode to mp3', { videoPath })
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
