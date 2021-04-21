/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.general.list.list-item
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 * @author Jake Ursetta
 *
 * @description This renders a list item.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React from 'react';
import { Link } from 'react-router-dom';

/* eslint-enable no-unused-vars */

// Define function
function ListItem(props) {
  // Initialize basic list item html
  const listItem = (
        <div className={`list-item ${props.className}`}>
            {props.children}
        </div>
  );
  // Verify link provided
  if (props.link) {
    // Create a link item
    return <Link to={props.link} onClick={props.onClick}> {listItem} </Link>;
  }
  else {
    // Create basic item
    return listItem;
  }
}

// Export function
export default ListItem;
