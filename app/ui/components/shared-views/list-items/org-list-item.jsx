/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.shared-views.list-items.org-list-item
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 * @author Jake Ursetta
 *
 * @description This renders the organization list items.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';

// MBEE modules
import StatsList from '../../general/stats/stats-list.jsx';
import Stat from '../../general/stats/stat.jsx';
/* eslint-enable no-unused-vars */

// Define component
class OrgListItem extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      width: 0
    };

    // Create reference
    this.ref = React.createRef();

    // Bind component functions
    this.handleResize = this.handleResize.bind(this);
  }

  componentDidMount() {
    // Create event listener to resize window
    window.addEventListener('resize', this.handleResize);

    // Set initial size of window
    this.handleResize();
  }

  componentWillUnmount() {
    // Remove event listener on window
    window.removeEventListener('resize', this.handleResize);
  }

  // Define handle resize function
  handleResize() {
    // Set the state prop to the client width
    this.setState({ width: this.ref.current.clientWidth });
  }

  render() {
    // Initialize variables
    const org = this.props.org;
    let colorClass;

    // Verify if archived
    if (org.archived) {
      // Make it grayed-out
      colorClass = 'archived-link';
    }

    const stats = (
      // Create the stat list for the organization
      <StatsList>
        <Stat title='Projects'
              icon='fas fa-boxes'
              value={org.projects.length}
              _key={`org-${org.id}-projects`}
              className={colorClass}/>
        <Stat title='Users'
              icon='fas fa-users'
              value={Object.keys(org.permissions).length}
              _key={`org-${org.id}-users`}
              className={colorClass}/>
        {(!this.props.divider)
          ? <Stat title='' icon='' value='' _key='empty'/>
          : <Stat divider={this.props.divider}
                  _key={`org-${org.id}-divider`}/>
        }
      </StatsList>
    );

    // Render the organization stat list items
    return (
      <div className={`stats-list-item ${this.props.className}`} ref={this.ref}>
        <div className='list-header'>
          <a href={this.props.href} className={colorClass}>{org.name}</a>
        </div>
        {/* Verify width of client, remove stats based on width */}
        {(this.state.width > 600) ? stats : ''}
      </div>
    );
  }

}

// Export component
export default OrgListItem;
