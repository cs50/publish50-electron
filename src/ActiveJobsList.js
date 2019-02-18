import React from 'react'
import JobDescription from './JobDescription'

import doneIcon from './assets/images/done.svg'

class ActiveJobsList extends React.Component {
  render() {
    return <ul className="list-group">
      {
        this.props.jobs.map((job) => {
          return <li className="mt-2 list-group-item" key={ `${job.name}:${job.id}` }>
            <div>
              <JobDescription job={ job } />
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
              Started at { new Date(job.processedOn).toLocaleString() }
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

export default ActiveJobsList;
