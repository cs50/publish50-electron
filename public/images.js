const im = require('imagemagick')
const fs = require('fs')
const path = require('path')

const { ffprobe, ffmpeg } = require('./ffmpeg')
const { rasters } = require('./constants')

function convertPromise(args) {
  return new Promise((resolve, reject) => {
    im.convert(args, (err, stdout) => {
      if (err)
        return reject(err)

      resolve(stdout)
    })
  })
}

module.exports = {
  resizeStill(options) {
    return new Promise(async (resolve, reject) => {
      const inFile = options.imagePath
      const raster = options.raster
      const maxSize = options.maxSize || 2 * 1024 * 1024

      if (Object.keys(rasters).indexOf(raster) < 0)
        return reject(new Error(`unknown raster ${raster}`))

      const height = rasters[raster].stillHeight
      if (!height)
        return reject(new Error(`unknown height for raster ${raster}`))

      let args = [inFile]
      if (height === 140) {
        args.push(
          '-thumbnail', '249x140',
          '-gravity', 'center',
          '-background', 'black',
          '-extent', '249x140'
        )
      }
      else {
        args.push('-resize', `x${height}`)
      }

      const outFileBasename = path.join(path.dirname(inFile), `${path.basename(inFile, path.extname(inFile))}-${raster}`)
      const outFilePNG = `${outFileBasename}.png`

      await convertPromise([...args, outFilePNG])

      if (raster !== '1080p')
        return resolve()

      const outFileJPG = `${outFileBasename}.jpg`
      args.push(
        '-strip',
        '-interlace', 'Plane',
        '-define', `jpeg:extent=${maxSize}b`,
      )

      for (let i = 10; i > 0; i--) {
        let convertOut
        await convertPromise([...args, '-depth', i.toString(), outFileJPG])
        convertOut = await convertPromise([outFileJPG, '-format', '%[mean]', 'info:'])
        if (convertOut === '942.333')
          return reject(new Error(`${outFileJPG} is black`))
        else if (fs.statSync(outFileJPG).size <= maxSize)
          return resolve()
      }

      return reject(new Error(`failed to compress ${outFile} below ${maxSize} bytes`))
    })
  },

  async generateThumbnails(options) {
    const videoPath = options.videoPath
    const cdnUrl = options.cdnUrl
    const stackSize = options.stackSize || 12
    const frequency = options.frequency || 5
    const thumbnailHeight = options.height || 90
    const destination = options.destination || path.join(path.dirname(videoPath), 'thumbnails')

    const metadata = await ffprobe(videoPath)
    const { aspectRatio, height, width, duration, widescreen } = metadata
    const thumbnailWidth = Math.round(thumbnailHeight * aspectRatio)

    return ffmpeg(videoPath).thumbnails({
      size: `${thumbnailWidth}x${thumbnailHeight}`,
      outFolder: path.join(path.dirname(videoPath), '../dist/thumbnails')
    })
  }
}
