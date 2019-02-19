import React, { Component } from 'react';

import DropZone from './DropZone'

const { ipc } = window

function getInitialState() {
  return {
    formats: {
      mp3: true,
      mp4: true
    },
    rasters: {
      '240p': true,
      '360p': true,
      '720p': true,
      '1080p': true,
      '4k': true
    },
    twoPasses: true,
    formHidden: true
  }
}

class Transcode extends Component {
  constructor(props) {
    super(props)
    this.state = getInitialState()
  }

  onDropzoneChange(files) {
    this.setState({ formHidden: files.size < 1 })
  }

  onSubmit(files) {
    ipc.send('transcode', { files: Array.from(files), ...this.state })
    this.setState(getInitialState())
  }

  formatChanged(e) {
    const formats = this.state.formats
    formats[e.target.id] = e.target.checked
    this.setState({
      formats: { ...formats }
    })
  }

  rasterChanged(e) {
    const rasters = this.state.rasters
    rasters[e.target.id] = e.target.checked
    this.setState({
      rasters: { ...rasters }
    })
  }

  render() {
    return (
      <div className="w-75 mx-auto mt-5">
        <DropZone accept=".mov,.mp4" caption="Transcode" onSubmit={ this.onSubmit.bind(this) } onChange={ this.onDropzoneChange.bind(this) }/>
        <div className={`mt-5 mx-auto ${(this.state.formHidden && "d-none") || ""}`}>
          <h3>Options</h3>
          <form>
            <div className="row">
              <div className="col">
                <label>
                  Which formats would you like to transcode to?
                </label>
                { ['mp3', 'mp4'].map((format) => {
                  return <div className="custom-control custom-checkbox" key={ format }>
                    <input
                      type="checkbox"
                      className="custom-control-input"
                      id={ format }
                      checked={ this.state.formats[format] }
                      onChange={ this.formatChanged.bind(this) }/>
                    <label
                      className="custom-control-label"
                      htmlFor={ format }>
                      { format }
                      { format === 'mp3' &&
                      <small className="text-muted"> (ignored for cameras and screens videos)</small>}
                    </label>

                  </div>
                }) }
              </div>
            </div>

            <div className="row mt-3">
              <div className="col">
                <label>
                  Which modes would you like to transcode to?
                </label>
                {
                  ['240p', '360p', '720p', '1080p', '4k'].map((raster) => {
                    return <div className="custom-control custom-checkbox" key={ raster }>
                      <input
                        type="checkbox"
                        className="custom-control-input"
                        id={raster}
                        checked={ this.state.rasters[raster] }
                        onChange={ this.rasterChanged.bind(this) }
                        disabled={ !this.state.formats.mp4 } />
                      <label
                        className="custom-control-label"
                        htmlFor={raster}>
                        {raster}
                      </label>
                    </div>
                  })
                }
              </div>
            </div>

            <div className="row mt-3">
              <div className="col">
                <div className="custom-control custom-switch">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="twoPasses"
                    checked={ this.state.twoPasses }
                    onChange={ (e) => this.setState({ twoPasses: e.target.checked }) }
                    disabled={ !this.state.formats.mp4 }
                  />

                  <label
                    className="custom-control-label"
                    htmlFor="twoPasses">
                    Perform two passes <small className="text-muted">(recommended)</small>
                  </label>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export default Transcode;
