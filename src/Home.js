import React, { Component } from 'react';
import { Redirect, NavLink, Route, Switch } from 'react-router-dom'

import ActiveJobsList from './ActiveJobsList'
import JobsList from './JobsList'

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

    this.jobChanged = this._jobChanged.bind(this)
    this.onActiveJobs = this.onJobs.bind(this, 'active')
    this.onFinishedJobs = this.onJobs.bind(this, 'finished')
    this.onPendingJobs = this.onJobs.bind(this, 'pending')
    this.jobChanged()
    this.interval = setInterval(() => {
      this.jobChanged()
    }, 5000)
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
    // ['succeeded', 'failed', 'started', 'pending', 'progress'].forEach(
    //   (event) => ipc.on(`job ${event}`, this.jobChanged)
    // )

    ipc.on('active jobs', this.onActiveJobs)
    ipc.on('finished jobs', this.onFinishedJobs)
    ipc.on('pending jobs', this.onPendingJobs)
  }

  componentWillUnmount() {
    // ['succeeded', 'failed', 'started', 'pending', 'progress'].forEach((event) => {
    //   ipc.removeListener(`job ${event}`, this.jobChanged)
    // })

    ipc.removeListener('active jobs', this.onActiveJobs)
    ipc.removeListener('finished jobs', this.onFinishedJobs)
    ipc.removeListener('pending jobs', this.onPendingJobs)
    clearInterval(this.interval)
  }

  abort(job) {
    ipc.send('abort job', { job })
  }

  render() {
    const active = this.state.active
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
              <div className="mt-2">
                <ActiveJobsList jobs={ active } />
              </div>
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
                  <Route path="/home/finished" component={ () => { return <JobsList jobs={ finished } /> } } />
                  <Route path="/home/pending" component={ () => { return <JobsList jobs={ pending } /> } } />
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
