import React, { Component } from 'react';
import { Redirect, NavLink, Route, Switch } from 'react-router-dom'

import { Col, Container, Row, Nav } from 'react-bootstrap';

import ActiveJobsList from './ActiveJobsList'
import JobsList from './JobsList'

const { ipc } = window

const initialState = {
  active: [],
  pending: [],
  finished: [],
  modal: {
    show: true,
    message: '',
    buttons: []
  }
}

class Home extends Component {
  constructor(props) {
    super(props)
    this.defaultJobLimit = this.props.defaultJobLimit || 10
    this.state = initialState

    this.jobChanged = this._jobChanged.bind(this)
    this.onActiveJobs = this.onJobs.bind(this, 'active')
    this.onFinishedJobs = this.onJobs.bind(this, 'finished')
    this.onPendingJobs = this.onJobs.bind(this, 'pending')
    this.jobChanged()
    this.interval = setInterval(() => {
      this.jobChanged()
    }, 1000)
  }

  _jobChanged() {
    ['finished', 'pending'].forEach((type) => {
      ipc.send(`get ${type} jobs`, { limit: this.defaultJobLimit })
    })

    ipc.send('get active jobs')
  }

  onJobs(stateKey, event, { jobs }) {
    this.setState({ [stateKey]: jobs })
  }

  componentDidMount() {
    ipc.on('active jobs', this.onActiveJobs)
    ipc.on('finished jobs', this.onFinishedJobs)
    ipc.on('pending jobs', this.onPendingJobs)
  }

  componentWillUnmount() {
    ipc.removeListener('active jobs', this.onActiveJobs)
    ipc.removeListener('finished jobs', this.onFinishedJobs)
    ipc.removeListener('pending jobs', this.onPendingJobs)
    clearInterval(this.interval)
  }

  abort(job, jobDescription) {
    ipc.send('abort job', { job, jobDescription })
  }

  abortAll() {
    ipc.send('abort jobs')
  }

  removeJob(job) {
    ipc.send('remove job', { job })
  }

  onClearAll(type) {
    ipc.send('remove jobs', { type })
  }

  handleClose() {

  }

  render() {
    const active = this.state.active
    const finished = this.state.finished
    const pending = this.state.pending

    return (
      <Container fluid className="mt-3 d-flex">
        <Row className="flex-grow-1">
          <Col sm={8} className="border-right">
            <Nav variant="tabs">
              <NavLink to="" className="nav-link">Running</NavLink>
            </Nav>
            <div className="mt-2">
              <ActiveJobsList jobs={ active } onClose={ this.abort.bind(this) } onAbortAll={ this.abortAll.bind(this) } />
            </div>
          </Col>

          <Col sm={4}>
            <Nav variant="tabs" defaultActiveKey="/home/finished">
              <Nav.Item>
                <NavLink to="/home/finished" className="nav-link">Finished</NavLink>
              </Nav.Item>

              <Nav.Item>
                <NavLink to="/home/pending" className="nav-link">Pending</NavLink>
              </Nav.Item>
            </Nav>
            <div className="mt-2">
                <Switch>
                  <Route
                    path="/home/finished"
                    component={
                      () => {
                        return <JobsList
                          jobs={ finished }
                          onClose={ this.removeJob.bind(this) }
                          onClearAll={ this.onClearAll.bind(this, 'finished') }
                        />
                      }
                    }
                  />

                  <Route path="/home/pending"
                    component={
                      () => {
                        return <JobsList jobs={ pending }
                          onClose={ this.removeJob.bind(this) }
                          onClearAll={ this.onClearAll.bind(this, 'pending') }
                        />
                      }
                    }
                  />

                  <Redirect to="/home/finished" />
                </Switch>
              </div>
          </Col>
        </Row>
      </Container>
    );
  }
}

export default Home;
