const { exec, spawn } = require('child_process')
const fs = require('fs-extra')
const path = require('path')
const EventEmitter = require('events')

const { rasters, codecs } = require('./constants')

class FfmpegEmitter extends EventEmitter {}

function ffprobe(videoPath) {
  return new Promise((resolve, reject) => {
    exec(
      `ffprobe \
      -loglevel quiet \
      -print_format json \
      -select_streams v:0 \
      -show_entries \
      'stream=duration,height,width' \
      ${videoPath}`,
      (err, stdout, stderr) => {
        if (err)
          return reject(err)

        const metadata = JSON.parse(stdout).streams[0]
        metadata.duration = Math.round(metadata.duration * 100) / 100
        metadata.aspectRatio = Math.round(metadata.width * 1000 / metadata.height) / 1000
        metadata.widescreen = [2.398, 2.370].indexOf(metadata.aspectRatio) > -1
        resolve(metadata)
      }
    )
  })
}

async function ffmpegProgress(videoPath, process, callback) {
  const metadata = await ffprobe(videoPath)
  const msDuration = metadata.duration * 1000000
  let progress = {}
  let lines = ''
  process.stdout.on('data', (chunk) => {
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

      const emitter = new FfmpegEmitter()
      const { frequency, size, outFolder } = options

      let filters = `fps=(1/${frequency})`
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

      const process = spawn('ffmpeg', args)
      // process.stderr.on('data', (err) => {
        // emitter.emit('error', new Error(err))
      // })

      ffmpegProgress(videoPath, process, (progress) => emitter.emit('progress', progress))

      process.on('exit', (code, signal) => {
        emitter.emit('end', { code, signal })
      })

      return emitter
    },
    async transcode(options) {
      const emitter = new FfmpegEmitter()
      const { outFile, format } = options
      let args = [
        '-nostdin',
        '-i', videoPath,
        '-y',
        '-progress', '-'
      ]

      let process
      switch (format) {
        case 'mp3':
          args.push(
            '-vn',
            '-b:a', '128k',
            '-ac', '1',
            outFile
          )

          process = spawn('ffmpeg', args)
          // process.stderr.on('data', (err) => {
            // emitter.emit('error', new Error(err))
          // })

          ffmpegProgress(videoPath, process, (progress) => emitter.emit('progress', progress))

          process.on('exit', (code, signal) => {
            emitter.emit('end', { code, signal })
          })

          return emitter

        case 'mp4':
          const { widescreen } = await ffprobe(videoPath)
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

            process = spawn('ffmpeg', [ ...args, '-pass', '1', '-an', '/dev/null' ])
            process.stderr.on('data', (chunk) => console.log(chunk.toString()))
            ffmpegProgress(videoPath, process, progressHandler.bind(null, 1))
            process.on('exit', (code) => {
              if (code !== 0)
                return reject(`ffmpeg exited with exit code ${code}`)

              resolve(true)
            })
          })
          .then((previousPass) => {
            process = spawn('ffmpeg', [
              ...args,
              '-pass', previousPass ? '2' : '1',
              '-ac', '2',
              '-b:a', rasters[raster].audioRate,
              outFile
            ])

            process.stderr.on('data', (chunk) => console.log(chunk.toString()))
            ffmpegProgress(videoPath, process, progressHandler.bind(null, passes))
            process.on('exit', (code) => {
              if (code !== 0)
                return Promise.reject(`ffmpeg exited with exit code ${code}`)

              emitter.emit('end', { code })
              return Promise.resolve()
            })
          })

          return emitter

        default:
          return new Error(`unsupported format ${format}`)
      }
    }
  }
}

module.exports = { ffprobe, ffmpeg }
