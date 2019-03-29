import React, { Component } from 'react';

import DropZone from './DropZone'

const { ipc } = window

function onSubmit(files, resetDropzone) {
  ipc.send('transcode', { files: Array.from(files) })
  resetDropzone()
}

class GenerateThumbnails extends Component {
  render() {
    return (
      <div className="w-75 mx-auto mt-5">
        <DropZone accept=".mov,.mp4" caption="Generate" onSubmit={ onSubmit }/>
      </div>
    );
  }
}

export default GenerateThumbnails;
