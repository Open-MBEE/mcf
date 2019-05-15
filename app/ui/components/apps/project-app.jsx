/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.apps.project-app
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders a project.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import ReactDOM from 'react-dom';

// MBEE Modules
import Sidebar from '../general/sidebar/sidebar.jsx';
import SidebarLink from '../general/sidebar/sidebar-link.jsx';
import SidebarHeader from '../general/sidebar/sidebar-header.jsx';
import InformationPage from '../shared-views/information-page.jsx';
import MembersPage from '../shared-views/members/members-page.jsx';
import ProjectElements from '../project-views/elements/project-elements.jsx';
import Search from '../project-views/search/search.jsx';

// Define component
class ProjectApp extends Component {

/* eslint-enable no-unused-vars */

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      project: null,
      orgid: null,
      url: null,
      error: null,
      admin: false,
      permissions: null
    };
  }

  componentDidMount() {
    // Initialize variables
    const orgId = this.props.match.params.orgid;
    const projId = this.props.match.params.projectid;
    const url = `/api/orgs/${orgId}/projects/${projId}`;

    // Set states
    this.setState({ url: url });
    this.setState({ orgid: orgId });

    // Get project data
    $.ajax({
      method: 'GET',
      url: '/api/users/whoami?minified=true',
      statusCode: {
        200: (user) => {
          // Get project data
          $.ajax({
            method: 'GET',
            url: `${url}?minified=true`,
            statusCode: {
              200: (project) => {
                // Initialize variables
                const username = user.username;
                const perm = project.permissions[username];
                const admin = user.admin;

                // Verify if user is admin
                if ((admin) || (perm === 'admin')) {
                  // Set admin state
                  this.setState({ admin: true });
                  this.setState({ permissions: 'admin' });
                }
                else {
                  // Set permissions
                  this.setState({ permissions: perm });
                }
                // Set states
                this.setState({ project: project });
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
        },
        401: (err) => {
          // reload the page
          window.location.reload();
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

    // Set the org state
    this.setState({ org: org });
  }

  render() {
    // Initialize variables
    let title;
    let displayPlugins = false;
    const plugins = [];

    // Verify if project exists
    if (this.state.project) {
      // Set the title for sidebar
      title = <h2> {this.state.project.name}</h2>;

      // Verify if plugins in project
      if (this.state.project.custom.integrations) {
        displayPlugins = true;
        plugins.push(<SidebarHeader title='Integrations'/>);
        this.state.project.custom.integrations.forEach((plugin) => {
          let icon = 'layer-group';
          let newTab = false;

          if (!plugin.hasOwnProperty('name') || !plugin.hasOwnProperty('url')) {
            return;
          }
          if (plugin.hasOwnProperty('icon')) {
            icon = plugin.icon;
          }
          if (plugin.hasOwnProperty('openNewTab')) {
            newTab = this.state.project.custom.integrations.openNewTab;
          }

          plugins.push(<SidebarLink id={`sidebar-${plugin.name}`}
                                    title={plugin.title}
                                    icon={`fas fa-${icon}`}
                                    openNewTab={newTab}
                                    href={`${plugin.url}`}/>);
        });
      }
    }

    // Return project page
    return (
      <Router>
        <div id='container'>
          { /* Create the sidebar with sidebar links */ }
          <Sidebar title={title}>
            {(displayPlugins)
              ? (<SidebarHeader title='Dashboard'/>)
              : ''
            }
            <SidebarLink id='Home'
                         title='Home'
                         icon='fas fa-home'
                         routerLink={`${this.props.match.url}`}/>
            <SidebarLink id='Elements'
                         title='Model'
                         icon='fas fa-sitemap'
                         routerLink={`${this.props.match.url}/elements`}/>
            <SidebarLink id='Search'
                         title='Search'
                         icon='fas fa-search'
                         routerLink={`${this.props.match.url}/search`}/>
            <SidebarLink id='Members'
                         title='Members'
                         icon='fas fa-users'
                         routerLink={`${this.props.match.url}/users`}/>
            {(!displayPlugins)
              ? ''
              : (plugins)
            }
          </Sidebar>
          { /* Verify project and element data exists */ }
          { // Display loading page or error page if project is loading or failed to load
            (!this.state.project)
              ? <div id='view' className="loading"> {this.state.error || 'Loading your project...'} </div>
              : (
                <Switch>
                  { /* Route to project home page */ }
                  <Route exact path={`${this.props.match.url}/`}
                         render={ (props) => <InformationPage {...props}
                                                              permissions={this.state.permissions}
                                                              project={this.state.project} /> } />
                  { /* Route to members page */ }
                  <Route path={`${this.props.match.url}/users`}
                         render={ (props) => <MembersPage {...props}
                                                          project={this.state.project}
                                                          admin={this.state.admin}/> } />
                  { /* Route to element page */ }
                  <Route path={`${this.props.match.url}/elements`}
                         render={ (props) => <ProjectElements {...props}
                                                              permissions={this.state.permissions}
                                                              url={this.state.url}
                                                              project={this.state.project}/> } />
                  <Route path={`${this.props.match.url}/search`}
                         render={ (props) => <Search {...props}
                                                     project={this.state.project} /> } />
                </Switch>
              )
          }
        </div>
      </Router>
    );
  }

}

// Export component
ReactDOM.render(<Router>
                    <Route path={'/:orgid/:projectid'} component={ProjectApp} />
                </Router>, document.getElementById('main'));
