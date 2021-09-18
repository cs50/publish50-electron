import React, { Component } from 'react';

import './NewPublish.css'

import CDNPath from './CDNPath'
import DropZone from './DropZone'

const { ipc } = window

class NewPublish extends Component {
  constructor(props) {
    super(props)
    this.state = this.getInitialState()

    this.preferences = {
      awsCredentials: {
        accessKeyId: '',
        secretAccessKey: ''
      },
      s3: {
        bucket: '',
        prefix: ''
      }
    }

    this.handlePreferences = this._handlePreferences.bind(this)

    ipc.once('preferences', this.handlePreferences)
    ipc.send('get preferences', {
      preferences: [
        'awsCredentials',
        's3'
      ]
    })
  }

  getInitialState() {
    return {
      loading: true,
      formats: {
        mp3: true,
        m4a: true,
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
      youtube: {
        upload: true,
        privacyStatus: 'unlisted'
      },
      metadata: {
        title: '',
        description: ''
      },
      emails: [],
      formHidden: true,

    }
  }

  onDropzoneChange(files) {
    this.setState({ formHidden: files.size < 1 })
  }

  publish(files, resetDropzone) {
    ipc.send('publish', { files: Array.from(files), ...this.state })
    const state = this.getInitialState()
    state.loading = false
    this.setState(state)
    resetDropzone()
  }

  onSubmit(files, resetDropzone) {
    this.publish(files, resetDropzone)
  }

  componentWillUnmount() {
    ipc.removeListener('preferences', this.handlePreferences)
  }

  formatChanged(e) {
    const formats = this.state.formats
    formats[e.target.id] = e.target.checked
    this.setState({
      formats: { ...formats }
    })
  }

  _handlePreferences(event, preferences) {
    // this.setState({ loading: false, preferences, prefix: preferences.s3.prefix })
    //
    this.preferences = preferences
    this.setState({ loading: false })
  }

  rasterChanged(e) {
    const rasters = this.state.rasters
    rasters[e.target.id] = e.target.checked
    this.setState({
      rasters: { ...rasters }
    })
  }

  render() {
    const { awsCredentials, s3 } = this.preferences
    return <div className="w-75 mx-auto mt-5">
        <DropZone accept=".mov,.mp4,.png" caption="Start" onSubmit={ this.onSubmit.bind(this) } onChange={ this.onDropzoneChange.bind(this) }/>
        { !this.state.loading &&
          <div className={`mt-5 mx-auto ${(this.state.formHidden && "d-none") || ""}`}>
            <h3>Options</h3>
            <form>
              <div className="row">
                <div className="col pr-5">
                  <div className="form-group">
                    <label>Location</label>
                    <CDNPath
                      awsCredentials={ awsCredentials }
                      bucket={ s3.bucket }
                      prefix={ s3.prefix }
                      onData={
                        (metadata) => {
                          if (!metadata.youtube)
                            metadata.youtube = {}

                          this.setState({ metadata })
                        }
                      }

                      onSelect={
                        (prefix) => this.setState({ prefix })
                      }

                      onError={
                        (s3ClientError) => this.setState({ s3ClientError })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Title</label>
                    <input
                      className="form-control"
                      placeholder="CS50 2019 - Lecture 0 - Computational Thinking, Scratch"
                      onChange={
                        (e) => {
                          const metadata = { ...this.state.metadata }
                          metadata.title = e.target.value
                          this.setState({ metadata, updateDisabled: false })
                        }
                      }
                      value={ this.state.metadata.title }
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      className="form-control"
                      placeholder="This is a sample description."
                      value={ this.state.metadata.description }
                      onChange={
                        (e) => {
                          const metadata = { ...this.state.metadata }
                          metadata.description = e.target.value
                          this.setState({ metadata, updateDisabled: false })
                        }
                      }
                    ></textarea>
                  </div>

                  <div className="form-group">
                    <label>Authors</label>
                    {
                      ((this.state.metadata.authors || []).concat([ "" ])).map((author, index) => {
                        return <input
                          key={ index }
                          value={ author }
                          className="form-control mt-2"
                          placeholder="David J. Malan"
                          onChange={ ((index, e) => {
                            const metadata = { ...this.state.metadata }
                            if (!Array.isArray(metadata.authors))
                              metadata.authors = []

                            metadata.authors[index] = e.target.value

                            this.setState({
                              metadata,
                              updateDisabled: false
                            })
                          }).bind(this, index) }
                        />
                      })
                    }

                    {
                      (this.state.metadata.authors || []).length > 1 &&
                          <div className="text-right">
                            <button
                              className="btn btn-link btn-sm"
                              onClick={
                                () => {
                                  const metadata = { ...this.state.metadata }
                                  if (Array.isArray(metadata.authors) && metadata.authors.length > 1) {
                                    metadata.authors.pop()
                                  }

                                  this.setState({ metadata })
                                }
                              }
                            >
                              Remove
                            </button>
                          </div>
                    }
                  </div>

                  <div className="form-group">
                    <label>Email the following for quality assurance</label>
                    {
                      ((this.state.emails || []).concat([ "" ])).map((email, index) => {
                        return <input
                          type="email"
                          key={ index }
                          value={ email }
                          className="form-control mt-1"
                          placeholder="dcoffey@cs50.harvard.edu"
                          onChange={ ((index, e) => {
                            let emails = [ ...this.state.emails ]
                            if (!Array.isArray(emails))
                              emails = []

                            emails[index] = e.target.value

                            this.setState({
                              emails
                            })
                          }).bind(this, index) }
                        />
                      })
                    }

                    {
                      (this.state.emails || []).length > 1 &&
                        <div className="text-right">
                          <button
                            className="btn btn-link btn-sm"
                            onClick={
                              () => {
                                const emails = [ ...this.state.emails ]
                                if (Array.isArray(emails) && emails.length > 1) {
                                  emails.pop()
                                }

                                this.setState({ emails })
                              }
                            }
                          >
                            Remove
                          </button>
                        </div>
                    }
                  </div>
                </div>

                <div className="col border-left pl-5">
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

                  <div className="custom-control custom-switch mt-3">
                    <input
                      type="checkbox"
                      className="custom-control-input"
                      id="twoPasses"
                      checked={ this.state.twoPasses }
                      onChange={ (e) => this.setState({ twoPasses: e.target.checked }) }/>
                    <label
                      className="custom-control-label"
                      htmlFor="twoPasses">
                      Perform two passes <small className="text-muted">(recommended)</small>
                    </label>
                  </div>

                  <div className="custom-control custom-switch mt-3">
                    <input
                      type="checkbox"
                      className="custom-control-input"
                      id="uploadToYoutube"
                      checked={ this.state.youtube.upload }
                      onChange={
                        (e) => {
                          const youtube = { ...this.state.youtube }
                          youtube.upload = e.target.checked
                          this.setState({ youtube })
                        }
                      }
                    />

                    <label
                      className="custom-control-label"
                      htmlFor="uploadToYoutube">
                      <span className="mr-2">Upload to YouTube as</span>
                    </label>

                    <select
                      className="custom-select custom-select-sm w-auto position-relative privacy-list"
                      defaultValue={ this.state.youtube.privacyStatus }
                      onChange={
                        (e) => {
                          const youtube = { ...this.state.youtube }
                          youtube.privacyStatus = e.target.value
                          this.setState({ youtube })
                        }
                      }
                      disabled={ !this.state.youtube.upload }
                    >
                      <option value="public">public</option>
                      <option value="private">private</option>
                      <option value="unlisted">unlisted</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>

            <hr />
            <small className="text-secondary">
              <ul className="pl-3">
                <li>MP3 will be generated automatically for masters</li>
                <li>M4A will be generated automatically for masters</li>
                <li>Still will be set as YouTube thumbnail automatically if selected</li>
                <li>Stills will be resized automatically if selected</li>
                <li>Thumbnails will be generated automatically from masters</li>
              </ul>
            </small>
          </div>
        }
      </div>
  }
}

export default NewPublish;
