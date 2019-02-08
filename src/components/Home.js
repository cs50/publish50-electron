import React, { Component } from 'react';

const initialState = {
  running: {},
  pending: {},
  finished: {}
}

function truncate (s) {
  // cccccc...ccccccccc

  if (s.length > 18)
    return `${s.substring(0, 6)}...${s.substring(s.length - 9)}`

  // return s
}

const ipcRenderer = window.require('electron').ipcRenderer

function jobDescription(job) {
  switch(job.name) {
    case 'resize still':
      console.log(job.data.imagePath)
      return `Resize '${truncate(job.data.imagePath)}' to '${job.data.raster}' (id ${job.id})`
    default:
      break
  }
}

class Home extends Component {
  constructor(props) {
    super(props)
    this.defaultJobLimit = this.props.defaultJobLimit || 10
    this.state = initialState
    ipcRenderer.send('get finished jobs', { limit: this.defaultJobLimit })
    ipcRenderer.on('finished jobs', (event, data) => {
      this.setState({
        finished: data.jobs
      })
    })
  }

  resetState() {
    this.setState(initialState)
  }

  jobFinished(event, data) {
    const job = data.job
    if (data.err)
      job._err = data.err

    const finishedJobs = { ...this.state.finished, [data.job.id]: data.job }
    if (Object.keys(finishedJobs).length > this.props.finishedJobsLimit || this.defaultJobLimit)


    this.setState({
      finished: { ...this.state.finished,  }
    })
  }

  componentDidMount() {
    ipcRenderer.on('job succeeded', this.jobFinished.bind(this))
    ipcRenderer.on('job failed', this.jobFinished.bind(this))
  }

  componentWillUnmount() {
    [
      'finished jobs',
      'job succeeded',
      'job failed',
      'get finished jobs',
      'get active jobs',
      'get waiting jobs'
    ]
    .forEach((event) => ipcRenderer.removeAllListeners(event))
  }

  render() {

    const finishedJobs = this.state.finished
    return (
      <div className="mt-3">
        <div className="row">
          <div className="col-lg">
            <h3>Running</h3>
            <div id="running">
              {
              Object.keys(this.state.running) < 1 &&
                <div className="text-muted mt-3 text-center">Nothing running</div>
              }
            </div>
          </div>
          <div className="col-lg">
            <div className="mb-5">
              <div>
              <h3>Finished</h3>
            </div>
              <div id="finished">
                <ul className="list-group">
                  {
                    Object.keys(finishedJobs).map((jobId) => {
                      return (
                        <li
                          className={ `list-group-item list-group-item-${finishedJobs[jobId]._err || finishedJobs[jobId].failedReason ? 'danger' : 'success'}` }
                          key={jobId}
                        >
                          { jobDescription(finishedJobs[jobId]) }
                        </li>
                      )
                    })
                  }
                </ul>

                {
                  Object.keys(finishedJobs).length < 1 &&
                    <div className="text-muted mt-3 text-center">Nothing finished</div>
                }
              </div>

            </div>
            <div className="mt-5">
              <h3>Pending</h3>
              <div id="pending">
                {
                  Object.keys(this.state.pending).length < 1&&
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
