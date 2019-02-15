const { ffmpeg } = require('../ffmpeg')

module.exports = function(job) {
    const { videoPath, blackLevel, minDuration } = job.data

    return new Promise((resolve, reject) => {
        ffmpeg(videoPath).blackSceneDetect({ blackLevel, minDuration }).then(emitter => {
            emitter.on('end', ({ code, signal }) => {
                if (signal)
                    return reject(new Error(`ffmpeg received ${signal} (exited)`))
                else if (code !== 0)
                    return reject(new Error(`ffmpeg exited with error code ${code}`))
                resolve()
            })
            // TODO - what to do with emitter.on('blackDetected', data)?
        })
    })
}