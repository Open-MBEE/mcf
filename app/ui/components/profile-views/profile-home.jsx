/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.profile-views.profile-home
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders a user's profile home page.
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
import Profile from '../profile-views/profile.jsx';
import { useApiClient } from '../context/ApiClientProvider.js';

// Define component
function ProfileHome(props) {
  const { userService } = useApiClient();
  const [user, setUser] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [error, setError] = useState(null);

  const refreshUser = async () => {
    // Get the user data
    const [err, data] = await userService.whoami();

    // Set the state
    if (err) setError(err);
    else if (data) setUser(data);

    return data;
  };

  const refreshOtherUser = async () => {
    // Initialize options for request
    const options = {
      usernames: props.match.params.username,
      includeArchived: true
    };

    // Get the user data
    const [err, users] = await userService.get(options);

    // Set the state
    if (err) setError(err);
    else if (users) setOtherUser(users[0]);
  };

  const mount = async () => {
    const data = await refreshUser();

    if (props.match && props.match.params) {
      const username = props.match.params.username;
      if (username && username !== data.username) refreshOtherUser();
    }
  };

  // Set data on mount
  useEffect(() => {
    mount();
  }, []);


  let title = 'Loading ...';
  let routerLink = '/profile';

  if (otherUser !== null) {
    routerLink = `/profile/${otherUser.username}`;
    if (otherUser.preferredName) {
      title = `${otherUser.preferredName}'s Profile`;
    }
    else if (otherUser.fname) {
      title = `${otherUser.fname}'s Profile`;
    }
    else {
      title = `${user.username}'s Profile`;
    }
  }
  else if (user && user.preferredName) {
    title = `${user.preferredName}'s Profile`;
  }
  else if (user && user.fname) {
    title = `${user.fname}'s Profile`;
  }
  else if (user) {
    title = `${user.username}'s Profile`;
  }

  // Return user page
  return (
    <div id='container'>
      { /* Create the sidebar with sidebar links */ }
      <Sidebar title={title}>
        <SidebarLink id='Information'
                     title='Information'
                     icon='fas fa-info'
                     routerLink={routerLink} />
      </Sidebar>
      { /* Verify user data exists */ }
      { // Display loading page or error page if user data is loading or failed to load
        (!user)
          ? <div id='view' className="loading"> {error || 'Loading information...'}</div>
          : (
            <Switch>
                <Route exact path="/profile"
                       render={(renderProps) => <Profile {...renderProps}
                                                   admin={true}
                                                   user={user}
                                                   refreshUsers={refreshUser}/>}/>
                <Route path={`/profile/${props.match.params.username}`}
                       render={(renderProps) => <Profile {...renderProps}
                                                   admin={user.admin}
                                                   viewingUser={user}
                                                   user={otherUser || user}
                                                   refreshUsers={refreshOtherUser}/>}/>
            </Switch>
          )
      }
    </div>
  );
}

export default ProfileHome;
