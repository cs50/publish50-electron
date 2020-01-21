const { app } = require('electron')
const settings = require('electron-settings')

const logger = require('./logger')
const validators = require('./validators')

const defaults = {
  general: {
    redisPort: 6379,
    imageProcessingWorkers: 64,
    videoTranscodingWorkers: 8
  },
  awsCredentials: {
    accessKeyId:'',
    secretAccessKey:''
  },
  cloudfront: {
    distributionId: ''
  },
  googleCredentials: {
    tokens: ''
  },
  ffmpeg: {
    thumbnailFrequency: 5,
    thumbnailHeight: 90,
    thumbnailStackSize: 12,
    thumbnailStacksOnly: true
  },
  s3: {
    bucket: 'cdn.cs50.net',
    prefix: '',
    region: 'us-east-1',
    durationSeconds: 4 * 60 * 60,
    roleSessionName: 'publish50',
    roleArn: 'arn:aws:iam::518640797791:role/publish50Role'
  }
}

function setDefaultsHelper(defaults, currentSettings) {
  Object.keys(defaults).forEach((key) => {
    if (!currentSettings.hasOwnProperty(key)) {
      currentSettings[key] = defaults[key]
    }
    else if (typeof (currentSettings[key]) === 'object') {
      setDefaultsHelper(defaults[key], currentSettings[key])
    }
  })
}

function setDefaults(force) {
  if (force) {
    settings.setAll(defaults)
    return defaults
  }

  let currentSettings;
  try {
    currentSettings = settings.getAll()
  }
  catch (err) {
    logger.error(err)
    logger.info('falling back to {}')
    currentSettings = {}
  }

  setDefaultsHelper(defaults, currentSettings)

  settings.setAll(currentSettings)
  return currentSettings
}

setDefaults()

settings.set('about.version', app.getVersion())

module.exports = {
  defaults,

  load: settings.getAll.bind(settings),

  reset: setDefaults.bind(null, true),

  get: settings.get.bind(settings),

  async save(preferences) {
    const {
      general,
      ffmpeg,
      awsCredentials,
      cloudfront,
      googleCredentials,
      s3
    } = preferences

    let validated = validators.validateGeneral(general)
    .concat(validators.validateFFMPEG(ffmpeg))
    .concat(validators.validateAWSCredentials(awsCredentials))
    .concat(validators.validateGoogleCredentials(googleCredentials))
    .concat(validators.validateS3(s3))
    .concat(validators.validateCloudfront(cloudfront))

    if (validated.some((setting) => setting.err)) {
      return Promise.reject(validated)
    }
    else if (validated.length > 0) {
      validated.forEach((setting) => settings.set(setting.name, setting.value))
      return Promise.resolve(validated)
    }
  }
}
