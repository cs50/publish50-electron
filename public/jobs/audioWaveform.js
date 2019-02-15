const { ffmpeg } = require('../ffmpeg')

module.exports = function(job) {
    const { videoPath, height, width } = job.data

    return new Promise((resolve, reject) => {
        ffmpeg(videoPath).audioWaveform({ height, width }).then(emitter => {
            emitter.on('end', ({ code, signal }) => {
                if (signal)
                    return reject(new Error(`ffmpeg received ${signal} (exited)`))
                else if (code !== 0)
                    return reject(new Error(`ffmpeg exited with error code ${code}`))
                resolve()
            })
        })
    })
}