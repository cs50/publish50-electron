import React from 'react'


import './DropZone.css'
import fileUploadIcon from './assets/images/file_upload.svg'

function getInitialState() {
  return {
    files: new Set()
  }
}

class DropZone extends React.Component {
  constructor(props) {
    super(props)
    this.state = getInitialState()
  }

  addFile(p) {
    this.setState({
      files: this.state.files.add(p)
    })
  }

  onChange(e) {
    const files = e.target.files
    for (let i = 0; i < files.length; i++) {
      if (files[i].type === this.props.accept)
        this.addFile(files[i].path)
    }

    this.props.onChange(this.state.files)
  }

  onDrag(e) {
    e.preventDefault()
    e.stopPropagation()
    e.target.classList.add('drag-enter')
  }

  onDrop(e) {
    e.target.classList.remove('drag-enter')
    const items = e.dataTransfer.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file' && items[i].type=== this.props.accept)
        this.addFile(items[i].getAsFile().path)
    }

    this.props.onChange(this.state.files)
  }

  onLeave(e) {
    e.target.classList.remove('drag-enter')
  }

  onCancel() {
    this.setState(getInitialState())
  }

  onSubmit() {
    this.props.onSubmit(this.state.files)
    this.onCancel()
  }

  render() {
    return (
      <div
        id="dropzone"
        onDragOver={ this.onDrag.bind(this) }
        onDragLeave={ this.onLeave.bind(this) }
        onDrop={ this.onDrop.bind(this) }
        accept="{ this.props.accept }"
        className="text-center m-auto p-5">
        <img
          alt="File upload"
          className="file-upload-icon"
          src={ fileUploadIcon }
        />
        <div className="mt-3">
          Drag and drop files here or
          <label className="ml-1 click-here text-primary" htmlFor="files">click here</label>
        </div>

        {
          this.state.files.size > 0 &&
            <div>
              <div>
                <span className="selected-files">
                  { this.state.files.size } file{ this.state.files.size > 1 ? 's' : '' } selected
                </span>

              </div>

              <div className="mt-5">
                <button
                  className="btn btn-primary"
                  onClick={ this.onSubmit.bind(this) }>
                  { this.props.caption }
                </button>
                <button className="btn btn-danger ml-2" onClick={ this.onCancel.bind(this) }>
                  Cancel
                </button>
              </div>
            </div>
        }

        <input
          id="files"
          className="d-none"
          type="file"
          accept={ this.props.accept }
          onChange={ this.onChange.bind(this) }
          multiple
        />
      </div>
    );
  }
}

export default DropZone;
