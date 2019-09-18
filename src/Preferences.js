import React, { Component } from 'react';

import './Preferences.css'

const { ipc } = window
class Preferences extends Component {
  constructor(props) {
    super(props)
    this.state = this.getInitialState()

    this.boundHandlePreferences = this.handlePreferences.bind(this)

    ipc.on('preferences', this.boundHandlePreferences)
    ipc.send('get preferences')

    this.awsSecretAccessKeyRef = React.createRef()
  }

  handlePreferences(event, preferences) {
    this.setState({ preferences })
  }

  getInitialState() {
    return {
      disableSave: true,
      preferences: null
    }
  }

  save() {
    this.setState({
      disableSave: true
    })

    ipc.send('save preferences', this.state.preferences)
  }

  onChange(path, valueKey, e) {
    this.setState({ disableSave: false })

    if (!e) {
      e = valueKey
      valueKey = 'value'
    }

    const preferences = { ...this.state.preferences }
    const keys = path.split('.')
    const lastKey = keys.pop()

    let cur = preferences
    keys.forEach((key) => {
      cur = cur[key]
    })

    cur[lastKey] = e.target[valueKey]
    this.setState({ preferences })
  }

  setAwsSecretAccessKey() {
    const preferences = { ...this.state.preferences }
    preferences.awsCredentials.secretAccessKey = ""
    this.setState({ preferences })
  }

  componentWillUnmount() {
    ipc.removeListener('preferences', this.boundHandlePreferences)
  }

