const path = require('path')
const AWS = require('aws-sdk')

const logger = require('../logger')

module.exports = function (job) {
  return new Promise((resolve, reject) => {
    const { accessKeyId, secretAccessKey, bucket, prefix, metadata, distributionId} = job.data
    const awsCredentials = {
      accessKeyId,
      secretAccessKey
    }

    const s3Client = new AWS.S3(awsCredentials)
    const cfClient = new AWS.CloudFront(awsCredentials)

    const metadataKey = path.join(prefix, 'index.json')

    logger.info(`updating metadata at ${prefix}`)
    s3Client.putObject(
      {
        Bucket: bucket,
        Body: Buffer.from(JSON.stringify(metadata)),
        ContentType: 'application/json',
        Key: metadataKey
      },
      (err, result) => {
        if (err) {
          logger.error(`failed to update metadata at ${prefix}:\n${err}`)
          return reject(new Error(err))
        }

        if (!distributionId) {
            resolve(result)
            return
        }

        logger.info(`creating cache invalidation in ${distributionId} for ${metadataKey}`)
        cfClient.createInvalidation(
          {
            DistributionId: distributionId,
            InvalidationBatch: {
              CallerReference: Date.now().toString(),
              Paths: {
                Quantity: 1,
                Items: [`/${metadataKey}`]
              }
            }
          },
          (err, data) => {
            if (err) {
              logger.error(`failed to create cache invalidation in ${distributionId} for ${metadataKey}:\n${err}`)
              return reject(new Error(err))
            }

            resolve(result)
          }
        )
      }
    )
  })
}
