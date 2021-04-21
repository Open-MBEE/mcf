/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.admin-console-views.admin-console-home
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the admin console page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
import { Route, Switch } from 'react-router-dom';

// MBEE modules
import Sidebar from '../general/sidebar/sidebar.jsx';
import SidebarLink from '../general/sidebar/sidebar-link.jsx';
import UserList from '../admin-console-views/user-list.jsx';
import OrganizationList from '../admin-console-views/organization-list.jsx';
import ProjectList from '../admin-console-views/project-list.jsx';

// Define component
class AdminConsoleHome extends Component {

  /* eslint-enable no-unused-vars */

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      error: null
    };
  }

  componentDidMount() {
    // eslint-disable-next-line no-undef
    mbeeWhoAmI((err, data) => {
      if (!data.admin) {
        this.setState({ error: 'Page does not exist.' });
      }
      else if (err) {
        // Set error state
        this.setState({ error: err.responseText });
      }
    });
  }

  render() {
    // Return admin console
    return (
      (this.state.error)
        ? (<div id='view' className="loading"> {this.state.error} </div>)
        : (
            <div id='container'>
              { /* Create the sidebar with sidebar links */ }
              <Sidebar title='Admin Console'>
                <SidebarLink id='user-list'
                             title='User Managment'
                             icon='fas fa-users'
                             routerLink='/admin'/>
                <SidebarLink id='organization-list'
                             title='Organizations'
                             icon='fas fa-box'
                             routerLink='/admin/orgs'/>
                <SidebarLink id='project-list'
                             title='Projects'
                             icon='fas fa-boxes'
                             routerLink='/admin/projects'/>
              </Sidebar>
              { // Define routes for admin page
                <Switch>
                  { /* Route to user management page (home page of admin console) */ }
                  <Route exact path='/admin'
                         render={(props) => (<UserList {...props}/>)}/>
                  { /* Route to organizations management page */ }
                  <Route exact path='/admin/orgs'
                         render={(props) => (<OrganizationList {...props}
                                                               adminPage={true}/>)}/>
                  { /* Route to projects management page */ }
                  <Route exact path='/admin/projects'
                         render={(props) => (<ProjectList {...props}
                                                          adminPage={true}/>)}/>
                </Switch>
              }
            </div>
        )
    );
  }

}

export default AdminConsoleHome;
