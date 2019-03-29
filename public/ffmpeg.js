const fs = require('fs-extra')
const path = require('path')
const util = require('util')
const childProcess = require('child_process')
const execFile = util.promisify(childProcess.execFile)
const spawn = childProcess.spawn

const EventEmitter = require('events')

const logger = require('./logger')
const { rasters, codecs } = require('./constants')
const { getBin } = require('./util')

async function ffprobe(videoPath) {
  let metadata

  try {
    const { stdout, stderr } = await execFile(
      getBin('ffprobe'),
      [
        '-loglevel', 'quiet',
        '-print_format', 'json',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=duration,height,width',
        videoPath
      ]
    )

    metadata = JSON.parse(stdout).streams[0]
  }
  catch (err) {
    return Promise.reject(new Error(err))
  }

  // const metadata = JSON.parse(stdout).streams[0]
  metadata.duration = Math.round(metadata.duration * 100) / 100
  metadata.aspectRatio = Math.round(metadata.width * 1000 / metadata.height) / 1000
  metadata.widescreen = [2.398, 2.370].indexOf(metadata.aspectRatio) > -1
  return Promise.resolve(metadata)
}

async function ffmpegProgress(videoPath, child, callback) {
  let metadata
  try {
    metadata = await ffprobe(videoPath)
  }
  catch (err) {
    return Promise.reject(new Error(err))
  }

  const msDuration = metadata.duration * 1000000
  let progress = {}
  let lines = ''
  child.stdout.on('data', (chunk) => {
    lines += chunk.toString()
    if (!lines.endsWith('\n'))
      return

    lines.split('\n').filter(line => line).forEach(line => {
      const [ key, val ] = line.split('=')
      if (key === 'progress') {
        progress.percent = Math.min(Math.round((progress.out_time_ms * 100 / msDuration)), 100)
        // emitter.emit('progress', progress)
        callback(progress)
        progress = {}
        return
      }

      progress[key] = val
    })

    lines = ''
  })
}

function ffmpeg(videoPath) {
  return {
    async thumbnails(options) {
      const emitter = new EventEmitter()
      const { thumbnailFrequency, size, outFolder } = options

      let filters = `fps=(1/${thumbnailFrequency})`
      if (size)
        filters += `,scale=${size}`

      if (fs.existsSync(outFolder))
        fs.removeSync(outFolder)

      // TODO use when electron use node 11
      // fs.mkdirSync(outFolder, { recursive: true })
      fs.mkdirpSync(outFolder)

      const outFile = options.outFile || `%d-${path.basename(videoPath, path.extname(videoPath))}.jpg`
      const destination = path.join(outFolder, outFile)

      const args = [
        '-i', videoPath,
        '-loglevel', 'quiet',
        '-nostdin',
        '-progress', '-',
        '-filter:v', `${filters}`,
        destination
      ]

      const child = spawn(getBin('ffmpeg'), args)
      const kill = () => child.kill
      emitter.once('abort', kill)
      child.stderr.on('data', (err) => logger.info(err.toString()))
      ffmpegProgress(videoPath, child, (progress) => emitter.emit('progress', progress))
      child.on('exit', (code, signal) => {
        emitter.off('abort', kill)
        emitter.emit('end', { code, signal })
      })

      return emitter
    },

    async transcode(options) {
      const emitter = new EventEmitter()
      const { outFile, format } = options

      const outFolder = path.dirname(outFile)
      if (!fs.existsSync(outFolder))
        fs.mkdirpSync(outFolder)

      let args = [
        '-nostdin',
        '-i', videoPath,
        '-y',
        '-progress', '-'
      ]

      let child
      switch (format) {
        case 'mp3':
          args.push(
            '-vn',
            '-b:a', '128k',
            '-ac', '1',
            outFile
          )

          child = spawn(getBin('ffmpeg'), args)
          const kill = () => child.kill()
          emitter.once("abort", kill)
          child.stderr.on('data', (err) => logger.info(err.toString()))
          ffmpegProgress(videoPath, child, (progress) => emitter.emit('progress', progress))
          child.on('exit', (code, signal) => {
            emitter.off("abort", kill)
            emitter.emit('end', { code, signal })
          })

          return emitter

        case 'mp4':
          let widescreen
          try {
            widescreen = (await ffprobe(videoPath)).widescreen
          }
          catch(err) {
            return Promise.reject(new Error(err))
          }

          const { raster, passes } = options
          const progressHandler = ((pass, progress) => {
              // Emit actual progress if doing 1 pass
              // Emit 50 + (progress / 2) if doing 2 passes
              progress.percent = 50 * (pass - 1) + Math.round(progress.percent / passes)
              emitter.emit('progress', progress)
          })

          args.push(
            '-c:v', codecs.video[format],
            '-c:a', codecs.audio[format],
            '-f', format,
            '-b:v', rasters[raster].videoBitrate[format],
            '-pix_fmt', 'yuv420p',
            '-threads', '0',
            '-passlogfile', path.join('/tmp', `${path.basename(videoPath, path.extname(videoPath))}-${raster}`),
            '-movflags', 'faststart',
            '-strict', 'experimental',
            '-profile:v', rasters[raster].profile,
            '-vf', `scale=${rasters[raster].scale[widescreen ? 'widescreen' : 'standard']}`,
            '-x264opts', 'keyint=24:min-keyint=24:no-scenecut'
          )

          new Promise((resolve, reject) => {
            if (passes < 2) {
              return resolve(false)
            }

            child = spawn(getBin('ffmpeg'), [ ...args, '-pass', '1', '-an', '/dev/null' ])
            const kill = () => child.kill()
            emitter.once("abort", kill)
            child.stderr.on('data', (err) => logger.info(err.toString()))
            ffmpegProgress(videoPath, child, progressHandler.bind(null, 1))
            child.on('exit', (code) => {
              if (code !== 0) {
                emitter.off("abort", kill)
                emitter.emit('end', { code })
                return reject(new Error(`ffmpeg exited with exit code ${code}`))
              }

              resolve(true)
            })
          })
          .then((previousPass) => {
            child = spawn(getBin('ffmpeg'), [
              ...args,
              '-pass', previousPass ? '2' : '1',
              '-ac', '2',
              '-b:a', rasters[raster].audioRate,
              outFile
            ])

            const kill = () => child.kill()
            emitter.once("abort", kill)
            child.stderr.on('data', (err) => logger.info(err.toString()))
            ffmpegProgress(videoPath, child, progressHandler.bind(null, passes))
            child.on('exit', (code) => {
              emitter.off("kill", kill)
              emitter.emit('end', { code })
            })
          })
          .catch((err) => logger.error(err))

          return emitter

        default:
          return new Error(`unsupported format ${format}`)
      }
    }
  }
}

module.exports = { ffprobe, ffmpeg }
