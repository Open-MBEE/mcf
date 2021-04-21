/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.org-views.org-home
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
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
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect } from 'react';
import { Route, Switch } from 'react-router-dom';

// MBEE modules
import Sidebar from '../general/sidebar/sidebar.jsx';
import SidebarLink from '../general/sidebar/sidebar-link.jsx';
import InformationPage from '../shared-views/information-page.jsx';
import MembersPage from '../shared-views/members/members-page.jsx';
import OrgProjects from '../org-views/organization-projects.jsx';
import { useApiClient } from '../context/ApiClientProvider.js';

/* eslint-enable no-unused-vars */

function OrgHome(props) {
  const { orgService } = useApiClient();
  const [org, setOrg] = useState(null);
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [write, setWrite] = useState(false);
  const [modal, setModal] = useState(false);
  const [permissions, setPermissions] = useState(null);
  const [error, setError] = useState(null);

  const handleToggle = () => {
    setModal((currentState) => !currentState);
  };

  const setMountedComponentStates = (userData, orgData) => {
    // Initialize variables
    const username = userData.username;
    const perm = orgData.permissions[username];

    // Verify if user is admin
    if ((userData.admin) || (perm === 'admin')) {
      // Set the admin state
      setAdmin(true);
      setPermissions('admin');
    }
    else {
      setPermissions(perm);
    }

    // Verify if user has write permissions
    if (userData.admin || (perm === 'admin') || (perm === 'write')) {
      setWrite(true);
    }

    // Verify the user has admin permissions on org if it is archived
    if (orgData.archived && ((perm === 'write') || (perm === 'read'))) {
      // Do not display the org information for non-perm user
      setOrg(null);
      setError(`Organization [${orgData.id}] not found.`);
    }
    else {
      // Set the org state
      setOrg(orgData);
    }
  };

  const refresh = () => {
    // eslint-disable-next-line no-undef
    mbeeWhoAmI(async (err, data) => {
      // Verify if error returned
      if (err) {
        // Set error state
        setError(err.responseText);
      }
      else {
        // Set user data
        setUser(data);

        // Initialize options for org request
        const options = {
          ids: props.match.params.orgid,
          populate: 'projects',
          includeArchived: true
        };

        // Get the org data
        const [orgErr, orgData] = await orgService.get(options);

        // Set the state
        if (orgErr) setError(orgErr);
        else if (orgData) setMountedComponentStates(data, orgData[0]);
      }
    });
  };

  // on mount
  useEffect(() => {
    refresh();
  }, []);


  // Initialize variables
  let title;

  // Verify org exists
  if (org) {
    // Set the title for sidebar
    title = <h2> {org.name}</h2>;
  }

  // Return organization page
  return (
    <div id='container'>
      { /* Create the sidebar with sidebar links */ }
      <Sidebar title={title}>
        <SidebarLink id='Home'
                     title='Home'
                     icon='fas fa-home'
                     routerLink={`${props.match.url}`} />
        <SidebarLink id='Projects'
                     title='Projects'
                     icon='fas fa-boxes'
                     routerLink={`${props.match.url}/projects`} />
        <SidebarLink id='Members'
                     title='Members'
                     icon='fas fa-users'
                     routerLink={`${props.match.url}/users`} />
      </Sidebar>
      { /* Verify organization data exists */ }
      {(!org)
        // Display loading page or error page if org is loading or failed to load
        ? <div id='view' className="loading"> {error || 'Loading your organization...'} </div>
        // Display page based on route on clients side
        : (
          <Switch>
            { /* Route to org home page */ }
            <Route exact path={`${props.match.url}`}
                   render={ (renderProps) => <InformationPage {...renderProps}
                                                              permissions={permissions}
                                                              org={org}
                                                              refresh={refresh}/> } />
            { /* Route to projects page */ }
            <Route path={`${props.match.url}/projects`}
                   render={ (renderProps) => <OrgProjects {...renderProps}
                                                          user={user}
                                                          org={org}
                                                          write={write}
                                                          modal={modal}
                                                          handleToggle={handleToggle}/> } />
            { /* Route to members page */ }
            <Route path={`${props.match.url}/users`}
                   render={ (renderProps) => <MembersPage {...renderProps}
                                                          org={org}
                                                          admin={admin}
                                                          refresh={refresh}/> } />
          </Switch>
        )
      }
    </div>
  );
}

export default OrgHome;
