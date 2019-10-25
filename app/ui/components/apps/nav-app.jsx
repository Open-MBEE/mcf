/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.apps.nav-app
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the nav bar.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React from 'react';
import ReactDom from 'react-dom';

import MbeeNav from '../general/nav-bar.jsx';

// Render the navbar on the nav html element
ReactDom.render(<MbeeNav />, document.getElementById('nav'));
