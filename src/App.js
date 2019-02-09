import React, { Component } from 'react';
import { BrowserRouter, NavLink, Route } from 'react-router-dom'

import './App.css';

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
// import 'popper.js/dist/popper.min.js'

import logo from './assets/images/logo-dark.svg'

import Home from './Home'
import ResizeStills from './ResizeStills'
import GenerateThumbnails from './GenerateThumbnails'
import Transcode from './Transcode'

class App extends Component {
  render() {
    return (
      <BrowserRouter>
        <div className="h-100">
          <nav className="navbar fixed-top navbar-expand-lg navbar-dark bg-dark">
            <NavLink to="/" className="navbar-brand"><img className="logo p-1 rounded-circle bg-light" src={ logo } alt="publish50" /></NavLink>
            <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav">
                <li className="nav-item">
                  <NavLink to="/new-publish" className="nav-link">New Publish</NavLink>
                </li>

                <li className="nav-item">
                  <NavLink to="/browse-cdn" className="nav-link">Browse CDN</NavLink>
                </li>

                <li className="nav-item">
                  <NavLink to="/update-metadata" className="nav-link">Update Metadata</NavLink>
                </li>

                <li className="nav-item">
                  <NavLink to="/resize-stills" className="nav-link">Resize Stills</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/transcode" className="nav-link">Transcode</NavLink>
                </li>

                <li className="nav-item">
                  <NavLink to="/generate-thumbnails" className="nav-link">Generate Thumbnails</NavLink>
                </li>

                <li className="nav-item">
                  <NavLink to="/quality-assurance" className="nav-link">Quality Assurance</NavLink>
                </li>
              </ul>
            </div>
          </nav>
          <div className="container-fluid">
            <Route exact path="/" component={ Home } />
            <Route exact path="/resize-stills" component={ ResizeStills } />
            <Route exact path="/transcode" component={ Transcode } />
            <Route exact path="/generate-thumbnails" component={ GenerateThumbnails } />
          </div>
          <script>

          </script>
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
