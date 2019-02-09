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

  jobFinished(job) {
    const activeJobs = [ ...this.state.active ]
    const i = activeJobs.findIndex((job_) => job_.id === job.id)

    if (i > -1)
      activeJobs.splice(i, 1)

    this.setState({
      active: activeJobs
    })

    this.jobChanged(job, 'finished')
  }

  jobChanged(job, stateKey) {
    job = ipc.sendSync('get job', { job })
    let jobs = [ job, ...this.state[stateKey]]
    if (jobs.length > this.defaultJobLimit)
      jobs = jobs.slice(0, this.defaultJobLimit)

    this.setState({
      [stateKey]: jobs
    })
  }

  componentDidMount() {
    ipc.on('job succeeded', (event, data) => this.jobFinished(data.job))
    ipc.on('job failed', (event, data) => this.jobFinished(data.job))

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
      'job pending',
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
                      <li className="list-group-item py-3 mt-1" key={ job.id }>
                        <button type="button" className="close" aria-label="Close">
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
                activeJobs < 1 &&
                  <div className="text-muted mt-3 text-center">Nothing running</div>
              }
            </div>
          </div>
          <div className="col-lg">
            <div className="mt-sm-5 mt-lg-0">
              <div>
                <h3>Finished</h3>
              </div>
              <div id="finished">
                <ul className="list-group">
                  {
                    finishedJobs.map((job) => {
                      return (
                        <li
                          className={
                            `mt-1 list-group-item list-group-item-${job.failedReason ? 'danger' : 'success'}`
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
                            { (job.finishedOn &&
                              `Finished at ${new Date(job.finishedOn).toLocaleString()}`) || 'STALLED'}, ID { job.id }
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
            <div className="mt-3">
              <h3>Scheduled</h3>
              <div id="scheduled">
                <ul className="list-group">
                  {
                    pendingJobs.map((job) => {
                      return (
                        <li
                          className="list-group-item list-group-item-warning"
                          key={ job.id }
                        >
                          { jobDescription(job) }
                          <small className="mt-2 class text-muted">
                            Started at {  new Date(job.timestamp).toLocaleString() }
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
