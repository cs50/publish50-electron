import React, { Component } from 'react'
import Autocomplete from 'react-autocomplete'
import AWS from 'aws-sdk'

import * as log from './log'
import './Metadata.css'

const ipc = window.require('electron').ipcRenderer

let s3Client, Bucket
ipc.send('get preferences')
ipc.once('preferences', (event, prefs) => {
  s3Client = new AWS.S3({
    accessKeyId: prefs.awsCredentials.accessKeyId,
    secretAccessKey: prefs.awsCredentials.secretAccessKey
  })

  Bucket = prefs.s3.bucket
})

let controller = new AbortController()
let signal = controller.signal

class Metadata extends Component {
  constructor(props) {
    super(props)
    this.state = this.getInitialState()
    this.requestTimer = null
  }

  getPrefixes(Prefix) {
    s3Client.listObjectsV2({Bucket, Prefix, MaxKeys: 10, Delimiter: '/'}, (err, data) => {
      if (err) {
        log.error(err)
        this.setState({ prefixes: this.getPrefixes() })
      }
      else {
        this.setState({
          prefixes: data.CommonPrefixes.map((e) => ({ name: e.Prefix }))
        })
      }
    })
  }

  getInitialState() {
    return {
      updateDisabled: true,
      preferences: null,
      prefixes: [],
      prefix: null,
      prefixesMenuOpen: false,
      lastMetadataRequest: null,
      metadata: {
        title: "",
        authors: [],
        youtube: {
          main: "",
          cameras: "",
          screens: ""
        }
      }
    }
  }

  update() {
    this.setState({ updateDisabled: true })
    ipc.send('update metadata', { bucket: Bucket, prefix: this.state.prefix, metadata: this.state.metadata })
  }

  render() {
    return this.state.preferences && (
      <div className="w-75 mx-auto mt-5">
        <label>Location</label>
        <div className="form-group">
          <div className="input-group mb-2">
            <div className="input-group-prepend">
              <div className="input-group-text">{
                  (this.state.preferences.s3.bucket.endsWith('/') &&
                    this.state.preferences.s3.bucket) ||
                    `${this.state.preferences.s3.bucket}/`
              }</div>
            </div>

            <Autocomplete
              wrapperStyle={
                {
                  position: 'relative',
                  display: 'inline-block',
                  flexGrow: '1'
                }
              }

              value={ this.state.prefix }
              items={ this.state.prefixes }
              getItemValue={
                (item) => item.name
              }

              onSelect={
                (prefix, item) => {

                  // Abort current request for fetching metadata (if any)
                  controller.abort()
                  controller = new AbortController()
                  signal = controller.signal

                  this.getPrefixes(prefix)
                  this.setState({
                    prefix,
                    prefixesMenuOpen: document.activeElement.getAttribute('id') === 'prefixInput',
                  })

                  fetch(`https://${this.state.preferences.s3.bucket}/${prefix}metadata.json`, { signal })
                  .then((response) => {
                    if (response.status === 200)
                      return response.json()
                  })
                  .then((metadata) => {
                    if (metadata)
                      this.setState({ metadata })
                  })
                }
              }

              onChange={(event, prefix) => {
                this.getPrefixes(prefix)
                this.setState({ prefix, prefixesMenuOpen: true, updateDisabled: false })
              }}

              open={ this.state.prefixesMenuOpen }

              renderMenu={
                (children) => (
                <div
                  className="border rounded w-100 bg-white"
                  style={ { position: 'absolute', zIndex: 1024 } }>
                    {children}
                  </div>
                )
              }

              renderInput={
                (props) => {
                  return <input
                    { ...props }
                    id="prefixInput"
                    className="form-control"
                    placeholder="2019/x/lectures/0"
                    autoFocus
                    onBlur={ () => this.setState({ prefixesMenuOpen: false }) }
                  />
                }
              }

              renderItem={
                (item, isHighlighted) => (
                  <div
                    key={ item.name }
                    style={ { padding: '8px 12px' } }
                    className={isHighlighted ? 'bg-primary text-white' : 'bg-white'}
                  >
                    { item.name }
                  </div>
                )
              }
            />
          </div>
        </div>

        <div className="form-group">

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
          <label>Author{ (this.state.metadata.authors || []).length > 1 && 's' }</label>
          {
            ((this.state.metadata.authors || []).concat([ "" ])).map((author, index) => {
              return <input
                key={ index }
                value={ author }
                className="form-control mt-2"
                placeholder="John Doe"
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
                    Remove author
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
                onChange={
                  (e) => {
                    const metadata = { ...this.state.metadata }
                    if (typeof(metadata.youtube) !== "object")
                      metadata.youtube = {}

                    let value = e.target.value

                    const matches = value.match(
                      /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
                    )

                    if (matches && matches[2])
                      value = matches[2]

                    metadata.youtube.main = value
                    this.setState({ metadata, updateDisabled: false })
                  }
                }
              />
              <small className="text-muted text-right">YouTube video link or identifier</small>
            </div>
            <div className="col-4">

              <label>Cameras</label>
              <input
                className="form-control"
                placeholder="5azaK2cBKGw"
                value={ this.state.metadata.youtube.cameras }
                onChange={
                  (e) => {
                    const metadata = { ...this.state.metadata }
                    if (typeof(metadata.youtube) !== "object")
                      metadata.youtube = {}

                    metadata.youtube.cameras = e.target.value
                    this.setState({ metadata, updateDisabled: false })
                  }
                }
              />
              <small className="text-muted text-right">YouTube video link or identifier</small>
            </div>
            <div className="col-4">
              <label>Screens</label>
              <input
                className="form-control"
                placeholder="5azaK2cBKGw"
                value={ this.state.metadata.youtube.screens }
                onChange={
                  (e) => {
                    const metadata = { ...this.state.metadata }
                    if (typeof(metadata.youtube) !== "object")
                      metadata.youtube = {}

                    metadata.youtube.screens = e.target.value
                    this.setState({ metadata, updateDisabled: false })
                  }
                }
              />
              <small className="text-muted text-right">YouTube video link or identifier</small>
            </div>

          </div>
        </div>

        <div className="form-group text-right mt-4">
            <button
              type="button"
              className="btn btn-primary"
              disabled={ this.state.updateDisabled }
              onClick={ this.update.bind(this)  }>
                Update
            </button>
          <button className="btn btn-secondary ml-1">Reset</button>
        </div>
      </div>
    )
  }
}

export default Metadata;
