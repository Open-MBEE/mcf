/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.organizations
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders an organization's projects list.
 */
import React from 'react';
import ListItem from '../general-components/list/list-item.jsx';
import List from '../general-components/list/list.jsx';


function OrganizationProjects(props) {

    const org = props.org;

    const listItems = org.projects.map(project =>
        <ListItem href={`/${org.id}/${project.id}`}> {project.name} </ListItem>
    );

    return (
        <div id='view' className='org-projects'>
            <h2>Projects</h2>
            <hr />
            <List>
                {listItems}
            </List>
        </div>
    )
}

export default OrganizationProjects
