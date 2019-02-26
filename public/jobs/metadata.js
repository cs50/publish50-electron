const path = require('path')
const AWS = require('aws-sdk')

const logger = require('../logger')

module.exports = function (job) {
  return new Promise((resolve, reject) => {
    // TODO PULL WHAT'S IN S3 FIRST
    const { accessKeyId, secretAccessKey, bucket, prefix, metadata} = job.data
    const s3Client = new AWS.S3({
      accessKeyId,
      secretAccessKey
    })

    s3Client.putObject(
      {
        Bucket: bucket,
        Body: Buffer.from(JSON.stringify(metadata)),
        ContentType: 'application/json',
        Key: path.join(prefix, 'metadata.json')
      },
      (err, result) => {
        if (err) {
          logger.error(err)
          return reject(new Error(err))
        }

        resolve(result)
      }
    )
  })
}
