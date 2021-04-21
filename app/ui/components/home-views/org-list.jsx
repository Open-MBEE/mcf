/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.home-views.org-list
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This creates the organization list.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
import { Modal, ModalBody, UncontrolledTooltip } from 'reactstrap';

// MBEE modules
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
    this.refresh = this.refresh.bind(this);
  }

  // Define org toggle functionality
  handleShowProjsToggle() {
    // Set the state to opposite of its initial state
    this.props.onExpandChange(this.props.org.id, !this.props.showProjs);
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

  refresh() {
    const projects = this.props.org.projects;
    const permissionedProjs = [];

    // Verify if system admin
    if (!this.props.admin) {
      const username = this.props.user.username;
      projects.forEach(project => {
        const perm = project.permissions[username];

        // Verify if user can see project
        if (perm === 'admin'
          || (!project.archived
            && (perm === 'write' || perm === 'read' || project.visibility === 'internal'))) {
          permissionedProjs.push(project);
        }
      });
    }
    else {
      projects.forEach(project => permissionedProjs.push(project));
    }
    this.setState({ projects: permissionedProjs });
  }

  componentDidMount() {
    this.refresh();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.props.org.projects !== prevProps.org.projects) this.refresh();
  }

  render() {
    // Initialize variables
    const orgId = this.props.org.id;
    let icon;
    let projects;
    let archiveProj = false;

    if (this.props.showProjs) {
      icon = 'fas fa-angle-down';
    }
    else {
      icon = 'fas fa-angle-right';
    }

    if (this.props.org.archived) {
      archiveProj = true;
    }
    // Loop through project-views in each org
    if (this.state.projects) {
      projects = this.state.projects.map(
        project => (<ProjList project={project}
                              admin={this.props.admin}
                              key={`proj-key-${project.id}`}
                              orgid={this.props.org.id}
                              archiveProj={archiveProj}
                              refresh={this.props.refresh}/>)
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
            <Delete org={this.props.org}
                    toggle={this.handleDeleteOrgToggle}
                    refresh={this.props.refresh}/>
          </ModalBody>
        </Modal>
        <div className='org-proj-list'>
          <div className='org-icon' onClick={this.handleShowProjsToggle}>
            <i className={icon}/>
          </div>
          <OrgListItem className='org-info' org={this.props.org} link={`/orgs/${orgId}`} divider={true}/>
          {((this.props.admin) || (this.props.write))
            ? (<div className='controls-container'>
                <UncontrolledTooltip placement='top' target={`newproj-${orgId}`}>
                  New Project
                </UncontrolledTooltip>
                <i id={`newproj-${orgId}`} className='fas fa-plus add-btn' onClick={this.handleCreateProjToggle}/>
                  {(!this.props.admin || orgId === 'default')
                    ? <i id={`delete-${orgId}`} className='fas fa-trash-alt transparent' />
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
        {(!this.props.showProjs)
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
