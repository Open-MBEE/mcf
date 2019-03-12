/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.projects
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the routes for the project pages.
 */
import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import ReactDOM from "react-dom";

import ProjectList from './project-list.jsx';
import Project from './project.jsx';
import { getRequest } from '../helper-functions/getRequest.js';

class Projects extends Component {

  constructor(props) {
      super(props);

      this.state = {
          user: null
      };
  }

  componentDidMount(){
    getRequest('/api/users/whoami')
    .then(user => {
          this.setState({user: user});
      })
  }

  render() {
      return (
          <Router>
              <Switch>
                  <Route exact path="/projects" component={ProjectList} />
                  <Route path="/:orgid/:projectid" render={ (props) => <Project {...props} user={this.state.user}/> } />
              </Switch>
          </Router>
      );
  }
}

ReactDOM.render(<Projects />, document.getElementById('main'));
