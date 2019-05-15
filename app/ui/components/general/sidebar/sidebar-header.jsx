/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.general.sidebar.sidebar-header.jsx
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders a sidebar header.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

import React from 'react';

/* eslint-enable no-unused-vars */

function SidebarHeader(props) {
  // Verify if the sidebar is expanded
  if (props.isExpanded) {
    return (<div className='nested-sidebar-header'>
              {props.title}
            </div>);
  }
  // Return an empty div if not expanded
  // NOTE: this is necessary
  else {
    return (<div></div>);
  }
}

// Export component
export default SidebarHeader;
