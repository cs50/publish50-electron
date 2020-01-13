import React, { Component } from 'react'

import CDNPath from './CDNPath'
import './Metadata.css'

const { ipc } = window

class Metadata extends Component {
  constructor(props) {
    super(props)
    this.state = this.getInitialState()

    this.handlePreferences = this._handlePreferences.bind(this)

    ipc.once('preferences', this.handlePreferences)
    ipc.send('get preferences', {
      preferences: [
        'awsCredentials',
        's3'
      ]
    })
  }

  _handlePreferences(event, preferences) {
    this.setState({ loading: false, preferences, prefix: preferences.s3.prefix })
  }

  getInitialMetadata() {
    return {
      title: "",
      authors: [],
      youtube: {
        main: "",
        cameras: "",
        screens: ""
      }
    }
  }

  onYoutubeIDChange(e) {
    const metadata = { ...this.state.metadata }
    if (typeof(metadata.youtube) !== "object")
      metadata.youtube = {}

    let value = e.target.value

    const matches = value.match(
      /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    )

    if (matches && matches[2])
      value = matches[2]

    metadata.youtube[e.target.name] = value
    this.setState({ metadata, updateDisabled: false })
  }

  getInitialState() {
    return {
      loading: true,
      updateDisabled: true,
      preferences: {
        awsCredentials: {
          accessKeyId: '',
          secretAccessKey: ''
        },
        s3: {
          bucket: '',
          prefix: ''
        }
      },
      metadata: this.getInitialMetadata()
    }
  }

  update() {
    this.setState({ updateDisabled: true })
    ipc.send(
      'update metadata',
      {
        bucket: this.state.preferences.s3.bucket,
        prefix: this.state.prefix,
        metadata: this.state.metadata
      }
    )
  }

  componentWillUnmount() {
    ipc.removeListener('preferences', this.handlePreferences)
  }

  render() {
    const { awsCredentials, s3 } = this.state.preferences
    return !this.state.loading && (
      <div className="w-75 mx-auto mt-5">
        { ((!this.state.preferences || !s3 || !s3.bucket) &&
        <div className="alert alert-danger" role="alert">Missing CDN bucket.</div>) ||
        <div>
          { this.state.s3ClientError &&
            <div
            className="alert alert-danger"
            role="alert">
              Could not list paths. { this.state.s3ClientError.toString() }.
            </div>
          }

          <label>Location</label>
          <CDNPath
            awsCredentials={ awsCredentials }
            bucket={ s3.bucket } i
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
            <div className="row">
              <div className="col-4">
                <label>Main</label>
                <input
                  className="form-control"
                  placeholder="5azaK2cBKGw"
                  value={ this.state.metadata.youtube.main }
                  onChange={ this.onYoutubeIDChange }
                />
                <small className="text-muted text-right">YouTube video link or identifier</small>
              </div>
              <div className="col-4">

                <label>Cameras</label>
                <input
                  className="form-control"
                  placeholder="5azaK2cBKGw"
                  value={ this.state.metadata.youtube.cameras }
                  onChange={ this.onYoutubeIDChange }
                />
                <small className="text-muted text-right">YouTube video link or identifier</small>
              </div>
              <div className="col-4">
                <label>Screens</label>
                <input
                  className="form-control"
                  placeholder="5azaK2cBKGw"
                  value={ this.state.metadata.youtube.screens }
                  onChange={ this.onYoutubeIDChange }
                />
                <small className="text-muted text-right">YouTube video link or identifier</small>
              </div>

            </div>
          </div>

          <div className="form-group text-right mt-4">
              <button
                type="button"
                className={ `btn btn-${ this.state.updateDisabled ? 'success' : 'primary' }` }
                disabled={ this.state.updateDisabled }
                onClick={ this.update.bind(this)  }>
                  Update
              </button>
            <button className="btn btn-secondary ml-1">Reset</button>
          </div>
      </div>}
      </div>
    )
  }
}

export default Metadata;
