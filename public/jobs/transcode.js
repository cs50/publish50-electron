const path = require('path')
const { ffmpeg, ffprobe } = require('../ffmpeg')
const images = require('../images')

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
  let aspectRatio
  try {
    aspectRatio = (await ffprobe(videoPath)).aspectRatio
  }
  catch (err) {
    return Promise.reject(new Error(err))
  }

  const thumbnailWidth = Math.round(thumbnailHeight * aspectRatio)
  const size = `${thumbnailWidth}x${thumbnailHeight}`

  let job_

  try {
    job_ = await ffmpeg(videoPath).thumbnails({
      videoPath,
      outFolder,
      frequency,
      size
    })
  }
  catch (err) {
    return Promise.reject(new Error(err))
  }

  job_.on('progress', (progress) => {
    job.progress(progress.percent)
  })

  return new Promise((resolve, reject) => {
    process.on('message', (message) => {
      if (message.__abortJobId__ === job.id || message.__abortJobId__ === '__self__') {
        job_.emit('abort')
        return reject(new Error("ABORTED"))
      }
    })

    job_.on('end', async ({ code, signal }) => {
      if (signal)
        return reject(new Error(`ffmpeg received ${signal} (exited)`))
      else if (code !== 0)
        return reject(new Error(`ffmpeg exited with error code ${code}`))

      try {
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
      }
      catch (err) {
        return reject(new Error(err))
      }

      resolve()
    })
  })
}

async function transcode(job) {
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

  let job_
  try {
    job_ = await ffmpeg(videoPath).transcode({
      ...job.data,
      outFile
    })
  }
  catch (err) {
    return Promise.reject(new Error(err))
  }

  job_.on('progress', (progress) => {
    job.progress(progress.percent)
  })

  return new Promise((resolve, reject) => {
    process.on('message', (message) => {
      if (message.__abortJobId__ === job.id || message.__abortJobId__ === '__self__') {
        job_.emit('abort')
        return reject(new Error("ABORTED"))
      }
    })

    job_.on('end', (e) => {
      if (e.code !== 0)
        return reject(`ffmpeg exited with error code ${e.code}`)

      resolve()
    })
  })
}

module.exports = function(job) {
  if (job.data.format) {
    return transcode(job)
  }

  return generateThumbnails(job)
}
