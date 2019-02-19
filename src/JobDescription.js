import React from 'react'
const path = require('path')

function truncate(s) {
  if (s.length > 32)
    return `${s.substring(0, 12)}...${s.substring(s.length - 20)}`

  return s
}

class JobDescription extends React.Component {
  render() {
    const { name, data } = this.props.job
    switch(name) {
      case 'resize still':
        return (
          <div>
            Resize <abbr title={ data.imagePath }>
              '{ truncate(data.imagePath) }'
            </abbr> to '{ data.raster }'
          </div>
        )

      case 'transcode':
        if (data.format) {
          return <div>Transcode <abbr
            title={ data.videoPath }>
            { truncate(data.videoPath) }
          </abbr> to { data.format } { data.raster && `(${data.raster})` }</div>
        }

        return <div>Generate thumbnails for <abbr
          title={ data.videoPath }>
          { truncate(data.videoPath) }
          </abbr>
        </div>

      case 'update metadata':
        return <div>Update <abbr title={ path.join(data.bucket || '', data.prefix || '') }>metadata.json</abbr></div>

      default:
        return <div>Unknown job</div>
    }
  }
}

export default JobDescription
