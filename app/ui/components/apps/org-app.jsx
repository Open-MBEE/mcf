/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.apps.org-app
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders an organization page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import ReactDom from 'react-dom';

import OrgHome from '../org-views/org-home.jsx';

ReactDom.render(
  <Router>
    <Route path={'/orgs/:orgid'} component={OrgHome} />
  </Router>,
  document.getElementById('main')
);
