/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.shared-views.list-items.branch-list-item
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the branch list items.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';

/* eslint-enable no-unused-vars */

// Define component
class BranchListItem extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      branch: props.branch,
      error: null
    };
  }

  render() {
    // Initialize variables
    const branch = this.state.branch;
    let classNames = 'list-header';
    let archivedClass;
    let date;

    if (this.state.branch.archived) {
      archivedClass = 'grayed-out';
    }

    if (this.props.label) {
      classNames = 'template-item minimize';
    }

    if (branch.createdOn) {
      date = branch.createdOn.slice(0, 21);
    }

    // Render the organization stat list items
    return (
      <div key={this.props._key}>
        <div id='branch-list-items' className={classNames}>
          <div className={archivedClass} style={{ overflow: 'hidden' }}>
            <span>
              <a id={archivedClass} className='branch-link'
                 href={this.props.href}>
                {branch.id}
              </a>
            </span>
          </div>
          <span className={archivedClass} style={{ overflow: 'hidden' }}>
            {branch.name}
          </span>
          <div className={archivedClass} style={{ overflow: 'hidden' }}>
            <span>{branch.source}</span>
          </div>
           <div className={archivedClass} style={{ overflow: 'hidden' }}>
             <span>{date}</span>
           </div>
        </div>
      </div>
    );
  }

}

// Export component
export default BranchListItem;