  render() {
    return this.state.preferences && (
      <div className="row flex-grow-* w-100 ml-0">
        <div className="col-lg-2 flex-grow-1 d-flex pl-0">
          <ul className="list-group text-primary d-flex flex-grow-1">
            <li className="list-group-item">
              <small>General</small>
            </li>
            <li className="list-group-item">
              <small>Credentials</small>
            </li>
            <li className="list-group-item">
              <small>FFMPEG</small>
            </li>
            <li className="list-group-item">
              <small>CDN</small>
            </li>
            <li className="list-group-item">
              <small>CloudFront</small>
            </li>
            <li className="list-group-item flex-grow-1">
              <small>About</small>
            </li>
          </ul>
        </div>


        <div className="col-lg-10 preferences content h-auto overflow-auto">
          <div>
            <h6 className="text-dark border-bottom pb-2">General</h6>
            <div className="pl-3 pb-3">
              <div className="row mt-4">
                <div className="col-5">
                  <label htmlFor="imageProcessingWorkers">
                    <small className="text-muted">Number of image processing workers</small>
                  </label>
                </div>
                <div className="col-2">
                  <input
                    id="imageProcessingWorkers"
                    className="form-control form-control-sm"
                    type="number"
                    min="1"
                    onChange={ this.onChange.bind(this, 'general.imageProcessingWorkers') }
                    value={ this.state.preferences.general.imageProcessingWorkers }
                    autoFocus
                  />
                </div>
              </div>

              <div className="row mt-2">
                <div className="col-5">
                  <label htmlFor="videoTranscodingWorkers"><small className="text-muted">Number of video transcoding workers</small></label>
                </div>
                <div className="col-2">
                  <input
                    id="videoTranscodingWorkers"
                    className="form-control form-control-sm"
                    type="number"
                    min="1"
                    onChange={ this.onChange.bind(this, 'general.videoTranscodingWorkers') }
                    value={ this.state.preferences.general.videoTranscodingWorkers }
                  />
                </div>
              </div>

              <div className="row mt-2">
                <div className="col-5">
                  <label htmlFor="redisPort"><small className="text-muted">Redis port</small></label>
                </div>
                <div className="col-2">
                  <input
                    id="redisPort"
                    className="form-control form-control-sm"
                    type="number"
                    min="1"
                    max="65535"
                    onChange={ this.onChange.bind(this, 'general.redisPort') }
                    value={ this.state.preferences.general.redisPort } />
                </div>
              </div>

            </div>
          </div>


          <div className="mt-4">
            <h6 className="text-dark border-bottom pb-2">Credentials</h6>
            <div className="pl-3 pb-3">
              <div className="row mt-4">
                <div className="col-5">
                  <label htmlFor="awsAccessKeyId"><small className="text-muted">AWS access key ID</small></label>
                </div>
                <div className="col-4">
                  <input
                    id="awsAccessKeyId"
                    className="form-control form-control-sm"
                    value={ this.state.preferences.awsCredentials.accessKeyId }
                    onChange={ this.onChange.bind(this, 'awsCredentials.accessKeyId') }
                  />
                </div>
              </div>
              <div className="row mt-2">
                <div className="col-5">
                  <label htmlFor="awsSecretAccessKey"><small className="text-muted">AWS secret access key</small></label>
                </div>
                <div className="col-4">
                  <input
                    id="awsSecretAccessKey"
                    ref={ this.awsSecretAccessKeyRef }
                    className="form-control form-control-sm"
                    value={ this.state.preferences.awsCredentials.secretAccessKey }
                    onChange={ this.onChange.bind(this, 'awsCredentials.secretAccessKey') }
                    type={
                      (() => {

                        if (this.state.preferences.awsCredentials.secretAccessKey) {
                          if (document.activeElement === this.awsSecretAccessKeyRef.current) {
                            return "text"
                          }
                          else {
                            return "hidden"
                          }
                        }
                        else {
                          return "text"
                        }
                      })()
                    }
                  />
                  {
                    (
                      this.state.preferences.awsCredentials.secretAccessKey &&
                      document.activeElement !== this.awsSecretAccessKeyRef.current &&
                        <div>
                          <small>********</small>
                          <button
                            type="button"
                            className="btn btn-link btn-sm pl-2"
                            onClick={this.setAwsSecretAccessKey.bind(this) }>
                              Change
                          </button>
                        </div>
                    )
                  }
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h6 className="text-dark border-bottom pb-2">FFMPEG</h6>
            <div className="pl-3 pb-3">
              <div className="row mt-4">
                <div className="col-5">
                  <label htmlFor="thumbnailFrequency"><small className="text-muted">Number of seconds per thumbnail</small></label>
                </div>
                <div className="col-2">
                  <input
                    id="thumbnailFrequency"
                    className="form-control form-control-sm"
                    type="number"
                    min="1"
                    onChange={ this.onChange.bind(this, 'ffmpeg.thumbnailFrequency') }
                    value={ this.state.preferences.ffmpeg.thumbnailFrequency }
                  />
                </div>
              </div>
              <div className="row mt-2">
                <div className="col-5">
                  <label htmlFor="stacksOnly">
                    <small className="text-muted">Keep thumbnail stacks only</small>
                  </label>
                </div>
                <div className="col-2">
                  <div className="custom-control custom-switch">
                    <input
                      type="checkbox"
                      className="custom-control-input"
                      id="stacksOnly"
                      checked={ this.state.preferences.ffmpeg.thumbnailStacksOnly }
                      onChange={ this.onChange.bind(this, 'ffmpeg.thumbnailStacksOnly', 'checked') }
                    />
                    <label className="custom-control-label" htmlFor="stacksOnly"></label>
                  </div>
                </div>
              </div>
              <div className="row mt-2">
                <div className="col-5">
                  <label htmlFor="thumbnailHeight"><small className="text-muted">Thumbnail height (px)</small></label>
                </div>
                <div className="col-2">
                  <input
                    id="thumbnailHeight"
                    className="form-control form-control-sm"
                    type="number"
                    min="1"
                    onChange= { this.onChange.bind(this, 'ffmpeg.thumbnailHeight') }
                    value= { this.state.preferences.ffmpeg.thumbnailHeight }
                  />
                </div>
              </div>
              <div className="row mt-2">
                <div className="col-5">
                  <label htmlFor="thumbnailStackSize"><small className="text-muted">Thumbnail stack size</small></label>
                </div>
                <div className="col-2">
                  <input
                    id="thumbnailStackSize"
                    className="form-control form-control-sm"
                    type="number" min="1"
                    onChange= { this.onChange.bind(this, 'ffmpeg.thumbnailStackSize') }
                    value= { this.state.preferences.ffmpeg.thumbnailStackSize }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h6 className="text-dark border-bottom pb-2">CDN</h6>
            <div className="pl-3 pb-3">
              <div className="row mt-4">
                <div className="col-5">
                  <label><small className="text-muted">Bucket</small></label>
                </div>
                <div className="col-5">
                  <input
                    className="form-control"
                    onChange={ this.onChange.bind(this, 's3.bucket') }
                    value={ this.state.preferences.s3.bucket }
                  />
                </div>
              </div>
              <div className="row mt-2">
                <div className="col-5">
                  <label><small className="text-muted">Prefix</small></label>
                </div>

                <div className="col-5">
                  <input
                    className="form-control"
                    onChange={ this.onChange.bind(this, 's3.prefix') }
                    value={ this.state.preferences.s3.prefix }
                  />
                </div>
              </div>

              <div className="row mt-2">
                <div className="col-5">
                  <label><small className="text-muted">Region</small></label>
                </div>

                <div className="col-5">
                  <input
                    className="form-control"
                    onChange={ this.onChange.bind(this, 's3.region') }
                    value={ this.state.preferences.s3.region }
                  />
                </div>
              </div>

              <div className="row mt-2">
                <div className="col-5">
                  <label><small className="text-muted">Role ARN</small></label>
                </div>

                <div className="col-5">
                  <input
                    className="form-control"
                    onChange={ this.onChange.bind(this, 's3.roleArn') }
                    value={ this.state.preferences.s3.roleArn }
                  />
                </div>
              </div>

              <div className="row mt-2">
                <div className="col-5">
                  <label><small className="text-muted">Role session name</small></label>
                </div>

                <div className="col-5">
                  <input
                    className="form-control"
                    onChange={ this.onChange.bind(this, 's3.roleSessionName') }
                    value={ this.state.preferences.s3.roleSessionName }
                  />
                </div>
              </div>

              <div className="row mt-2">
                <div className="col-5">
                  <label><small className="text-muted">Session duration (s)</small></label>
                </div>

                <div className="col-2">
                  <input
                    className="form-control"
                    type="number"
                    min="1"
                    max="43200"
                    onChange={ this.onChange.bind(this, 's3.durationSeconds') }
                    value={ this.state.preferences.s3.durationSeconds }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h6 id="cloudfront" className="text-dark border-bottom pb-2">CloudFront</h6>
            <div className="pl-3 pb-3">
              <div className="row mt-4">
                <div className="col-5">
                  <label><small className="text-muted">Distribution ID</small></label>
                </div>
                <div className="col-5">
                  <input
                    className="form-control"
                    onChange={ this.onChange.bind(this, 'cloudfront.distributionId') }
                    value={ this.state.preferences.cloudfront.distributionId }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h6 className="text-dark border-bottom pb-2">About</h6>
            <div className="pl-3 pb-3">
              <div className="row mt-4">
                <div className="col-5">
                  <label><small className="text-muted">Version</small></label>
                </div>

                <div className="col-5">
                  <small>{ this.state.preferences.about.version }</small>
                </div>

              </div>
            </div>
          </div>

          <div className="text-right my-4">
            <button
              type="button"
              className={ `btn btn-${ this.state.disableSave ? 'success' : 'primary' }` }
              disabled={ this.state.disableSave }
              onClick={ this.save.bind(this) }>
                Save
            </button>
            <button
              type="button"
              className="btn btn-secondary ml-1"
              onClick={ () => ipc.send('reset preferences') }>
                Reset Defaults
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default Preferences;
