/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.general.stats.stats-list
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Jake Ursetta
 *
 * @description This renders the stat list.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';

/* eslint-enable no-unused-vars */

// Define component
class StatsList extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      width: null
    };

    // Create reference
    this.ref = React.createRef();

    // Bind component functions
    this.handleResize = this.handleResize.bind(this);
    this.setChildWidth = this.setChildWidth.bind(this);
  }

  // Define handle resize function
  handleResize() {
    // Set width state of window width
    this.setState({ width: this.ref.current.clientWidth });
  }

  // Define child width function
  setChildWidth(title, width) {
    // Set the state of the child width
    this.setState({ [`stat-${title}`]: width });
  }

  componentDidMount() {
    // Add event listener for window sizing
    window.addEventListener('resize', this.handleResize);

    // Handle initial size of window
    this.handleResize();
  }

  componentWillUnmount() {
    // Remove event listener on window
    window.removeEventListener('resize', this.handleResize);
  }

  render() {
    // Initialize variables
    let statsItems = [];

    // If width is set
    if (this.state.width) {
      // Initialize stats width
      let totalStatsWidth = 0;

      // Loop through each stats item
      statsItems = React.Children.map(this.props.children, child => {
        // Initialize stat
        const statWidth = this.state[`stat-${child.props.title}`];

        // Check stats width is less than window width
        if (totalStatsWidth + statWidth <= this.state.width) {
          // Add the stat width to the total stat width
          totalStatsWidth += statWidth;

          // Create the stat element to get rendered
          return React.cloneElement(child, { setChildWidth: this.setChildWidth });
        }
      });
    }
    else {
      // Loop through stat items
      statsItems = React.Children.map(
        this.props.children,
        child => React.cloneElement(child, { setChildWidth: this.setChildWidth })
      );
    }

    // Verify if there is a class name
    const className = (this.props.className) ? this.props.className : 'stats-list';

    // Return the stat list
    return (
      <div className={className} ref={this.ref}>
        {statsItems}
      </div>
    );
  }

}

// Export component
export default StatsList;
