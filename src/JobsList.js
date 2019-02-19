import React from 'react'
import JobDescription from './JobDescription'
import './JobsList.css'

import doneIcon from './assets/images/done.svg'
import clearIcon from './assets/images/abort_all.svg'

class JobsList extends React.Component {
  render() {
    // TODO temporarily remove stalled jobs for now
    // show them in separate tab later?
    const jobs = this.props.jobs.filter((job) => (job.failedReason || '').toLowerCase().indexOf('stalled') < 0)
    return <div>
      <button
        type="button"
        className="clear-all btn"
        title="Clear all"
        onClick={
          () => {
            this.props.onClearAll()
          }
        }>
        <img src={ clearIcon } alt="Clear all" className="clear-all-icon" />
      </button>
      <ul className="list-group job-list">


        {
          jobs.map((job) => {
          const { failedReason, finishedOn, timestamp } = job
          const aborted = failedReason && failedReason === 'ABORTED'
          const type = aborted ? 'secondary' : (failedReason ? 'danger' : finishedOn ? 'success' : 'warning')
          const date = failedReason ? new Date(finishedOn) : new Date(timestamp)
          const subtext = `${aborted ? 'Aborted ' : (failedReason ? 'Failed ' : finishedOn ? 'Finished ' : 'Received ')} on ${date.toLocaleString()}`

            return <li title={ failedReason } className={ `mt-1 list-group-item list-group-item-${type}` } key={ `${job.name}:${job.id}` }>
              <button
                type="button"
                className="close"
                aria-label="Close"
                onClick={
                  (e) => {
                    e.target.setAttribute('disabled', true)
                    this.props.onClose(job)
                  }
                }>
                <span aria-hidden="true">&times;</span>
              </button>
              <div>
                <JobDescription job={ job } />
              </div>
              <small className="text-secondary">
                { subtext }
              </small>
            </li>
          })
        }

        {
          jobs.length < 1 &&
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

export default JobsList;
