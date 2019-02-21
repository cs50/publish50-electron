const { app } = require('electron')
const appVersion = app.getVersion()
const settings = require('electron-settings')

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
  googleCredentials: {
    authorizationCode: ''
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
  },
  about: {
    version: appVersion
  }
}

function setDefaults() {
  settings.setAll(defaults)
  return defaults
}

if (Object.keys(settings.getAll()).length < 1)
  setDefaults()


module.exports = {
  defaults,

  load: settings.getAll.bind(settings),

  reset: setDefaults,

  get: settings.get.bind(settings),

  async save(preferences) {
    const { general, ffmpeg, awsCredentials, googleCredentials, s3 } = preferences
    let validated = validators.validateGeneral(general)
    .concat(validators.validateFFMPEG(ffmpeg))
    .concat(validators.validateAWSCredentials(awsCredentials))
    .concat(validators.validateGoogleCredentials(googleCredentials))
    .concat(validators.validateS3(s3))

    if (validated.some((setting) => setting.err)) {
      return Promise.reject(validated)
    }
    else if (validated.length > 0) {
      validated.forEach((setting) => settings.set(setting.name, setting.value))
      return Promise.resolve(validated)
    }
  }
}
