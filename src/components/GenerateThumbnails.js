import React, { Component } from 'react';

import DropZone from './DropZone'
import './GenerateThumbnails.css'

const ipc = window.require('electron').ipcRenderer
function onSubmit(files) {
  ipc.send('generate thumbnails', { files: Array.from(files) })
}

class GenerateThumbnails extends Component {
  render() {
    return (
      <div id="dropzone_container" className="text-center">
        <DropZone accept="video/quicktime" caption="Generate" onSubmit={ onSubmit }/>
      </div>
    );
  }
}

export default GenerateThumbnails;
