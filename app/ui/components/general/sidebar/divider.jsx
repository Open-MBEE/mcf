/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.general.sidebar.divider
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Josh Kaplan
 *
 * @description This renders a sidebar divider.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React from 'react';

/* eslint-enable no-unused-vars */

function Divider() {
  return (<hr className={'divider'}/>);
}

// Export component
export default Divider;
