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
import BranchesTags from '../project-views/branches/branches-tags.jsx';

// Define component
class ProjectApp extends Component {

/* eslint-enable no-unused-vars */

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      project: null,
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

    // eslint-disable-next-line no-undef
    mbeeWhoAmI((err, data) => {
      if (err) {
        this.setState({ error: err.responseText });
      }
      else {
        this.setState({ user: data });
        // Get project data
        $.ajax({
          method: 'GET',
          url: `${url}?minified=true`,
          statusCode: {
            200: (project) => {
              // Initialize variables
              const username = data.username;
              const perm = project.permissions[username];
              const admin = data.admin;

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
            401: (error) => {
              // Throw error and set state
              this.setState({ error: error.responseText });

              // Refresh when session expires
              window.location.reload();
            },
            404: (error) => {
              this.setState({ error: error.responseText });
            }
          }
        });
      }
    });
  }

  render() {
    // Initialize variables
    let title;
    let displayPlugins = false;
    const plugins = [];
    let url;

    // Verify if project exists
    if (this.state.project) {
      // Set the title for sidebar
      title = <h2> {this.state.project.name}</h2>;
      const orgId = this.state.project.org;
      const projId = this.state.project.id;
      url = `/api/orgs/${orgId}/projects/${projId}`;

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
            <SidebarLink id='Elements'
                         title='Model'
                         icon='fas fa-sitemap'
                         routerLink={`${this.props.match.url}/branches/master/elements`}/>
            <SidebarLink id='Branches'
                         title='Branches/Tags'
                         icon='fas fa-code-branch'
                         routerLink={`${this.props.match.url}/branches`}/>
            <SidebarLink id='Search'
                         title='Search'
                         icon='fas fa-search'
                         routerLink={`${this.props.match.url}/branches/master/search`}/>
            <SidebarLink id='Members'
                         title='Members'
                         icon='fas fa-users'
                         routerLink={`${this.props.match.url}/users`}/>
            <SidebarLink id='Information'
                         title='Information'
                         icon='fas fa-info'
                         routerLink={`${this.props.match.url}/info`}/>
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
                  { /* Route to element page */ }
                  <Route path={`${this.props.match.url}/branches/:branchid/elements`}
                         render={ (props) => <ProjectElements {...props}
                                                              permissions={this.state.permissions}
                                                              project={this.state.project}/> } />
                  <Route path={`${this.props.match.url}/branches/:branchid/search`}
                         render={ (props) => <Search {...props}
                                                     project={this.state.project} /> } />
                  <Route path={`${this.props.match.url}/branches/:branchid`}
                         render={ (props) => <InformationPage {...props}
                                                           url={url}
                                                           branch={true}/> } />
                  <Route exact path={`${this.props.match.url}/branches`}
                         render={ (props) => <BranchesTags {...props}
                                                           permissions={this.state.permissions}
                                                           project={this.state.project} /> } />
                  { /* Route to members page */ }
                  <Route exact path={`${this.props.match.url}/users`}
                         render={ (props) => <MembersPage {...props}
                                                          project={this.state.project}
                                                          admin={this.state.admin}/> } />
                  { /* Route to project home page */ }
                  <Route exact path={`${this.props.match.url}/info`}
                         render={ (props) => <InformationPage {...props}
                                                              permissions={this.state.permissions}
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
                  <Switch>
                    <Route path={'/orgs/:orgid/projects/:projectid'} component={ProjectApp} />
                  </Switch>
                </Router>, document.getElementById('main'));
