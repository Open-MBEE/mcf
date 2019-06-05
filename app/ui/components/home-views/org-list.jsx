/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.home-views.org-list
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This creates the organization list.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';
import { Modal, ModalBody, UncontrolledTooltip } from 'reactstrap';

// MBEE Modules
import List from '../general/list/list.jsx';
import OrgListItem from '../shared-views/list-items/org-list-item.jsx';
import Delete from '../shared-views/delete.jsx';
import Create from '../shared-views/create.jsx';
import ProjList from './proj-list.jsx';

/* eslint-enable no-unused-vars */

class OrgList extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      showProjs: false,
      width: null,
      modalProjCreate: false,
      modalOrgDelete: false,
      projects: null
    };

    // Create reference
    this.ref = React.createRef();

    // Bind component functions
    this.handleShowProjsToggle = this.handleShowProjsToggle.bind(this);
    this.handleDeleteOrgToggle = this.handleDeleteOrgToggle.bind(this);
    this.handleCreateProjToggle = this.handleCreateProjToggle.bind(this);
  }

  // Define org toggle functionality
  handleShowProjsToggle() {
    // Set the state to opposite of its initial state
    this.setState({ showProjs: !this.state.showProjs });
  }

  // Define toggle function
  handleDeleteOrgToggle() {
    // Set the delete modal state
    this.setState({ modalOrgDelete: !this.state.modalOrgDelete });
  }

  // Define toggle function
  handleCreateProjToggle() {
    // Set the create modal state
    this.setState({ modalProjCreate: !this.state.modalProjCreate });
  }

  componentDidMount() {
    const projects = this.props.org.projects;
    const permissionedProjs = [];

    if (!this.props.admin) {
      const username = this.props.user.username;
      projects.forEach(project => {
        if (project.permissions[username]) {
          permissionedProjs.push(project);
        }
      });
    }
    else {
      projects.forEach(project => permissionedProjs.push(project));
    }

    this.setState({ projects: permissionedProjs });
  }

  render() {
    // Initialize variables
    const orgId = this.props.org.id;
    let icon;
    let projects;

    if (this.state.showProjs) {
      icon = 'fas fa-angle-down';
    }
    else {
      icon = 'fas fa-angle-right';
    }

    // Loop through project-views in each org
    if (this.state.projects) {
      projects = this.state.projects.map(
        project => (<ProjList project={project}
                              admin={this.props.admin}
                              key={`proj-key-${project.id}`}
                              orgid={this.props.org.id}/>)
      );
    }

    // Return the list of the orgs with project-views
    return (
      <React.Fragment>
        {/* Modal for creating an org */}
        <Modal isOpen={this.state.modalProjCreate} toggle={this.handleCreateProjToggle}>
          <ModalBody>
            <Create project={true} org={this.props.org}
                    toggle={this.handleCreateProjToggle}/>
          </ModalBody>
        </Modal>
        {/* Modal for deleting an org */}
        <Modal isOpen={this.state.modalOrgDelete} toggle={this.handleDeleteOrgToggle}>
          <ModalBody>
            <Delete org={this.props.org} toggle={this.handleDeleteOrgToggle}/>
          </ModalBody>
        </Modal>
        <div className='org-proj-list'>
          <div className='org-icon' onClick={this.handleShowProjsToggle}>
            <i className={icon}/>
          </div>
          <OrgListItem className='org-info' org={this.props.org} href={`/${orgId}`} divider={true}/>
          {((this.props.admin) || (this.props.write))
            ? (<div className='controls-container'>
                <UncontrolledTooltip placement='top' target={`newproj-${orgId}`}>
                  New Project
                </UncontrolledTooltip>
                <i id={`newproj-${orgId}`} className='fas fa-plus add-btn' onClick={this.handleCreateProjToggle}/>
                  {(!this.props.admin)
                    ? ''
                    : (<React.Fragment>
                        <UncontrolledTooltip placement='top' target={`delete-${orgId}`}>
                          Delete
                        </UncontrolledTooltip>
                        <i id={`delete-${orgId}`} className='fas fa-trash-alt delete-btn' onClick={this.handleDeleteOrgToggle}/>
                      </React.Fragment>)
                  }
                </div>)
            : ''
          }
        </div>
        {(!this.state.showProjs)
          ? ''
          : (<List>
              {projects}
             </List>)
        }
      </React.Fragment>
    );
  }

}

// Export component
export default OrgList;
