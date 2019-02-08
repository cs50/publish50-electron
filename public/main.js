const electron = require('electron');
const ipc = electron.ipcMain
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');
const isDev = require('electron-is-dev');

const { rasters } = require('./constants')
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
  ipc.send('job stalled', { job: simpleJob(job) })
})

queue.on('progress', (job, progress) => {
  ipc.send('job progress', { job: simpleJob(job), progress })
})

queue.on('completed', (job, result) => {
  sendToMainWindow('job succeeded', { job: simpleJob(job), result })
})

queue.on('failed', (job, err) => {
  sendToMainWindow('job failed', { job: simpleJob(job), err })
})

queue.process('resize still', 32, (job) => {
  return images.resizeStill(job.data)
})

ipc.on('get finished jobs', async (event, data) => {
  let completedJobs = (await queue.getCompleted())
    .sort((a, b) => parseInt(b.id) - parseInt(a.id))

  let failedJobs = (await queue.getFailed())
    .sort((a, b) => parseInt(b.id) - parseInt(a.id))

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

ipc.on('resize stills', (event, data) => {
  new Set(data.files).forEach((imagePath) => {
    Object.keys(rasters).forEach((raster) => {
      queue.add('resize still', { imagePath, raster })
    })
  })
})

queue.process('generate thumbnails', (job) => {
  images.generateThumbnails(job.data)
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
