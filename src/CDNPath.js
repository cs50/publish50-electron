import React, { Component } from 'react'
import Autocomplete from 'react-autocomplete'
import AWS from 'aws-sdk'

import * as logger from './logger'
import './CDNPath.css'

let controller = new AbortController()
let signal = controller.signal

class CDNPath extends Component {
  constructor(props) {
    super(props)
    this.state = this.getInitialState()
    this.s3Client = new AWS.S3(this.props.awsCredentials)

    if (!this.props.onSelect)
      this.props.onSelect = ((prefix) => {})
  }

  getPrefixes(Prefix) {
    this.s3Client.listObjectsV2(
      {
        Bucket: this.props.bucket,
        Prefix,
        MaxKeys: 10,
        Delimiter: '/'
      },
      (err, data) => {
        if (err) {
          logger.error(err.toString())
          this.props.onError(err.toString())
        }
        else {
          this.setState({
            prefixes: data.CommonPrefixes.map((e) => ({ name: e.Prefix }))
          })
        }
      }
    )
  }

  getInitialState() {
    return {
      prefixes: [],
      prefix: this.props.prefix || '',
      prefixesMenuOpen: false
    }
  }

  render() {
    const { bucket } = this.props
    return <div className="form-group">
      <div className="input-group mb-2">
        <div className="input-group-prepend">
          <div className="input-group-text">{
              (bucket.endsWith('/') &&
                bucket) ||
                `${bucket}/`
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
              this.props.onSelect(prefix)

              // Abort current request for fetching metadata (if any)
              controller.abort()
              controller = new AbortController()
              signal = controller.signal

              this.getPrefixes(prefix)
              this.setState({
                prefix,
                prefixesMenuOpen: document.activeElement.getAttribute('id') === 'prefixInput',
              })

              fetch(`https://${bucket}/${prefix}metadata.json`, { signal })
              .then((response) => {
                if (response.status === 200)
                  return response.json()
              })
              .then((metadata) => {
                if (metadata)
                  this.props.onData(metadata)
              })
            }
          }

          onChange={(event, prefix) => {
            this.getPrefixes(prefix)
            this.setState({ prefix, prefixesMenuOpen: true })
          }}

          open={ this.state.prefixesMenuOpen }

          renderMenu={
            (children) => (
            <div
              className="border rounded w-100 bg-white"
              style={ { position: 'absolute', zIndex: 1024 } }
            >
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
                value={ this.state.prefix }
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
  }
}

export default CDNPath;
