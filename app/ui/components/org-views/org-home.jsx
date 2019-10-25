/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.org-views.org-home
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 * @author Jake Ursetta
 *
 * @description This renders an organization page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

// MBEE modules
import Sidebar from '../general/sidebar/sidebar.jsx';
import SidebarLink from '../general/sidebar/sidebar-link.jsx';
import InformationPage from '../shared-views/information-page.jsx';
import MembersPage from '../shared-views/members/members-page.jsx';
import OrgProjects from '../org-views/organization-projects.jsx';

// Define component
class OrgHome extends Component {

  /* eslint-enable no-unused-vars */

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      org: null,
      error: null,
      user: null,
      admin: false,
      write: false,
      modal: false,
      permissions: null
    };

    // Bind component functions
    this.handleToggle = this.handleToggle.bind(this);
    this.setMountedComponentStates = this.setMountedComponentStates.bind(this);
  }

  componentDidMount() {
    // eslint-disable-next-line no-undef
    mbeeWhoAmI((err, data) => {
      // Verify if error returned
      if (err) {
        // Set error state
        this.setState({ error: err.responseText });
      }
      else {
        // Set user data
        this.setState({ user: data });
        // Initialize options
        const opt = 'populate=projects&minified=true&includeArchived=true';

        // Get org data
        $.ajax({
          method: 'GET',
          url: `/api/orgs/${this.props.match.params.orgid}?${opt}`,
          statusCode: {
            200: (org) => {
              // Set states
              this.setMountedComponentStates(data, org);
            },
            401: (error) => {
              // Throw error and set state
              this.setState({ error: error.responseText });

              // Refresh when session expires
              window.location.reload();
            },
            403: () => {
              // Throw error and set state
              this.setState({ error: 'Organization not found.' });
            },
            404: (error) => {
              this.setState({ error: error.responseText });
            }
          }
        });
      }
    });
  }

  setMountedComponentStates(user, org) {
    // Initialize variables
    const username = user.username;
    const perm = org.permissions[username];
    const admin = user.admin;

    // Set user state
    this.setState({ user: user });

    // Verify if user is admin
    if ((admin) || (perm === 'admin')) {
      // Set the admin state
      this.setState({ admin: true });
      this.setState({ permissions: 'admin' });
    }
    else {
      this.setState({ permissions: perm });
    }

    // Verify is user has write permissions
    if (admin || (perm === 'admin') || (perm === 'write')) {
      this.setState({ write: true });
    }

    // Verify the user has admin permissions on org if it is archived
    if (org.archived && ((perm === 'write') || (perm === 'read'))) {
      // Do not display the org information for non-perm user
      this.setState({ org: null });
      this.setState({ error: `Organization [${org.id}] not found.` });
    }
    else {
      // Set the org state
      this.setState({ org: org });
    }
  }

  // Define handle toggle
  handleToggle() {
    this.setState({ modal: !this.state.modal });
  }

  render() {
    // Initialize variables
    let title;

    // Verify org exists
    if (this.state.org) {
      // Set the title for sidebar
      title = <h2> {this.state.org.name}</h2>;
    }

    // Return organization page
    return (
      <Router>
        <div id='container'>
          { /* Create the sidebar with sidebar links */ }
          <Sidebar title={title}>
            <SidebarLink id='Home'
                         title='Home'
                         icon='fas fa-home'
                         routerLink={`${this.props.match.url}`} />
            <SidebarLink id='Projects'
                         title='Projects'
                         icon='fas fa-boxes'
                         routerLink={`${this.props.match.url}/projects`} />
            <SidebarLink id='Members'
                         title='Members'
                         icon='fas fa-users'
                         routerLink={`${this.props.match.url}/users`} />
          </Sidebar>
          { /* Verify organization data exists */ }
          {(!this.state.org)
            // Display loading page or error page if org is loading or failed to load
            ? <div id='view' className="loading"> {this.state.error || 'Loading your organization...'} </div>
            // Display page based on route on clients side
            : (
              <Switch>
                { /* Route to org home page */ }
                <Route exact path={`${this.props.match.url}`}
                       render={ (props) => <InformationPage {...props}
                                                            permissions={this.state.permissions}
                                                            org={this.state.org} /> } />
                { /* Route to projects page */ }
                <Route path={`${this.props.match.url}/projects`}
                       render={ (props) => <OrgProjects {...props}
                                                        user={this.state.user}
                                                        org={this.state.org}
                                                        write={this.state.write}
                                                        modal={this.state.modal}
                                                        handleToggle={this.handleToggle}/> } />
                { /* Route to members page */ }
                <Route path={`${this.props.match.url}/users`}
                       render={ (props) => <MembersPage {...props}
                                                        org={this.state.org}
                                                        admin={this.state.admin}/> } />
              </Switch>
            )
          }
        </div>
      </Router>
    );
  }

}

export default OrgHome;
