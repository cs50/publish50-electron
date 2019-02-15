const fs = require('fs-extra')
const path = require('path')
const util = require('util')
const childProcess = require('child_process')
const execFile = util.promisify(childProcess.execFile)
const spawn = childProcess.spawn

const EventEmitter = require('events')

const { rasters, codecs } = require('./constants')

class FFMPEGEmitter extends EventEmitter {}

async function ffprobe(videoPath) {
    let metadata

    try {
        const { stdout, stderr } = await execFile(
            '/usr/local/bin/ffprobe',
            ['-loglevel', 'quiet',
                '-print_format', 'json',
                '-select_streams', 'v:0',
                '-show_entries',
                'stream=duration,height,width',
                videoPath
            ]
        )

        metadata = JSON.parse(stdout).streams[0]
    } catch (err) {
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
    let progress = {}
    let blackDetected = {}

    try {
        metadata = await ffprobe(videoPath)
    } catch (err) {
        return Promise.reject(new Error(err))
    }

    const msDuration = metadata.duration * 1000000


    let lines = ''
    // handle blackscene detect from stderr (couldn't find a way around this)
    child.stderr.on('data', (chunk) => {
        lines += chunk.toString()
        lines.split('\n').filter(line => line).forEach(line => {
            // handle black scene detection

            if (line.startsWith('[blackdetect @')) {
                // [blackdetect @ 0x7ff011b01580] black_start:68.8605 black_end:129.129 black_duration:60.2685
                
                // parse the line for start, end, and duration
                line.split(' ').filter(blackSceneInfo => blackSceneInfo).forEach(blackSceneInfo => {
                    if (blackSceneInfo.startsWith('black_start')){
                        blackDetected.start = blackSceneInfo.split(':')[1]
                    } else if (blackSceneInfo.startsWith('black_end')){
                        blackDetected.end = blackSceneInfo.split(':')[1]
                    } else if (blackSceneInfo.startsWith('black_duration')){
                        blackDetected.duration = blackSceneInfo.split(':')[1]
                    } else {
                        return
                    }
                })
                callback('blackDetected', blackDetected)
                blackDetected = {}
                return
            }
        })
        lines = ''
    })

    child.stdout.on('data', (chunk) => {
        lines += chunk.toString()
        if (!lines.endsWith('\n'))
            return

        lines.split('\n').filter(line => line).forEach(line => {
            const [key, val] = line.split('=')
            if (key === 'progress') {
                progress.percent = Math.min(Math.round((progress.out_time_ms * 100 / msDuration)), 100)
                callback('progress', progress)
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
            const emitter = new FFMPEGEmitter()
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

            const child = spawn('ffmpeg', args)
            const kill = () => child.kill
            emitter.once('abort', kill)
            child.stderr.on('data', (err) => console.error(err.toString()))
            ffmpegProgress(videoPath, child, (progress) => emitter.emit('progress', progress))
            child.on('exit', (code, signal) => {
                emitter.off('abort', kill)
                emitter.emit('end', { code, signal })
            })

            return emitter
        },

        async transcode(options) {
            const emitter = new FFMPEGEmitter()
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

                    child = spawn('ffmpeg', args)
                    const kill = () => child.kill()
                    emitter.once("abort", kill)
                    child.stderr.on('data', (err) => console.error(err.toString()))
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
                    } catch (err) {
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

                            child = spawn('ffmpeg', [...args, '-pass', '1', '-an', '/dev/null'])
                            const kill = () => child.kill()
                            emitter.once("abort", kill)
                            child.stderr.on('data', (err) => console.error(err.toString()))
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
                            child = spawn('ffmpeg', [
                                ...args,
                                '-pass', previousPass ? '2' : '1',
                                '-ac', '2',
                                '-b:a', rasters[raster].audioRate,
                                outFile
                            ])

                            const kill = () => child.kill()
                            emitter.once("abort", kill)
                            child.stderr.on('data', (err) => console.error(err.toString()))
                            ffmpegProgress(videoPath, child, progressHandler.bind(null, passes))
                            child.on('exit', (code) => {
                                emitter.off("kill", kill)
                                emitter.emit('end', { code })
                            })
                        })
                        .catch((err) => console.error(err))

                    return emitter

                default:
                    return new Error(`unsupported format ${format}`)
            }
        },

        async audioWaveform(options) {
            const emitter = new FFMPEGEmitter()
            const { height, width } = options

            const tempImageFile = path.join("/tmp/", path.basename(videoPath)) + "-qa.png"
            console.log("temp image file", tempImageFile)

            const args = [
                '-i', videoPath,
                '-y',
                '-progress', '-',
                '-filter_complex', 'showwavespic=s=' + options.width + 'x' + options.height + ':' + 'split_channels=1',
                '-frames:v', '1', tempImageFile
            ]

            console.log(args.join(' '))

            const child = spawn('/usr/local/bin/ffmpeg', args)
            const kill = () => child.kill
            emitter.once('abort', kill)
            ffmpegProgress(videoPath, child, (progress) => emitter.emit('progress', progress))
            child.stderr.on('data', (err) => console.error(err.toString()))
            child.on('exit', (code, signal, tempImageFile) => {
                emitter.off('abort', kill)
                emitter.emit('end', { code, signal })
            })

            return emitter
        },

        async blackSceneDetect(options) {
            // ffmpeg -i lecture9burned.mp4 -vf "blackdetect=d=1:pix_th=0.00" -an -f null - 2>&1 | grep blackdetect > output.txt
            const emitter = new FFMPEGEmitter()
            const { blackLevel, minDuration } = options

            const args = [
                '-i', videoPath,
                '-y',
                '-loglevel', 'info',
                '-vf', 'blackdetect=d=' + minDuration + ':pix_th=' + blackLevel,
                '-an', '-f', 'null', '-progress', '-', '/dev/null'
            ]

            const child = spawn('/usr/local/bin/ffmpeg', args)
            const kill = () => child.kill
            emitter.once('abort', kill)

            // need to parse the output HERE
            ffmpegProgress(videoPath, child, (event, data) => emitter.emit(event, data))
            
            // stderr still used for black scene detect
            child.stderr.on('data', (err) => console.error(err.toString()))
            child.on('exit', (code, signal) => {
                emitter.off('abort', kill)
                emitter.emit('end', { code, signal })
            })

            return emitter
        }
    }
}

module.exports = { ffprobe, ffmpeg }