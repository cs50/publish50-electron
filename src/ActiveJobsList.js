import React from 'react'

import { Button, ListGroup, ProgressBar } from 'react-bootstrap';

import './ActiveJobsList.css'
import abortAllIcon from './assets/images/abort_all.svg'
import doneIcon from './assets/images/done.svg'

import { getJobDescription } from './job_helper'

class ActiveJobsList extends React.Component {
  render() {
    const progressJobs = this.props.jobs.filter((job) => job._progress)
    return <div>
      <Button
        className="abort-all"
        title="Abort all"
        variant="link"
        onClick={
          () => this.props.onAbortAll()
        }
      >
        <img src={ abortAllIcon } alt="Abort all" />
      </Button>

      <ListGroup>
        {
          progressJobs.map((job) => {
            const jobDescription = getJobDescription(job);
            return <ListGroup.Item className="mt-2 border" key={ `${job.name}:${job.id}` }>
              <Button
                className="close"
                aria-label="Close"
                onClick={
                  (e) => {
                    e.target.setAttribute('disabled', true)
                    this.props.onClose(job, jobDescription)
                  }
                }>
                <span aria-hidden="true">&times;</span>
              </Button>
              <div>
                {jobDescription}
              </div>

              <ProgressBar className="mt-3" variant="success" now={job._progress} label={`${job._progress}%`} />
              <small className="text-secondary">
                Started { new Date(job.processedOn).toLocaleString() }
              </small>
            </ListGroup.Item>;
          })
        }
      </ListGroup>
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
    </div>
  }
}

export default ActiveJobsList;
