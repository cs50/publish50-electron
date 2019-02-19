const { app } = require('electron')
const appVersion = app.getVersion()

const settings = require('electron-settings')
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

function load(reset) {
  if (reset)
    return setDefaults()

  const preferences = {}
  Object.keys(defaults).forEach((key) => {
    preferences[key] = settings.get(key, defaults[key])
  })

  return preferences
}

module.exports = {
  load,

  save(preferences) {
    preferences.general.redisPort = parseInt(preferences.general.redisPort) ||
      defaults.general.redisPort

    preferences.general.imageProcessingWorkers = parseInt(preferences.general.imageProcessingWrokers) ||
      defaults.general.imageProcessingWorkers

    preferences.general.videoTranscodingWorkers = parseInt(preferences.general.videoTranscodingWorkers) ||
      defaults.general.videoTranscoldingWorkers

    preferences.ffmpeg.thumbnailFrequency = parseInt(preferences.ffmpeg.thumbnailFrequency) ||
      defaults.ffmpeg.thumbnailFrequency

    preferences.ffmpeg.thumbnailStackSize = parseInt(preferences.ffmpeg.thumbnailStackSize) ||
      defaults.ffmpeg.thumbnailStackSize

    preferences.ffmpeg.thumbnailStacksOnly = preferences.ffmpeg.thumbnailStacksOnly && true

    preferences.s3.durationSeconds = parseInt(preferences.s3.durationSeconds) || defaults.s3.durationseconds

    settings.setAll(preferences)
  },

  defaults,

  reset() {
    return load(true)
  },

  get: settings.get.bind(settings)
}
