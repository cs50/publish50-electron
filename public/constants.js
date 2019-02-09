module.exports = {
  rasters: {
    '140p': {
      stillHeight: 140
    },

    '240p': {
      audioRate: '56k',
      profile: 'baseline',
      scale: {
        standard: '426:240',
        widescreen: '-1:242'
      },
      videoBitrate: {
        mp4: '125k'
      },
      stillHeight: 240
    },

    '360p': {
      audioRate: '96k',
      profile: 'baseline',
      scale: {
        standard: '-1:360',
        widescreen: '-1:362'
      },
      videoBitrate: {
        mp4: '512k'
      },
      stillHeight: 360
    },

    '720p': {
      audioRate: '128k',
      profile: 'main',
      scale: {
        standard: '-1:720',
        widescreen: '-1:724'
      },
      videoBitrate: {
        mp4: '2000k'
      },
      stillHeight: 720
    },

    '1080p': {
      audioRate: '196k',
      profile: 'high',
      scale: {
        standard: '-1:1080',
        widescreen: '-1:1080'
      },
      videoBitrate: {
        mp4: '10000k'
      },
      stillHeight: 1080
    },

    '4k': {
      audioRate: '320k',
      profile: 'high',
      scale: {
        standard: '-1:2160',
        widescreen: '-1:1728'
      },
      videoBitrate: {
        mp4: '25000k'
      },
      stillHeight: 1728
    }
  },

  codecs: {
    audio: {
      mp4: "aac",
    },
    video: {
      mp4: "libx264"
    }
  }
}
