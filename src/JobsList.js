import React from 'react'
import JobDescription from './JobDescription'
import './JobsList.css'

import doneIcon from './assets/images/done.svg'

class JobsList extends React.Component {
  render() {
    return <ul className="list-group job-list">
      {
        this.props.jobs.map((job) => {
          const type = job.failedReason ? 'danger' : job.finishedOn ? 'success' : 'warning'
          const subtext = job.finishedOn ?
            `${(job.failedReason ? 'Failed ' : 'Finished ')} at ${new Date(job.finishedOn).toLocaleString()}` :
            `Received at ${new Date(job.timestamp).toLocaleString()}`
          return <li className={ `mt-1 list-group-item list-group-item-${type}` } key={ `${job.name}:${job.id}` }>
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
        this.props.jobs.length < 1 &&
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
  }
}

export default JobsList;
