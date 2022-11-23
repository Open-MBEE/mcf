/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.app.App
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This renders either the authenticated or unauthenticated version of the app,
 * depending on the knowledge of the authentication status.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

// MBEE modules
import Navbar from '../general/nav-bar.jsx';
import PasswordRedirect from './PasswordRedirect.jsx';
import AuthenticatedApp from './AuthenticatedApp.jsx';
import UnauthenticatedApp from './UnauthenticatedApp.jsx';
import Banner from '../general/Banner.jsx';
import { useAuth } from '../context/AuthProvider.js';
import { useApiClient } from '../context/ApiClientProvider.js';

import uiConfig from '../../../../build/json/uiConfig.json';

export default function App(props) {
  const { auth, setAuth } = useAuth();
  const { userService } = useApiClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({});

  useEffect(() => {
    if (auth) {
      userService.whoami()
      .then(([err, me]) => {
        if (err || !me) {
          setAuth(false);
        }
        if (me) {
          setUser(me);
        }
        setLoading(false);
      });
    }
    else {
      setUser({});
      setLoading(false);
    }
  }, [auth]);


  let app;
  if (loading) {
    app = 'Loading...';
  }
  else {
    let content;
    if (auth && user.changePassword) {
      content = <PasswordRedirect/>;
    }
    else if (auth) {
      content = <AuthenticatedApp/>;
    }
    else {
      content = <UnauthenticatedApp/>;
    }

    app = (
      <>
        <Navbar/>
        {content}
      </>
    );
  }

  const basePath = () => {
    let path = '/'
    if (typeof uiConfig.basePath !== 'undefined') {
      path = uiConfig.basePath.replace(/\/$/, "");
    }
    return path;
  };

  return (
    <Router basename={basePath()}>
      <Banner>
        { app }
      </Banner>
    </Router>
  );
}
