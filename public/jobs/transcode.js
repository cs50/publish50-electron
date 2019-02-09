const path = require('path')
const { ffmpeg, ffprobe } = require('../ffmpeg')
const images = require('../images')
// const utils = require('../utils')

function distFolder(videoPath) {
  return path.join(path.dirname(videoPath), '../dist')
}

async function generateThumbnails(job) {
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
      // sendToMainWindow('job progress', { job: simpleJob(job), progress })
    })
    .on('end', async (e) => {
      if (e.code !== 0)
        return reject(new Error(`ffmpeg exited with error code ${e.code}`))

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
}

function transcode(job) {
  const { videoPath, format, raster } = job.data
  const basename = path.basename(videoPath, path.extname(videoPath))
  const outFolder = path.join(distFolder(videoPath))
  let outFile
  if (format === 'mp3')
    outFile = path.join(outFolder, `${basename}.mp3`)
  else if (format === 'mp4')
    outFile = path.join(outFolder, `${basename}-${raster}.mp4`)
  else
    return Promise.reject(new Error(`unsupported format ${format}`))

  return new Promise(async (resolve, reject) => {
    const job_ = await ffmpeg(videoPath).transcode({
      ...job.data,
      outFile
    })

    job_.on('progress', (progress) => {
      job.progress(progress.percent)
      // sendToMainWindow('job progress', { job: simpleJob(job), progress })
    })
    .on('end', (e) => {
      console.log(e)
      if (e.code !== 0)
        return reject(`ffmpeg exited with error code ${e.code}`)

      return resolve()
    })
  })
}

module.exports = function(job) {
  if (job.data.format) {
    return transcode(job)
  }

  return generateThumbnails(job)
}
