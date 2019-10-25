/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.home-views.home
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the homepage.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
import { Button, Modal, ModalBody } from 'reactstrap';

// MBEE modules
import List from '../general/list/list.jsx';
import OrgList from '../home-views/org-list.jsx';
import Create from '../shared-views/create.jsx';
import Delete from '../shared-views/delete.jsx';
import { InputGroup } from 'reactstrap';

// Define HomePage Component
class Home extends Component {

  /* eslint-enable no-unused-vars */

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      width: null,
      modal: false,
      modalCreate: false,
      modalDelete: false,
      user: null,
      orgs: [],
      admin: false,
      write: false,
      displayOrgs: {},
      error: null
    };

    // Create reference
    this.ref = React.createRef();

    // Bind component functions
    this.setMountedComponentStates = this.setMountedComponentStates.bind(this);
    this.handleModalToggle = this.handleModalToggle.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleDeleteToggle = this.handleDeleteToggle.bind(this);
    this.handleCreateToggle = this.handleCreateToggle.bind(this);
    this.onExpandChange = this.onExpandChange.bind(this);
    this.handleExpandCollapse = this.handleExpandCollapse.bind(this);
  }

  componentDidMount() {
    // eslint-disable-next-line no-undef
    mbeeWhoAmI((err, data) => {
      if (err) {
        this.setState({ error: err.responseText });
      }
      else {
        this.setState({ user: data });
        // Get project data
        $.ajax({
          method: 'GET',
          url: '/api/orgs?populate=projects&minified=true&includeArchived=true',
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

    // Initialize variables
    let writePermOrgs = [];

    if (!user.admin) {
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
    }
    else if (user.admin) {
      writePermOrgs = orgs;
    }

    // Verify there are orgs
    if (writePermOrgs.length > 0) {
      // Set write states
      this.setState({ write: true });
    }

    // Verify user is admin
    if (user.admin) {
      // Set admin state
      this.setState({ admin: user.admin });
    }

    const displayOrgs = {};

    orgs.forEach((org) => {
      displayOrgs[org.id] = true;
    });

    // Set the org state
    this.setState({ orgs: orgs, displayOrgs: displayOrgs });
  }

  componentWillUnmount() {
    // Remove event listener
    window.removeEventListener('resize', this.handleResize);
  }

  // Define resize functionality
  handleResize() {
    // Set state to width of window
    this.setState({ width: this.ref.current.clientWidth });
  }

  // Define modal toggle functionality
  handleModalToggle() {
    // Set the state to opposite of its initial state
    this.setState({ modal: !this.state.modal });
  }

  // Define toggle function
  handleDeleteToggle() {
    // Set the delete modal state
    this.setState({ modalDelete: !this.state.modalDelete });
  }

  // Define toggle function
  handleCreateToggle() {
    // Set the create modal state
    this.setState({ modalCreate: !this.state.modalCreate });
  }

  // Toggle the display value for an org
  onExpandChange(orgId, value) {
    const displayOrgs = this.state.displayOrgs;
    displayOrgs[orgId] = value;
    this.setState({ displayOrgs: displayOrgs });
  }

  handleExpandCollapse(event) {
    const name = event.target.name;
    const displayOrgs = this.state.displayOrgs;
    const expanded = (name === 'expand');

    Object.keys(displayOrgs).forEach((org) => {
      displayOrgs[org] = expanded;
    });

    this.setState({ displayOrgs: displayOrgs });
  }

  render() {
    // Initialize variables
    let titleClass = 'workspace-title workspace-title-padding';
    const list = [];

    // Loop through all orgs
    if (this.state.orgs.length > 0) {
      this.state.orgs.forEach(org => {
        const username = this.state.user.username;

        const showProj = (this.state.displayOrgs[org.id]);

        // Verify if system admin
        if (!this.state.user.admin) {
          // Verify admin permission on org
          if (org.permissions[username] === 'admin') {
            list.push(<OrgList org={org} key={`org-key-${org.id}`}
                               user={this.state.user}
                               write={this.state.write}
                               admin={this.state.admin}
                               showProjs={showProj}
                               onExpandChange={this.onExpandChange}/>);
          }
          // Verify write permissions and not archived org
          else if (org.permissions[username] === 'write' && !org.archived) {
            list.push(<OrgList org={org} key={`org-key-${org.id}`}
                               user={this.state.user}
                               write={this.state.write}
                               admin={this.state.admin}
                               showProjs={showProj}
                               onExpandChange={this.onExpandChange}/>);
          }
          // Verify read permissions and not archived org
          else if (org.permissions[username] === 'read' && !org.archived) {
            list.push(<OrgList org={org} key={`org-key-${org.id}`}
                               user={this.state.user}
                               admin={this.state.admin}
                               showProjs={showProj}
                               onExpandChange={this.onExpandChange}/>);
          }
        }
        else {
          list.push(<OrgList org={org} key={`org-key-${org.id}`}
                             user={this.state.user}
                             write={this.state.write}
                             admin={this.state.admin}
                             showProjs={showProj}
                             onExpandChange={this.onExpandChange}/>);
        }
      });
    }

    // Verify user is admin
    if (this.state.admin) {
      // Change class on title
      titleClass = 'workspace-title';
    }

    // Render the homepage
    return (
      <React.Fragment>
        { /* Modal for creating an org */ }
        <Modal isOpen={this.state.modalCreate} toggle={this.handleCreateToggle}>
          <ModalBody>
            <Create toggle={this.handleCreateToggle}/>
          </ModalBody>
        </Modal>
        { /* Modal for deleting an org */ }
        <Modal isOpen={this.state.modalDelete} toggle={this.handleDeleteToggle}>
          <ModalBody>
            <Delete orgs={this.state.orgs} toggle={this.handleDeleteToggle}/>
          </ModalBody>
        </Modal>
        { /* Display the list of projects */ }
        <div className='home-space' ref={this.ref}>
          <div className='workspace-header home-header'>
            <h2 className={titleClass}>Organizations</h2>
            { /* Verify user is an admin */ }
            {(!this.state.admin)
              ? ''
              // Display create and delete buttons
              : (
                <div className='workspace-header-button'>
                  <Button className='btn'
                          outline color='secondary'
                          onClick={this.handleCreateToggle}>
                    {/* Verify width of window */}
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
              )
            }
          </div>
          { /* Expand/Collapse Projects */ }
          <InputGroup id='grp-expand-collapse'>
            <Button id='btn-expand'
                    type='button'
                    name='expand'
                    onClick={this.handleExpandCollapse}>
              [ Expand ]
            </Button>
            <Button id='btn-collapse'
                    type='button'
                    name='collapse'
                    onClick={this.handleExpandCollapse}>
              [ Collapse ]
            </Button>
          </InputGroup>
          { /* Verify there are projects */ }
          <div className='extra-padding'>
            {(this.state.orgs.length === 0)
              ? (<div className='list-item'><h3> No organizations.</h3></div>)
              : (<List>{list}</List>)
            }
          </div>
        </div>
      </React.Fragment>
    );
  }

}

export default Home;
