/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.apps.admin-console-app
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the admin console page.
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
import UserList from '../admin-console-views/user-list.jsx';

// Define component
class AdminConsole extends Component {

  /* eslint-enable no-unused-vars */

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      error: null
    };
  }

  render() {
    // Return project page
    return (
      <Router>
        <div id='container'>
          { /* Create the sidebar with sidebar links */ }
          <Sidebar title='Admin Console'>
            <SidebarLink id='user-list'
                         title='User Managment'
                         icon='fas fa-users'
                         routerLink='/admin'/>
          </Sidebar>
          { /* Verify project and element data exists */ }
          { // Display loading page or error page if project is loading or failed to load
          <Switch>
            { /* Route to project home page */ }
            <Route exact path='/admin'
                   render={(props) => (<UserList {...props}/>)}/>
          </Switch>
          }
        </div>
      </Router>
    );
  }

}

// Render on main html element
ReactDOM.render(<AdminConsole />, document.getElementById('main'));
