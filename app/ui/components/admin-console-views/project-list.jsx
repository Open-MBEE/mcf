/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.admin-console-views.project-list
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the project list page with the orgs.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
import { Button, Modal, ModalBody } from 'reactstrap';

// MBEE modules
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
    // eslint-disable-next-line no-undef
    mbeeWhoAmI((err, data) => {
      // Verify if error
      if (err) {
        // Set error state
        this.setState({ error: err.responseText });
      }
      else {
        // Set user data
        this.setState({ user: data });
        // Initialize url data
        const base = '/api/orgs';
        const opt = 'populate=projects&includeArchived=true&minified=true';

        // Get project data
        $.ajax({
          method: 'GET',
          url: `${base}?${opt}`,
          statusCode: {
            200: (orgs) => {
              this.setMountedComponentStates(data, orgs);
            },
            401: (error) => {
              // Throw error and set state
              this.setState({ error: error.responseText });

              // Refresh when session expires
              window.location.reload();
            },
            404: (error) => {
              this.setState({ error: error.responseText });
            }
          }
        });
      }
    });
  }

  setMountedComponentStates(user, orgs) {
    // Add event listener for window resizing
    window.addEventListener('resize', this.handleResize);
    // Handle initial size of window
    this.handleResize();

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
                                                                    href={`/orgs/${orgId}/projects/${project.id}/branches/master/elements`}/>));

      // Verify if projects
      if (permProjects.length > 0) {
        // Set projects to true
        projectsAvaliable = true;
      }

      // Return the list of the orgs with project-views
      return (
        <React.Fragment>
            <ListItem key={`org-key-${org.id}`} className='proj-org-header'>
                <a href={`/orgs/${orgId}`} className={className}>{org.name}</a>
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
            <Create project={true} orgs={this.state.orgs} toggle={this.handleCreateToggle}/>
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
          <div className='workspace-header header-box-depth'>
            <h2 className='workspace-title'>Projects</h2>
            <div className='workspace-header-button'>
              <Button className='btn'
                            outline color="primary"
                            onClick={this.handleCreateToggle}>
                {(this.state.width > 600)
                  ? 'Create'
                  : (<i className='fas fa-plus add-btn'/>)
                }
              </Button>
              <Button className='btn'
                            outline color="danger"
                            onClick={this.handleDeleteToggle}>
                {(this.state.width > 600)
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

}

// Export component
export default ProjectList;
