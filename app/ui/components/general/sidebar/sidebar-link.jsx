/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.general.sidebar.sidebar-link
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders a sidebar link.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React from 'react';
import { NavLink } from 'react-router-dom';
import { UncontrolledTooltip } from 'reactstrap';

/* eslint-enable no-unused-vars */

// Define function
function SidebarLink(props) {
  let newTab = '_self';

  if (props.openNewTab) {
    newTab = '_blank';
  }
  // Define sidebar item
  const sidebarItem = (
    <div className='sidebar-item' id={props.id}>
      <i className={props.icon}/>
      {/* if sidebar is not expanded, set a name when hovering over icon */}
      {(!props.isExpanded)
        ? <UncontrolledTooltip placement='right'
                               target={props.id}
                               delay={{
                                 show: 0,
                                 hide: 0 }}
                               boundariesElement='viewport'>
              {props.tooltip || props.title}
          </UncontrolledTooltip>
        : ''}
      {/* if sidebar is expanded, set the name of link */}
      {(props.isExpanded) ? <p> {props.title} </p> : ''}
    </div>
  );

    // Returns the sidebar item as NavLink or href
  return (props.routerLink)
    ? <NavLink exact to={props.routerLink}> {sidebarItem} </NavLink>
    : <a href={props.href} target={newTab} onClick={props.onClick}> {sidebarItem} </a>;
}

// Export function
export default SidebarLink;
