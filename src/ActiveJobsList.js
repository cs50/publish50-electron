import React from 'react'

import './ActiveJobsList.css'
import abortAllIcon from './assets/images/abort_all.svg'
import doneIcon from './assets/images/done.svg'

import { getJobDescription } from './job_helper'

class ActiveJobsList extends React.Component {
  render() {
    const progressJobs = this.props.jobs.filter((job) => job._progress)
    return <div>
      <button
        type="button"
        className="abort-all btn"
        title="Abort all"
        onClick={
          () => {
            this.props.onAbortAll()
          }
        }
      >
        <img src={ abortAllIcon } alt="Abort all" />
      </button>

      <ul className="list-group">
        {
          progressJobs.map((job) => {
            const jobDescription = getJobDescription(job)
            return <li className="mt-2 list-group-item" key={ `${job.name}:${job.id}` }>
              <button
                type="button"
                className="close"
                aria-label="Close"
                onClick={
                  (e) => {
                    e.target.setAttribute('disabled', true)
                    this.props.onClose(job, jobDescription)
                  }
                }>
                <span aria-hidden="true">&times;</span>
              </button>
              <div>
                {jobDescription}
              </div>

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

              <small className="text-secondary">
                Started on { new Date(job.processedOn).toLocaleString() }
              </small>
            </li>
          })
        }

        {
          progressJobs.length < 1 &&
            <img
              style={
                {
                  width: '64px',
                  position: 'absolute',
                  top: '30%',
                  left: '50%',
                  marginLeft: '-24px',
                  opacity: '0.3'
                }
              }
              src={doneIcon}
              alt='No jobs'
            />
        }
      </ul>
    </div>
  }
}

export default ActiveJobsList;
