import React, { Component } from 'react';
import { BrowserRouter, NavLink, Route } from 'react-router-dom'

import './App.css';

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.min.js'

import Home from './components/Home'
import ResizeStills from './components/ResizeStills'
import GenerateThumbnails from './components/GenerateThumbnails'

class App extends Component {
  render() {
    return (
      <BrowserRouter>
        <div className="h-100">
          <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <NavLink to="/" className="navbar-brand">publish50</NavLink>
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
