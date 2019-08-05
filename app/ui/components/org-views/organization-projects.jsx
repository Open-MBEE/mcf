/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.org-views.organization-projects
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders an organization's projects list.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React from 'react';
import { Button, Modal, ModalBody } from 'reactstrap';

// MBEE Modules
import ListItem from '../general/list/list-item.jsx';
import List from '../general/list/list.jsx';
import Create from '../shared-views/create.jsx';

/* eslint-enable no-unused-vars */

// Define function
function OrganizationProjects(props) {
  // Initialize variables
  const org = props.org;
  const listItems = [];
  org.projects.forEach(project => {
    if (!props.user.admin) {
      const username = props.user.username;
      if (project.permissions[username]) {
        listItems.push(<ListItem key={`proj-key-${project.id}`} className='proj-org-header'>
                        <a href={`/orgs/${org.id}/project/${project.id}/branches/master/elements`}>
                          {project.name}
                        </a>
                       </ListItem>);
      }
    }
    else {
      listItems.push(<ListItem key={`proj-key-${project.id}`} className='proj-org-header'>
                      <a href={`/orgs/${org.id}/projects/${project.id}/branches/master/elements`}>
                        {project.name}
                      </a>
                     </ListItem>);
    }
  });

  // Return the org's project list
  return (
    <React.Fragment>
      {/* Modal for creating a project */}
      <Modal isOpen={props.modal} toggle={props.handleToggle}>
        <ModalBody>
          <Create project={true} org={org} toggle={props.handleToggle}/>
        </ModalBody>
      </Modal>
      <div id='workspace'>
        <div id='workspace-header' className='workspace-header header-box-depth'>
           <h2 className='workspace-title workspace-title-padding'>Projects</h2>
          {/* Verify user has write permissions */}
          {(!props.write)
            ? ''
          // Display project create button
            : (<div className='workspace-header-button'>
                <Button className='btn'
                        outline color="secondary"
                        onClick={props.handleToggle}>
                  Create
                </Button>
              </div>)
          }
        </div>
        <div id='workspace-body' className='extra-padding'>
          {/* Display list of projects */}
          <List className='main-workspace'>
            {listItems}
          </List>
        </div>
      </div>
    </React.Fragment>
  );
}

// Export function
export default OrganizationProjects;
