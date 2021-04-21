/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.admin-console-views.project-list
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the project list page with the orgs.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal, ModalBody } from 'reactstrap';

// MBEE modules
import List from '../general/list/list.jsx';
import ListItem from '../general/list/list-item.jsx';
import ProjectListItem from '../shared-views/list-items/project-list-item.jsx';
import Create from '../shared-views/create.jsx';
import Delete from '../shared-views/delete.jsx';
import { useApiClient } from '../context/ApiClientProvider';

/* eslint-enable no-unused-vars */

// Define component
function ProjectList(props) {
  const { orgService } = useApiClient();
  const [width, setWidth] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [modalCreate, setModalCreate] = useState(false);
  const [modalDelete, setModalDelete] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState(null);

  const ref = useRef();

  const handleResize = () => {
    // Set state to width of window
    setWidth(ref.current.clientWidth);
  };

  const handleCreateToggle = () => {
    setModalCreate((prevState) => !prevState);
  };

  const handleDeleteToggle = () => {
    setModalDelete((prevState) => !prevState);
  };

  const refresh = () => {
    // eslint-disable-next-line no-undef
    mbeeWhoAmI(async (err, data) => {
      // Verify if error
      if (err) {
        // Set error state
        setError(err);
      }
      else {
        // Request data
        const options = {
          populate: 'projects',
          includeArchived: true
        };
        const [err2, orgData] = await orgService.get(options);

        // Set state
        if (err2) setError(err2);
        else if (orgData) setOrgs(orgData);
      }
    });
  };

  // On mount
  useEffect(() => {
    // Add event listener for window resizing
    window.addEventListener('resize', handleResize);
    // Handle initial size of window
    handleResize();

    // Set initial state
    refresh();

    // Clean up event listener
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  let projectsAvaliable = false;

  // Loop through all orgs
  const list = orgs.map(org => {
    // Initialize variables
    const orgId = org.id;
    const projects = org.projects;
    const permProjects = [];
    const archiveProj = org.archived;
    let className;

    // Verify if org is archived
    if (archiveProj) {
      className = 'archived-link';
    }
    // Verify there are projects in the org
    if (projects.length < 1) {
      // If there are not projects skip view rendering
      return;
    }

    // Push all projects to the viewable projects
    projects.forEach(project => permProjects.push(<ProjectListItem className='hover-darken project-hover'
                                                                  archiveProj={archiveProj}
                                                                  key={`proj-key-${project.id}`}
                                                                  project={project}
                                                                  link={`/orgs/${orgId}/projects/${project.id}/branches/master/elements`}/>));

    // Verify if projects
    if (permProjects.length > 0) {
      // Set projects to true
      projectsAvaliable = true;
    }

    // Return the list of the orgs with project-views
    return (
      <ListItem key={`org-key-${org.id}`}>
          <ListItem className='proj-org-header'>
              <Link to={`/orgs/${orgId}`} className={className}>{org.name}</Link>
          </ListItem>
          <List key={`org-list-key-${org.id}`}>
              {permProjects}
          </List>
      </ListItem>
    );
  });

  // Return project list
  return (
    <React.Fragment>
      {/* Modal for creating a project */}
      <Modal isOpen={modalCreate} toggle={handleCreateToggle}>
        <ModalBody>
          <Create project={true} orgs={orgs} toggle={handleCreateToggle}/>
        </ModalBody>
      </Modal>
      {/* Modal for deleting a project */}
      <Modal isOpen={modalDelete} toggle={handleDeleteToggle}>
        <ModalBody>
          <Delete orgs={orgs}
                  projects={true}
                  toggle={handleDeleteToggle}
                  refresh={refresh}/>
        </ModalBody>
      </Modal>
      {/* Display the list of project-views */}
      <div id='workspace' ref={ref}>
        <div className='workspace-header header-box-depth'>
          <h2 className='workspace-title'>Projects</h2>
          <div className='workspace-header-button'>
            <Button className='btn'
                          outline color="primary"
                          onClick={handleCreateToggle}>
              {(width > 600)
                ? 'Create'
                : (<i className='fas fa-plus add-btn'/>)
              }
            </Button>
            <Button className='btn'
                          outline color="danger"
                          onClick={handleDeleteToggle}>
              {(width > 600)
                ? 'Delete'
                : (<i className='fas fa-trash-alt delete-btn'/>)
              }
            </Button>
          </div>
        </div>
        <div id='workspace-body' className='extra-padding'>
          {/* Verify there are project-views */}
          {(!projectsAvaliable)
            ? (<div className='main-workspace list-item'>
                <h3> No projects. </h3>
               </div>)
            : (<List className='main-workspace' key='main-list'>
                {list}
               </List>)
          }
        </div>
      </div>
    </React.Fragment>
  );
}

// Export component
export default ProjectList;
