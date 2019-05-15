/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.apps.profile-app
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders a user's page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

// MBEE Modules
import Sidebar from '../general/sidebar/sidebar.jsx';
import SidebarLink from '../general/sidebar/sidebar-link.jsx';
import SidebarHeader from '../general/sidebar/sidebar-header.jsx';
import ProfileHome from '../profile-views/profile-home.jsx';
import OrganizationList from '../profile-views/organization-list.jsx';
import ProjectList from '../profile-views/project-list.jsx';

// Define component
class ProfileApp extends Component {

/* eslint-enable no-unused-vars */

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      user: null,
      error: null
    };
  }

  componentDidMount() {
    // Get user data
    $.ajax({
      method: 'GET',
      url: '/api/users/whoami?minified=true',
      statusCode: {
        200: (user) => {
          // Set user state
          this.setState({ user: user });
        },
        401: (err) => {
          // Throw error and set state
          this.setState({ error: err.responseJSON.description });

          // Refresh when session expires
          window.location.reload();
        },
        404: (err) => {
          this.setState({ error: err.responseJSON.description });
        }
      }
    });
  }

  render() {
    let title = 'Loading ...';
    if (this.state.user && this.state.user.preferredName) {
      title = `${this.state.user.preferredName}'s Profile`;
    }
    else if (this.state.user && this.state.user.fname) {
      title = `${this.state.user.fname}'s Profile`;
    }
    else if (this.state.user) {
      title = `${this.state.user.username}'s Profile`;
    }

    // Return user page
    return (
      <Router>
        <div id='container'>
          { /* Create the sidebar with sidebar links */ }
          <Sidebar title={title}>
            <SidebarLink id='Info'
                         title='Info'
                         icon='fas fa-info'
                         routerLink='/profile' />
            <SidebarLink id='Organization'
                         title='Organizations'
                         icon='fas fa-boxes'
                         routerLink='/profile/orgs'/>
            <SidebarLink id='Project'
                         title='Projects'
                         icon='fas fa-box'
                         routerLink='/profile/projects'/>
          </Sidebar>
          { /* Verify user data exists */ }
          { // Display loading page or error page if user data is loading or failed to load
            (!this.state.user)
              ? <div id='view' className="loading"> {this.state.error || 'Loading your information...'}</div>
              : (
                <Switch>
                  { /* Route to user home page */ }
                  <Route exact path="/profile"
                         render={ (props) => <ProfileHome {...props}
                                                          user={this.state.user} /> } />
                  { /* Route to org list page */ }
                  <Route exact path={'/profile/orgs'}
                         render={ (props) => <OrganizationList {...props}
                                                               user={this.state.user} /> }/>
                  { /* Route to project list page */ }
                  <Route exact path={'/profile/projects'}
                         render={ (props) => <ProjectList {...props}
                                                          user={this.state.user} /> } />
                </Switch>
              )
          }
        </div>
      </Router>
    );
  }

}

// Render on main html element
ReactDOM.render(<ProfileApp />, document.getElementById('main'));
