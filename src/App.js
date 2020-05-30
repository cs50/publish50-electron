import React, { Component } from 'react';
import { HashRouter, NavLink, Route } from 'react-router-dom'

import './App.css';

import 'bootstrap/dist/css/bootstrap.min.css'
// import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import { Button, Nav, Navbar } from 'react-bootstrap';

import logo from './assets/images/logo-dark.svg'

import Home from './Home'
import ResizeStills from './ResizeStills'
import GenerateThumbnails from './GenerateThumbnails'
import NewPublish from './NewPublish'
import Transcode from './Transcode'
import Preferences from './Preferences'

const { ipc } = window

class App extends Component {
  render() {
    return (
      <HashRouter>
        <div className="h-100">
          <Navbar bg="dark" fixed="top" expand="lg" variant="dark">
            <NavLink to="/" className="navbar-brand"><img className="logo p-1 rounded-circle" src={ logo } alt="publish50" /></NavLink>
            <Navbar.Toggle aria-controls="responsive-navbar-nav" />
            <Navbar.Collapse id="responsive-navbar-nav">
              <Nav className="mr-auto">
                <NavLink to="/new-publish" className="nav-link pr-0">
                  New Publish
                  <span className="divider ml-4"></span>
                </NavLink>

                <NavLink to="/transcode" className="nav-link pr-0 pl-4">
                  Transcode
                  <span className="divider ml-4"></span>
                </NavLink>


                <NavLink to="/generate-thumbnails" className="nav-link pr-0 pl-4">
                  Generate Thumbnails
                  <span className="divider ml-4"></span>
                </NavLink>

                <NavLink to="/resize-stills" className="nav-link pr-0 pl-4">
                  Resize Stills
                  <span className="divider ml-4"></span>
                </NavLink>

                <Button variant="link" className="nav-link pl-4" onClick={ () => ipc.send('open bucket') }>
                  Browse CDN
                </Button>
              </Nav>
              <Nav>
                <NavLink className="preferences-icon" to="/preferences" title="Preferences"></NavLink>
              </Nav>
            </Navbar.Collapse>
          </Navbar>
          <div className="d-flex h-100 w-100">
            <Route exact path="/" component={ Home } />
            <Route path="/home" component={ Home } />
            <Route path="/new-publish" component={ NewPublish } />
            <Route path="/resize-stills" component={ ResizeStills } />
            <Route path="/transcode" component={ Transcode } />
            <Route path="/generate-thumbnails" component={ GenerateThumbnails } />
            <Route path="/preferences" component={ Preferences } />
          </div>
        </div>
      </HashRouter>
    );
  }
}

export default App;
