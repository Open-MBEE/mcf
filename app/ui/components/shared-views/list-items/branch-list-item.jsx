/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.shared-views.list-items.branch-list-item
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
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
import { Link } from 'react-router-dom';

/* eslint-enable no-unused-vars */

// Define component
class BranchListItem extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      error: null
    };
  }

  render() {
    // Initialize variables
    const branch = this.props.branch;
    let classNames = 'list-header';
    let archivedClass;
    let date;

    if (this.props.branch.archived) {
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
              { this.props.link
                ? (<Link id={archivedClass} className='branch-link' to={this.props.link}>
                    {branch.id}
                  </Link>)
                : branch.id
              }
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
