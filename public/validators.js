function isPositiveInt(val) {
  val = parseInt(val)
  return val !== NaN && val > 0 && val
}

function validate(options) {
  const { name, value, isValid = (val) => true, parseValue = (val) => val, err='' } = options
  if (isValid(value)) {
    return {
      name,
      value: parseValue(value)
    }
  }

  return { err, name, value }
}

function validateGeneral(general={}) {
  const { redisPort, imageProcessingWorkers, videoTranscodingWorkers } = general
  const validated = []
  if (redisPort) {
    validated.push(
      validate({
        name: 'general.redisPort',
        value: redisPort,
        isValid(val) {
          val = parseInt(val)
          return val !== NaN && val > -1 && val < 65536
        },
        getValid: parseInt,
        err: 'Expected redis port to be an integer between 0 and 65535 (inclusive)'
      })
    )
  }

  if (imageProcessingWorkers) {
    validated.push(
      validate({
        name: 'general.imageProcessingWorkers',
        value: imageProcessingWorkers,
        isValid: isPositiveInt,
        getValid: parseInt,
        err: 'Expected number of image processing workers to be a positive integer'
      })
    )
  }

  if (videoTranscodingWorkers) {
    validated.push(
      validate({
        name: 'general.videoTranscodingWorkers',
        value: videoTranscodingWorkers,
        isValid: isPositiveInt,
        getValid: parseInt,
        err: 'Expected number of video transcoding workers to be a positive integer'
      })
    )
  }

  return validated
}

function validateFFMPEG(ffmpeg={}) {
  const { thumbnailFrequency, thumbnailStacksOnly, thumbnailHeight, thumbnailStackSize } = ffmpeg
  const validated = []

  if (thumbnailFrequency) {
    validated.push(
      validate({
        name: 'ffmpeg.thumbnailFrequency',
        value: thumbnailFrequency,
        isValid: isPositiveInt,
        getValid: parseInt,
        err: 'Expected thumbnail frequency to be a positive integer'
      })
    )
  }

  if (thumbnailStacksOnly) {
    validated.push(
      validate({
        name: 'ffmpeg.thumbnailStacksOnly',
        value: thumbnailStacksOnly,
        getValid(val) {
          return val && true
        },
        err: 'Expected thumbnail stacks only to be true or false'
      })
    )
  }

  if (thumbnailHeight) {
    validated.push(
      validate({
        name: 'ffmpeg.thumbnailHeight',
        value: thumbnailHeight,
        isValid: isPositiveInt,
        getValid: parseInt,
        err: 'Expected thumbnail height to be a positive integer'
      })
    )
  }

  if (thumbnailStackSize) {
    validated.push(
      validate({
        name: 'ffmpeg.thumbnailStackSize',
        value: thumbnailStackSize,
        isValid: isPositiveInt,
        getValid: parseInt,
        err: 'Expected thumbnail stack size to be a positive integer'
      })
    )
  }

  return validated
}

function validateAWSCredentials(credentials={}) {
  const { accessKeyId, secretAccessKey } = credentials
  const validated = []

  if (accessKeyId) {
    validated.push(
      validate({
        name: 'awsCredentials.accessKeyId',
        value: accessKeyId
      })
    )
  }

  if (secretAccessKey) {
    validated.push(
      validate({
        name: 'awsCredentials.secretAccessKey',
        value: secretAccessKey
      })
    )
  }

  return validated
}

function validateGoogleCredentials(credentials={}) {
  const { tokens } = credentials
  const validated = []

  if (tokens) {
    validated.push(
      validate({
        name: 'googleCredentials.tokens',
        value: tokens
      })
    )
  }

  return validated
}

function validateS3(s3={}) {
  const { bucket, prefix, region, roleArn, roleSessionName, durationSeconds } = s3
  const validated = []
  if (bucket) {
    validated.push(
      validate({
        name: 's3.bucket',
        value: bucket
      })
    )
  }

  if (prefix) {
    validated.push(
      validate({
        name: 's3.prefix',
        value: prefix
      })
    )
  }

  if (region) {
    validated.push(
      validate({
        name: 's3.region',
        value: region,
        getValid(val) {
          return val.trim().toLowerCase()
        },
        err: 'Invalid region name'
      })
    )
  }

  if (roleArn) {
    validated.push(
      validate({
        name: 's3.roleArn',
        value: roleArn
      })
    )
  }

  if (roleSessionName) {
    validated.push(
      validate({
        name: 's3.roleSessionName',
        value: roleSessionName
      })
    )
  }

  if (durationSeconds) {
    validated.push(
      validate({
        name: 's3.durationSeconds',
        value: durationSeconds,
        isValid: isPositiveInt,
        getValid: parseInt,
        err: 'Expected session duration to be a positive integer'
      })
    )
  }

  return validated
}

module.exports = {
  validate,
  validateGeneral,
  validateFFMPEG,
  validateAWSCredentials,
  validateGoogleCredentials,
  validateS3
}
