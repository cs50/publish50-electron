import React, { Component } from 'react';

import * as path from 'path'

const initialState = {
  active: [],
  pending: [],
  finished: []
}

function truncate (s) {
  // cccccc...ccccccccc
  if (s.length > 18)
    return `${s.substring(0, 6)}...${s.substring(s.length - 9)}`
}

const ipc = window.require('electron').ipcRenderer

function jobDescription(job) {
  switch(job.name) {
    case 'resize still':
      return (
        <div>
          Resize <span title={ job.data.imagePath }>
            '{ truncate(job.data.imagePath) }'
          </span> to '{ job.data.raster }'
        </div>
      )

    case 'transcode':
      if (job.data.format) {
        return <div>Transcode <span
          title={ job.data.videoPath }>
          { truncate(job.data.videoPath) }
        </span> to { job.data.format } { job.data.raster && `(${job.data.raster})` }</div>
      }

      return <div>Generate thumbnails for <span
        title={ job.data.videoPath }>
        { truncate(job.data.videoPath) }
        </span>
      </div>

    case 'update metadata':
      return <div>Update { truncate(path.join(job.data.bucket, job.data.prefix, 'metadata.json')) }</div>

    default:
      return <div>Unknown job</div>
  }
}

class Home extends Component {
  constructor(props) {
    super(props)
    this.defaultJobLimit = this.props.defaultJobLimit || 10
    this.state = initialState
    ipc.send('get finished jobs', { limit: this.defaultJobLimit })
    ipc.on('finished jobs', (event, data) => {
      this.setState({ finished: data.jobs })
    })

    ipc.send('get pending jobs', { limit: this.defaultJobLimit })
    ipc.on('pending jobs', (event, data) => {
      this.setState({ pending: data.jobs })
    })

    ipc.send('get active jobs')
    ipc.on('active jobs', (event, data) => this.setState({ active: data.jobs }))
  }

  findJobIndex(job, ls) {
    return ls.findIndex((job_) => job_.id === job.id && job_.name === job.name)
  }

  resetState() {
    this.setState(initialState)
  }

  jobFinished(job) {
    const active = [ ...this.state.active ]
    const i = this.findJobIndex(job, active)

    if (i > -1)
      active.splice(i, 1)

    this.setState({ active }, () => this.jobChanged(job, 'finished'))
  }

  jobChanged(job, stateKey) {
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

  jobStarted(job) {
    const pending = [ ...this.state.pending ]
    const i = this.findJobIndex(job, pending)

    if (i > -1)
      pending.splice(i, 1)

    this.setState({ pending }, () => this.jobChanged(job, 'active'))
  }

  componentDidMount() {
    ipc.on('job succeeded', (event, data) => this.jobFinished(data.job))
    ipc.on('job failed', (event, data) => this.jobFinished(data.job))
    ipc.on('job started', (event, data) => this.jobStarted(data.job))

    ipc.on('job pending', (event, data) => this.jobChanged(data.job, 'pending'))
    ipc.on('job progress', (event, data) => {
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
    })
  }

  componentWillUnmount() {
    [
      'finished jobs',
      'job failed',
      'job pending',
      'job progress',
      'job started',
      'job succeeded',
      'pending jobs',
      'active jobs'
    ]
    .forEach((event) => ipc.removeAllListeners(event))
  }

  abort(job) {
    ipc.send('abort job', { job })
  }

  render() {
    const active = this.state.active
    const pending = this.state.pending
    const finished = this.state.finished
    return (
      <div className="mt-3 container-fluid">
        <div className="row">
          <div className="col-lg">
            <div className="row">
              <div className="col">
                <h3>Running</h3>
              </div>
              <div className="col text-right">
                { active.length > 0 &&
                  <button type="button" className="btn btn-link btn-sm">Stop all</button> }
              </div>
            </div>
            <div id="active">
              <ul className="list-group">
                {
                  active.filter((job) => job._progress).map((job) => {
                    return (
                      <li className="list-group-item py-3 mt-1" key={ `${job.name}:${job.id}` }>
                        <button type="button" className="close" aria-label="Close" onClick={ this.abort.bind(this, job) }>
                          <span aria-hidden="true">&times;</span>
                        </button>
                        <div className="mb-1">{ jobDescription(job) }</div>
                        <div className="progress mt-3">
                          <div
                            className="progress-bar bg-success"
                            role="progressbar"
                            style={ {width: `${job._progress}%`} }
                            aria-valuenow={ job._progress }
                            aria-valuemin="0"
                            aria-valuemax="100"
                          >
                            { job._progress }%
                          </div>
                        </div>

                        <small className="mt-2 class text-muted">
                          Started at {  new Date(job.processedOn).toLocaleString() }
                        </small>
                      </li>
                    )
                  })
                }
              </ul>
              {
                active < 1 &&
                  <div className="text-muted mt-3 text-center">Nothing running</div>
              }
            </div>
          </div>
          <div className="col-lg">
            <div className="mt-sm-5 mt-lg-0">
              <div>
                <div className="row">
                  <div className="col">
                    <h3>Finished</h3>
                  </div>
                  <div className="col text-right">
                    { finished.length > 0 &&
                    <button type="button" className="btn btn-link btn-sm">Remove all</button> }
                  </div>
                </div>
              </div>
              <div id="finished">
                <ul className="list-group">
                  {
                    finished.map((job) => {
                      return (
                        <li
                          className={
                            `mt-1 list-group-item list-group-item-${job.failedReason ? 'danger' : 'success'}`
                          }
                          key={ `${job.name}:${job.id}` }
                          title={ job.failedReason }
                        >
                          <div>{ jobDescription(job) }</div>
                          <small
                            className="text-dark"
                          >
                            { (job.finishedOn &&
                              `Finished at ${new Date(job.finishedOn).toLocaleString()}`) || 'STALLED'}
                          </small>
                        </li>
                      )
                    })
                  }
                </ul>

                {
                  finished.length < 1 &&
                    <div className="text-muted mt-3 text-center">Nothing finished</div>
                }
              </div>

            </div>
            <div className="mt-3">
              <h3>Scheduled</h3>
              <div id="scheduled">
                <ul className="list-group">
                  {
                    pending.map((job) => {
                      return (
                        <li
                          className="list-group-item list-group-item-warning"
                          key={ `${job.name}:${job.id}` }
                        >
                          { jobDescription(job) }
                          <small className="mt-2 class text-muted">
                            Received at {  new Date(job.timestamp).toLocaleString() }
                          </small>
                        </li>
                      )
                    })
                  }
                </ul>

                {
                  this.state.pending.length < 1&&
                    <div className="text-muted mt-3 text-center">Nothing scheduled</div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Home;
