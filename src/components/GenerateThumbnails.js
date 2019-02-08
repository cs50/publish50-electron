import React, { Component } from 'react';

import DropZone from './DropZone'
import './GenerateThumbnails.css'

class GenerateThumbnails extends Component {
  render() {
    return (
      <div id="dropzone_container" className="text-center">
        <DropZone accept="video/quicktime" caption="Generate" onSubmit={ (files) => {} }/>
      </div>
    );
  }
}

export default GenerateThumbnails;
