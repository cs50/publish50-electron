import React, { Component } from 'react';

import DropZone from './DropZone'

const { ipc } = window

function onSubmit(files, resetDropzone) {
  ipc.send('resize stills', { files: Array.from(files) })
  resetDropzone()
}

class ResizeStills extends Component {
  render() {
    return (
      <div className="w-75 mx-auto mt-5">
        <DropZone accept=".png" caption="Resize" onSubmit={ onSubmit }/>
      </div>
    );
  }
}

export default ResizeStills;
