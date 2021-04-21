/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.app.PasswordRedirect
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React from 'react';
import { Route, Redirect } from 'react-router-dom';

// MBEE modules
import ProfileHome from '../profile-views/profile-home.jsx';


export default function PasswordRedirect(props) {
  return (
    <React.Fragment>
      <Route path={'/profile'} component={ProfileHome}/>
      <Route path={'/'} component={() => <Redirect to={'/profile'}/>}/>
    </React.Fragment>
  );
}
