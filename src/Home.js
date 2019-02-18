import React, { Component } from 'react';
import { Redirect, NavLink, Route, Switch } from 'react-router-dom'

import JobList from './JobList'

const { ipc } = window

const initialState = {
  active: [],
  pending: [],
  finished: []
}

class Home extends Component {
  constructor(props) {
    super(props)
    this.defaultJobLimit = this.props.defaultJobLimit || 10
    this.state = initialState

    this.handleFinishedJobs = this._handleJobs.bind(this, 'finished')
    this.handlePendingJobs = this._handleJobs.bind(this, 'pending')
    this.jobFinished = this._jobFinished.bind(this)
    this.jobStarted = this._jobStarted.bind(this)
    this.pendingJobChanged = this._jobChanged.bind(this, 'pending')
    this.jobProgress = this._jobProgress.bind(this)

    const types = [
      // {
      //   name: 'active',
      //   handler: this.handleActiveJobs
      // },
      {
        name: 'pending',
        handler: this.handlePendingJobs,
      },
      {
        name: 'finished',
        handler: this.handleFinishedJobs
      }
    ]

    types.forEach((type) => this.getJobs(type.name, type.handler))
  }

  findJobIndex(job, ls) {
    return ls.findIndex((job_) => job_.id === job.id && job_.name === job.name)
  }

  resetState() {
    this.setState(initialState)
  }

  _jobFinished(event, { job }) {
    const active = [ ...this.state.active ]
    const i = this.findJobIndex(job, active)

    if (i > -1)
      active.splice(i, 1)

    this.setState({ active }, () => this._jobChanged(job, 'finished'))
  }

  _jobChanged(job, stateKey) {
    ipc.send('get job', { job })
    ipc.once('job', (event, job) => {
      let jobs = this.state[stateKey]
      const i = this.findJobIndex(job, jobs)
      if (i > -1)
        jobs[i] = job
      else
        jobs = [ job, ...jobs ]

      if (jobs.length > this.defaultJobLimit)
        jobs = jobs.slice(0, this.defaultJobLimit)

      this.setState({
        [stateKey]: jobs
      })
    })
  }

  _handleJobs(key, event, data) {
    this.setState({ [key]: data.jobs })
  }


  getJobs(type, callback) {
    ipc.send(`get ${type} jobs`, { limit: this.defaultJobLimit })
    ipc.once(`${type} jobs`, callback)
  }

  _jobStarted(event, { job }) {
    const pending = [ ...this.state.pending ]
    const i = this.findJobIndex(job, pending)

    if (i > -1)
      pending.splice(i, 1)

    this.setState({ pending }, () => this._jobChanged(job, 'active'))
  }

  _jobProgress(event, data) {
    const { job } = data
    const active = this.state.active
    const i = this.findJobIndex(job, active)
    if (i < -1) {
      active.push(job)
    }
    else {
      active[i] = job
    }

    this.setState({ active })
  }

  componentDidMount() {
    ipc.on('job succeeded', this.jobFinished)
    ipc.on('job failed', this.jobFinished)
    ipc.on('job started', this.jobStarted)

    ipc.on('job pending', this.pendingJobChanged)
    ipc.on('job progress', this.jobProgress)
  }

  componentWillUnmount() {
    ipc.removeListener('finished jobs', this.handleFinishedJobs)
    ipc.removeListener('pending jobs', this.handlePendingJobs)
    ipc.removeListener('job succeeded', this.jobFinished)
    ipc.removeListener('job failed', this.jobFinished)
    ipc.removeListener('job started', this.jobStarted)
    ipc.removeListener('job pending', this.pendingJobChanged)
    ipc.removeListener('job progress', this.jobProgress)
  }

  abort(job) {
    ipc.send('abort job', { job })
  }

  render() {
    const finished = this.state.finished
    const pending = this.state.pending
    return (
        <div className="mt-3 d-flex w-100 p-3">
          <div className="row flex-grow-1">
            <div className="col-8 border-right">
              <ul className="nav nav-tabs">
                <li className="nav-item">
                  <button className="btn btn-link nav-link active">Running</button>
                </li>
              </ul>
              <div className="mt-2 border-right"></div>
            </div>
            <div className="col-4">
              <ul className="nav nav-tabs">
                <li className="nav-item">
                  <NavLink to="/home/finished" className="nav-link">Finished</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/home/pending" className="nav-link">Pending</NavLink>
                </li>
              </ul>
              <div className="mt-2">
                <Switch>
                  <Route path="/home/finished" component={ () => { return <JobList jobs={ finished } /> } } />
                  <Route path="/home/pending" component={ () => { return <JobList jobs={ pending } /> } } />
                  <Redirect to="/home/finished" />
                </Switch>
              </div>
            </div>
          </div>
        </div>
    );
  }
}

export default Home;
