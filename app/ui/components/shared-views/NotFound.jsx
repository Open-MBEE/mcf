/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.shared-views.LostPage
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This renders a page with the message that the route requested does not exist.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

import React from 'react';


export default function NotFound(props) {
  return (
    <h2 style={{ textAlign: 'center', marginTop: '3em' }}>404: Page Not Found</h2>
  );
}
