/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.general.side-panel
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the side panel.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';

/* eslint-enable no-unused-vars */

// Define component
class SidePanel extends Component {

  render() {
    // Create the sidebar links
    const sidepanelDisplay = React.Children.map(this.props.children, child => child);

    // Render the sidebar with the links above
    return (
      <div id='side-panel' className='side-panel'>
        {sidepanelDisplay}
      </div>
    );
  }

}

// Export component
export default SidePanel;
