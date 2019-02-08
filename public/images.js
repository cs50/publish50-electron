const im = require('imagemagick')
const fs = require('fs')
const path = require('path')

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

function dd(n) {
  return `${n < 10 ? '0' : ''}${n}`
}

function hhmmssttt(seconds) {
  const hours = parseInt(seconds / 3600)
  seconds %= 3600
  const minutes = parseInt(seconds / 60) % 60
  seconds %= 60
  return `${dd(hours)}:${dd(minutes)}:${dd(seconds)}.000`
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

  stackThumbnails(options) {
    return new Promise((resolve, reject) => {
      const thumbnailsFolder = options.thumbnailsFolder
      const basename = options.basename
      const stackSize = options.stackSize || 12
      const removeSingles = options.removeSingles || true

      fs.readdir(thumbnailsFolder, async (err, filenames) => {
        if (err)
          return reject(new Error(err))

        filenames = filenames.filter((filename) => path.extname(filename) === '.jpg')

          // Naturally sort filenames
          .sort(new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare)
          .map((filename) => path.join(thumbnailsFolder, filename))

        const stacks = []
        for (let i = 0; i < filenames.length; i += stackSize) {
          stacks.push(filenames.slice(i, i + stackSize))
        }

        let stacksOut = []

        await new Promise((resolve_, reject_) => {
          stacks.forEach(async (stack, i) => {
            const stackOut = path.join(thumbnailsFolder, `${basename}-${i}.jpg`)
            await convertPromise([
              ...stack,
              '-append',
              stackOut
            ])

            stacksOut.push(stackOut)

            if (removeSingles) {
              stack.forEach((filename) => {
                fs.unlinkSync(filename)
              })
            }
            resolve_()
          })
        })

        resolve(stacksOut)
      })
    })
  },

  generateVTT(options) {
    return new Promise((resolve, reject) => {
      const { stacks, outFile, stackSize, frequency, cdnURL, thumbnailWidth, thumbnailHeight } = options
      let vtt = 'WEBVTT\n\n'

      let seconds = 0
      let y = 0
      stacks.map((stack, i) => {
        for (let j = 0; j < stackSize; j++) {
          vtt += `${hhmmssttt(seconds)} --> ${hhmmssttt(seconds += frequency)}`
          vtt += '\n'
          vtt += `${cdnURL || '{CDN_URL}'}/${path.basename(stack)}#xywh=0,${y},${thumbnailWidth},${thumbnailHeight}`
          y += thumbnailHeight
          vtt += '\n\n'
        }
      })

      fs.writeFileSync(outFile, vtt)
      resolve()
    })
  }
}
