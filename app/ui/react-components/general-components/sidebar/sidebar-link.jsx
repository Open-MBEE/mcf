/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.general-components.sidebar
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders a sidebar link.
 */
import React from 'react';
import { NavLink } from 'react-router-dom';
import { UncontrolledTooltip } from 'reactstrap';

function SidebarLink(props) {
    const sidebarItem = (
        <div className='sidebar-item' id={props.title}>
            {(!props.isExpanded) ? <i className={props.icon}/> : ''}
            {(!props.isExpanded) ?
                <UncontrolledTooltip placement='right'
                                     target={props.title}
                                     delay={{
                                         show: 0,
                                         hide: 0
                                     }}
                                     boundariesElement='viewport'
                >
                    {props.tooltip || props.title}
                </UncontrolledTooltip>
                : ''}
            {(props.isExpanded) ? <p> {props.title} </p> : ''}
        </div>
    );

    return (props.routerLink)
        ? <NavLink exact to={props.routerLink}> {sidebarItem} </NavLink>
        : <a href={props.href} onClick={props.onClick}> {sidebarItem} </a>;
}

export default SidebarLink
