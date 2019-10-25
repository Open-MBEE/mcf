/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.apps.admin-console-app
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the admin console page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React from 'react';
import ReactDOM from 'react-dom';

import AdminConsoleHome from '../admin-console-views/admin-console-home.jsx';

// Render on main html element
ReactDOM.render(<AdminConsoleHome />, document.getElementById('main'));
