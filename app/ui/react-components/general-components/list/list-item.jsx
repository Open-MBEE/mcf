/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.general-components.list
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders a list item.
 */
import React from 'react';

function ListItem(props) {

    const listItem = (
        <div className='list-item'>
            {props.children}
         </div>
    );

    if (props.routerLink) {
        <NavLink exact to={props.routerLink}> {listItem} </NavLink>
    }
    else if (props.href || props.onClick) {
        return  <a href={props.href} onClick={props.onClick}> {listItem} </a>
    }
    else if (props.element) {
        return <div> {props.element.name} </div>
    }
    else {
        return listItem;
    }
}

export default ListItem;
