import React, { Component } from 'react';

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
          Resize <span data-toggle="tooltip" data-placement="left" title={ job.data.imagePath }>
            '{ truncate(job.data.imagePath) }'
          </span> to '{ job.data.raster }'
        </div>
      )

    case 'generate thumbnails':
      return <div>Generate thumbnails for <span>{ truncate(job.data.videoPath) }</span></div>

    case 'transcode to mp3':
      return <div>Transcode <span>{ truncate(job.data.videoPath) }</span> to mp3</div>

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

  resetState() {
    this.setState(initialState)
  }

  jobChanged(job, stateKey) {
    // this.jobFinishied(job)
    job = ipc.sendSync('get job', { jobId: job.id })
    let jobs = [ job, ...this.state[stateKey]]
    if (jobs.length > this.defaultJobLimit)
      jobs = jobs.slice(0, this.defaultJobLimit)

    this.setState({
      [stateKey]: jobs
    })
  }

  componentDidMount() {
    ipc.on('job succeeded', (event, data) => this.jobChanged(data.job, 'finished'))
    ipc.on('job failed', (event, data) => this.jobChanged(data.job, 'finished'))

    ipc.on('job pending', (event, data) => this.jobChanged(data.job, 'pending'))
    ipc.on('job progress', (event, data) => {
      const { job } = data
      const activeJobs = this.state.active
      const i = activeJobs.findIndex((job_) => job_.id === job.id)
      if (i < -1) {
        activeJobs.push(job)
      }
      else {
        activeJobs[i] = job
      }

      this.setState({
        active: activeJobs
      })
    })
  }

  componentWillUnmount() {
    [
      'finished jobs',
      'job failed',
      'job progress',
      'job succeeded',
      'pending jobs',
      'active jobs'
    ]
    .forEach((event) => ipc.removeAllListeners(event))
  }

  render() {
    const activeJobs = this.state.active
    const pendingJobs = this.state.pending
    const finishedJobs = this.state.finished
    return (
      <div className="mt-3">
        <div className="row">
          <div className="col-lg">
            <h3>Running</h3>
            <div id="active">
              <ul className="list-group">
                {
                  activeJobs.filter((job) => job._progress).map((job) => {
                    return (
                      <li className="list-group-item" key={ job.id }>
                        <div className="mb-1">{ jobDescription(job) }</div>
                        <div className="progress">
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
                      </li>
                    )
                  })
                }
              </ul>
              {
                activeJobs < 1 &&
                  <div className="text-muted mt-3 text-center">Nothing running</div>
              }
            </div>
          </div>
          <div className="col-lg">
            <div className="mt-sm-5 mt-lg-0 mb-5">
              <div>
                <h3>Finished</h3>
              </div>
              <div id="finished">
                <ul className="list-group">
                  {
                    finishedJobs.map((job) => {
                      console.log(job)
                      return (
                        <li
                          className={
                            `list-group-item list-group-item-${job.failedReason ? 'danger' : 'success'}`
                          }
                          key={job.id}
                          data-toggle="tooltip"
                          data-placement="left"
                          title={ job.failedReason }
                        >
                          <div>{ jobDescription(job) }</div>
                          <small
                            className="text-dark"
                          >
                            ({ job.id }) { (job.finishedOn && new Date(job.finishedOn).toLocaleString()) || 'STALLED'}
                          </small>
                        </li>
                      )
                    })
                  }
                </ul>

                {
                  finishedJobs.length < 1 &&
                    <div className="text-muted mt-3 text-center">Nothing finished</div>
                }
              </div>

            </div>
            <div className="mt-5">
              <h3>Pending</h3>
              <div id="pending">
                <ul className="list-group">
                  {
                    pendingJobs.map((job) => {
                      return (
                        <li
                          className="list-group-item list-group-item-warning"
                          key={ job.id }
                        >
                          { jobDescription(job) }
                        </li>
                      )
                    })
                  }
                </ul>

                {
                  this.state.pending.length < 1&&
                    <div className="text-muted mt-3 text-center">Nothing pending</div>
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
