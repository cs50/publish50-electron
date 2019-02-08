import React, { Component } from 'react';
import { BrowserRouter, Link, Route } from 'react-router-dom'

import './App.css';

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.min.js'

import Home from './components/Home'
import ResizeStills from './components/ResizeStills'
import GenerateThumbnails from './components/GenerateThumbnails'

class App extends Component {
  activateNavItem(e) {
    const navItems = document.querySelectorAll('.nav-item')
    navItems.forEach((i) => {
      i.classList.remove('active')
    })

    e.target.parentNode.classList.add('active')

    const navToggler = document.querySelector('.navbar-toggler')
    if (!navToggler.classList.contains('collapsed'))
      navToggler.click()
  }

  render() {
    return (
      <BrowserRouter>
        <div className="h-100">
          <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <Link to="" className="navbar-brand">publish50</Link>
            <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav">
                <li className="nav-item" onClick={ this.activateNavItem }>
                  <Link to="/new-publish" className="nav-link">New Publish</Link>
                </li>

                <li className="nav-item" onClick={ this.activateNavItem }>
                  <Link to="/browse-cdn" className="nav-link">Browse CDN</Link>
                </li>

                <li className="nav-item" onClick={ this.activateNavItem }>
                  <Link to="/update-metadata" className="nav-link">Update Metadata</Link>
                </li>

                <li className="nav-item" onClick={ this.activateNavItem }>
                  <Link to="/resize-stills" className="nav-link">Resize Stills</Link>
                </li>

                <li className="nav-item" onClick={ this.activateNavItem }>
                  <Link to="/generate-thumbnails" className="nav-link">Generate Thumbnails</Link>
                </li>

                <li className="nav-item" onClick={ this.activateNavItem }>
                  <Link to="/quality-assurance" className="nav-link">Quality Assurance</Link>
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
