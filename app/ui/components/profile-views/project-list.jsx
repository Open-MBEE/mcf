/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.profile-views.project-list
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the project list page with the orgs.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';
import { Button, Modal, ModalBody } from 'reactstrap';

// MBEE Modules
import List from '../general/list/list.jsx';
import ListItem from '../general/list/list-item.jsx';
import ProjectListItem from '../shared-views/list-items/project-list-item.jsx';
import Create from '../shared-views/create.jsx';
import Delete from '../shared-views/delete.jsx';

/* eslint-enable no-unused-vars */

// Define component
class ProjectList extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      width: null,
      orgs: [],
      admin: false,
      write: false,
      writePermOrgs: null,
      modalCreate: false,
      modalDelete: false,
      error: null
    };

    // Create reference
    this.ref = React.createRef();

    // Bind component functions
    this.handleResize = this.handleResize.bind(this);
    this.handleCreateToggle = this.handleCreateToggle.bind(this);
    this.handleDeleteToggle = this.handleDeleteToggle.bind(this);
    this.setMountedComponentStates = this.setMountedComponentStates.bind(this);
  }

  componentDidMount() {
    const url = '/api/users/whoami?minified=true';

    // Get project data
    $.ajax({
      method: 'GET',
      url: url,
      statusCode: {
        200: (user) => {
          // Get project data
          $.ajax({
            method: 'GET',
            url: '/api/orgs?populate=projects&minified=true',
            statusCode: {
              200: (orgs) => {
                this.setMountedComponentStates(user, orgs);
              },
              401: (err) => {
                // Throw error and set state
                this.setState({ error: err.responseJSON.description });

                // Refresh when session expires
                window.location.reload();
              },
              404: (err) => {
                this.setState({ error: err.responseJSON.description });
              }
            }
          });
        },
        401: (err) => {
          // Throw error and set state
          this.setState({ error: err.responseJSON.description });

          // Refresh when session expires
          window.location.reload();
        },
        404: (err) => {
          this.setState({ error: err.responseJSON.description });
        }
      }
    });
  }

  setMountedComponentStates(user, orgs) {
    // Initialize variables
    const writePermOrgs = [];

    // Add event listener for window resizing
    window.addEventListener('resize', this.handleResize);
    // Handle initial size of window
    this.handleResize();

    // Loop through orgs
    orgs.forEach((org) => {
      // Initialize variables
      const perm = org.permissions[user.username];

      // Verify if user has write or admin permissions
      if ((perm === 'write') || (perm === 'admin')) {
        // Push the org to the org permissions
        writePermOrgs.push(org);
      }
    });

    // Verify there are orgs
    if (writePermOrgs.length > 0) {
      // Set write states
      this.setState({ write: true });
      this.setState({ writePermOrgs: writePermOrgs });
    }

    // Verify user is admin
    if (user.admin) {
      // Set admin state
      this.setState({ admin: user.admin });
    }

    // Set the org state
    this.setState({ orgs: orgs });
  }

  componentWillUnmount() {
    // Remove event listener
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize() {
    // Set state to width of window
    this.setState({ width: this.ref.current.clientWidth });
  }

  // Define toggle function
  handleCreateToggle() {
    // Set create modal state
    this.setState({ modalCreate: !this.state.modalCreate });
  }

  // Define toggle function
  handleDeleteToggle() {
    // Set delete modal state
    this.setState({ modalDelete: !this.state.modalDelete });
  }

  render() {
    let projectsAvaliable = false;

    // Loop through all orgs
    const list = this.state.orgs.map(org => {
      // Initialize variables
      const orgId = org.id;
      const projects = org.projects;
      const permProjects = [];

      if (!this.props.admin) {
        const username = this.props.user.username;
        projects.forEach(project => {
          if (project.permissions[username]) {
            permProjects.push(<ProjectListItem className='hover-darken project-hover'
                                               key={`proj-key-${project.id}`}
                                               project={project}
                                               href={`/${orgId}/${project.id}`}/>);
          }
        });
      }
      else {
        projects.forEach(project => permProjects.push(<ProjectListItem className='hover-darken project-hover'
                                                                      key={`proj-key-${project.id}`}
                                                                      project={project}
                                                                      href={`/${orgId}/${project.id}`}/>));
      }

      // Verify if projects
      if (permProjects.length > 0) {
        // Set projects to true
        projectsAvaliable = true;
      }

      // Return the list of the orgs with project-views
      return (
        <React.Fragment>
            <ListItem key={`org-key-${org.id}`} className='proj-org-header'>
                <a href={`/${orgId}`}>{org.name}</a>
            </ListItem>
            <List key={`org-list-key-${org.id}`}>
                {permProjects}
            </List>
        </React.Fragment>
      );
    });

    // Return project list
    return (
      <React.Fragment>
        {/* Modal for creating a project */}
        <Modal isOpen={this.state.modalCreate} toggle={this.handleCreateToggle}>
          <ModalBody>
            {/* Verify user has write and admin permissions */}
            {(this.state.admin)
              // Allow access to all orgs
              ? <Create project={true} orgs={this.state.orgs} toggle={this.handleCreateToggle}/>
              // Allow access to write orgs only
              : <Create project={true}
                        orgs={this.state.writePermOrgs}
                        toggle={this.handleCreateToggle}/>
            }
            </ModalBody>
        </Modal>
        {/* Modal for deleting a project */}
        <Modal isOpen={this.state.modalDelete} toggle={this.handleDeleteToggle}>
          <ModalBody>
            <Delete orgs={this.state.orgs}
                    projects={true}
                    toggle={this.handleDeleteToggle}/>
          </ModalBody>
        </Modal>
        {/* Display the list of project-views */}
        <div id='workspace' ref={this.ref}>
          <div id='workspace-header' className='workspace-header'>
            <h2 className='workspace-title'>Your Projects</h2>
            <div className='workspace-header-button'>
              {/* Verify user has write permission */}
              {(!this.state.write)
                ? ''
                // Display create button
                : (<Button className='btn'
                            outline color="secondary"
                            onClick={this.handleCreateToggle}>
                  {(this.state.width > 600)
                    ? 'Create'
                    : (<i className='fas fa-plus add-btn'/>)
                  }
                  </Button>)
              }
              {/* Verify user has admin permissions */}
              {(!this.state.admin)
                ? ''
                // Display delete button
                : (<Button className='btn'
                            outline color="danger"
                            onClick={this.handleDeleteToggle}>
                  {(this.state.width > 600)
                    ? 'Delete'
                    : (<i className='fas fa-trash-alt delete-btn'/>)
                  }
                  </Button>)
              }
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

}

// Export component
export default ProjectList;
