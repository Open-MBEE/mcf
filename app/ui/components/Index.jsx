/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.Index
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This is the entrypoint for the app.  It wraps the app in several provider
 * components that make data easily available to all children components without the need
 * for passing variables through props.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React from 'react';
import ReactDOM from 'react-dom';

// MBEE modules
import App from './app/App.jsx';
import { AuthProvider } from './context/AuthProvider.js';
import { ApiClientProvider } from './context/ApiClientProvider';


ReactDOM.render(
  <AuthProvider>
    <ApiClientProvider>
      <App/>
    </ApiClientProvider>
  </AuthProvider>,
  document.getElementById('main')
);
