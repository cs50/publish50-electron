import React from 'react'
import './JobsList.css'

import { Button, ListGroup } from 'react-bootstrap';
import doneIcon from './assets/images/done.svg'
import clearIcon from './assets/images/abort_all.svg'

import { getJobDescription } from './job_helper'

class JobsList extends React.Component {
  render() {
    // TODO temporarily remove stalled jobs for now
    // show them in separate tab later?
    const jobs = this.props.jobs.filter((job) => (job.failedReason || '').toLowerCase().indexOf('stalled') < 0)
    return <div>
      <Button
        variant="link"
        className="clear-all btn"
        title="Clear all"
        onClick={
          () => {
            this.props.onClearAll()
          }
        }>
        <img src={ clearIcon } alt="Clear all" className="clear-all-icon" />
      </Button>
      <ListGroup className="job-list">
        {
          jobs.map((job) => {
            const { failedReason, finishedOn, timestamp } = job
            const aborted = failedReason && failedReason === 'ABORTED'
            const type = aborted ? 'secondary' : (failedReason ? 'danger' : finishedOn ? 'success' : 'warning')
            const date = failedReason ? new Date(finishedOn) : new Date(timestamp)
            const subtext = `${aborted ? 'Aborted ' : (failedReason ? 'Failed ' : finishedOn ? 'Finished ' : 'Received ')} ${date.toLocaleString()}`
            return <ListGroup.Item className="mt-1" title={failedReason} variant={type} key={`${job.name}:${job.id}`}>
              <Button
                variant="link"
                className="close"
                aria-label="Close"
                onClick={
                  (e) => {
                    e.target.setAttribute('disabled', true)
                    this.props.onClose(job)
                  }
                }>
                <span aria-hidden="true">&times;</span>
              </Button>
              <div>
                {getJobDescription(job)}
              </div>
              <small className="text-secondary">
                { subtext }
              </small>

            </ListGroup.Item>
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
      </ListGroup>
    </div>
  }
}

export default JobsList;
