/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.organizations
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders an organization's members.
 */
import React from 'react';
import ListItem from '../general-components/list/list-item.jsx';
import List from '../general-components/list/list.jsx';


function OrganizationUsers(props) {
    const users = Object.keys(props.org.permissions);

    const listItems = users.map(user =>
        <ListItem> {user} </ListItem>
    );

    return (
        <div id='view' className='org-users'>
            <h2>Users</h2>
            <hr />
            <List>
                {listItems}
            </List>

        </div>
    )
}

export default OrganizationUsers
