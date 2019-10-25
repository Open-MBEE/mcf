/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.apps.profile-app
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders a user's page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import ProfileHome from '../profile-views/profile-home.jsx';

// Render on main html element
ReactDOM.render(<Router>
                  <Switch>
                    <Route exact path={'/profile'} component={ProfileHome} />
                    <Route path={'/profile/:username'} component={ProfileHome} />
                  </Switch>
                </Router>, document.getElementById('main'));
