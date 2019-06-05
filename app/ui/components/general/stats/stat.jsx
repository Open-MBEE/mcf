/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.general.stats.stat
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders a stat.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';
import { UncontrolledTooltip } from 'reactstrap';

/* eslint-enable no-unused-vars */

// Define component
class Stat extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Create reference
    this.ref = React.createRef();
  }

  componentDidMount() {
    // Set the child width and title of the parent props
    this.props.setChildWidth(this.props.title, this.ref.current.clientWidth);
  }

  render() {
    // Initialize variables
    let icon;
    let value;
    let classNames;

    // Verify if divider element
    if (this.props.divider) {
      // Set divider properties
      classNames = 'stats-item stats-divider';
      icon = '';
      value = '';
    }
    else {
      // Set stat properties
      classNames = (this.props._key === 'empty') ? 'empty-item' : 'stats-item';
      icon = <i className={this.props.icon}/>;
      // Verify value is a number, display a '?' if not
      value = Number.isNaN(this.props.value) ? '?' : (<p>{this.props.value}</p>);
    }

    // Return stats
    return (
      // Create stat div with key or title
      <div className={classNames} ref={this.ref} id={this.props._key || this.props.title}>
        {icon}
        {value}
        {/* Create hover title for icon if not divider element */}
        {(this.props.divider)
          ? ''
          : (<UncontrolledTooltip placement='top'
                                 target={this.props._key || this.props.title}
                                 delay={{ show: 0, hide: 0 }}
                                 boundariesElement='viewport'>
              {this.props.title}
             </UncontrolledTooltip>)
        }
      </div>
    );
  }

}

// Export component
export default Stat;
