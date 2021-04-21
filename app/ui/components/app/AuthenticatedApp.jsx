/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.app.AuthenticatedApp
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This renders the authenticated app. It acts as a switchboard for every
 * page in the app.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';

// MBEE modules
import Home from '../home-views/home.jsx';
import OrgHome from '../org-views/org-home.jsx';
import ProjectHome from '../project-views/project-home.jsx';
import ProfileHome from '../profile-views/profile-home.jsx';
import AdminConsoleHome from '../admin-console-views/admin-console-home.jsx';
import About from '../general/About.jsx';
import NotFound from '../shared-views/NotFound.jsx';

export default function AuthenticatedApp(props) {
  return (
    <Switch>
      <Route path={'/login'} component={() => <Redirect to={'/'}/>}/>
      <Route path={'/orgs/:orgid/projects/:projectid'} component={ProjectHome} />
      <Route path={'/orgs/:orgid'} component={OrgHome} />
      <Route path={'/profile/:username'} component={ProfileHome}/>
      <Route path={'/profile'} component={ProfileHome}/>
      <Route path={'/admin'} component={AdminConsoleHome}/>
      <Route path={'/about'} component={About}/>
      <Route path={'/'} exact component={Home}/>
      <Route path={'/'} component={NotFound}/>
    </Switch>
  );
}
