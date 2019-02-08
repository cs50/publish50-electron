import React, { Component } from 'react';

import DropZone from './DropZone'
import './ResizeStills.css'

const ipcRenderer = window.require('electron').ipcRenderer

function onSubmit(files) {
  ipcRenderer.send('resize stills', { files: Array.from(files) })
}

class ResizeStills extends Component {
  render() {
    return (
      <div id="dropzone_container" className="text-center">
        <DropZone accept="image/png" caption="Resize" onSubmit={ onSubmit }/>
      </div>
    );
  }
}

export default ResizeStills;
