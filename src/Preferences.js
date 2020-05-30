import React, { Component } from 'react';

import {Button, Col, Container, Row} from 'react-bootstrap';
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
      <Container fluid className="mt-3">
        <h6 className="text-dark border-bottom pb-2">General</h6>
        <Row>
          <Col>
            <label htmlFor="redisPort"><small className="text-muted">Redis port</small></label>
          </Col>
          <Col>
            <input
              id="redisPort"
              className="form-control form-control-sm"
              type="number"
              min="1"
              max="65535"
              onChange={ this.onChange.bind(this, 'general.redisPort') }
              value={ this.state.preferences.general.redisPort }
            />
          </Col>
        </Row>

        <h6 className="text-dark border-bottom pb-2">Credentials</h6>
        <Row>
          <Col>
            <div>
              <label htmlFor="awsAccessKeyId"><small className="text-muted">AWS access key ID</small></label>
            </div>

            <div>
              <label htmlFor="awsSecretAccessKey"><small className="text-muted">AWS secret access key</small></label>
            </div>
          </Col>
          <Col>
            <div>
              <input
                id="awsAccessKeyId"
                className="form-control form-control-sm"
                value={ this.state.preferences.awsCredentials.accessKeyId }
                onChange={ this.onChange.bind(this, 'awsCredentials.accessKeyId') }
              />
            </div>
            <div>
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
                      <Button
                        className="pl-2"
                        size="sm"
                        onClick={this.setAwsSecretAccessKey.bind(this) }>
                          Change
                      </Button>
                    </div>
                )
              }
            </div>
          </Col>
        </Row>

        <h6 className="text-dark border-bottom pb-2">CDN</h6>
        <Row>
          <Col>
            <div>
              <label><small className="text-muted">Bucket</small></label>
            </div>
            <div>
              <label><small className="text-muted">Prefix</small></label>
            </div>
            <div>
              <label><small className="text-muted">Region</small></label>
            </div>
            <div>
              <label><small className="text-muted">Role ARN</small></label>
            </div>
            <div>
              <label><small className="text-muted">Role session name</small></label>
            </div>
            <div>
              <label><small className="text-muted">CloudFront Distribution ID</small></label>
            </div>
          </Col>

          <Col>
            <div>
              <input
                className="form-control"
                onChange={ this.onChange.bind(this, 's3.bucket') }
                value={ this.state.preferences.s3.bucket }
              />
            </div>
            <div>
              <input
                className="form-control"
                onChange={ this.onChange.bind(this, 's3.prefix') }
                value={ this.state.preferences.s3.prefix }
              />
            </div>
            <div>
              <input
                className="form-control"
                onChange={ this.onChange.bind(this, 's3.region') }
                value={ this.state.preferences.s3.region }
              />
            </div>
            <div>
              <input
                className="form-control"
                onChange={ this.onChange.bind(this, 's3.roleArn') }
                value={ this.state.preferences.s3.roleArn }
              />
            </div>
            <div>
              <input
                className="form-control"
                onChange={ this.onChange.bind(this, 's3.roleSessionName') }
                value={ this.state.preferences.s3.roleSessionName }
              />
            </div>
            <div>
              <input
                className="form-control"
                onChange={ this.onChange.bind(this, 'cloudfront.distributionId') }
                value={ this.state.preferences.cloudfront.distributionId }
              />
            </div>
          </Col>
        </Row>


        <h6 className="text-dark border-bottom pb-2">About</h6>
        <Row>
          <Col>
            <div>
              <label><small className="text-muted">Version</small></label>
            </div>
          </Col>
          <Col>
            <div>
              <small>{ this.state.preferences.about.version }</small>
            </div>
          </Col>
        </Row>

        <div className="text-right my-4">
          <Button
            variant={this.state.disableSave ? 'success' : 'primary'}
            disabled={ this.state.disableSave }
            onClick={ this.save.bind(this) }>
              Save
          </Button>
          <Button
            variant="secondary"
            className="ml-1"
            onClick={ () => ipc.send('reset preferences') }>
              Reset Defaults
          </Button>
        </div>
      </Container>
    );
  }
}

export default Preferences;
