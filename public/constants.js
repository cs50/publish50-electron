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
      videoBitRate: {
        mp4: '125k',
        webm: '125k'
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
      videoBitRate: {
        mp4: '512k',
        webm: '1000k'
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
      videoBitRate: {
        mp4: '2000k',
        webm: '2000k'
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
      videoBitRate: {
        mp4: '10000k',
        webm: '10000k'
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
      videoBitRate: {
        mp4: '25000k',
        webm: '25000k'
      },
      stillHeight: 1728
    }
  }
}
