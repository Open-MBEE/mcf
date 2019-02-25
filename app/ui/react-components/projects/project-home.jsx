/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.projects
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders a project's home page.
 */
import React from 'react';

function ProjectHome(props) {
    const project = props.project;

    const orgId = project.org;
    const projId = project.id;

    return (
        <div id='view' className='project-home'>
            <h2>{project.name}</h2>
            <hr />
            <table>
                <tr>
                    <th>ID:</th>
                    <td>{projId}</td>
                </tr>
                <tr>
                    <th>Org ID:</th>
                    <td>{orgId}</td>
                </tr>
                <tr>
                    <th>Custom:</th>
                    <td>{JSON.stringify(project.custom, null, 2)}</td>
                </tr>
            </table>
        </div>
    )
}

export default ProjectHome
