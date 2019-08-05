/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.profile-views.organization-list
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the orgs list.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';
import { Button, Modal, ModalBody } from 'reactstrap';

// MBEE Modules
import List from '../general/list/list.jsx';
import OrgListItem from '../shared-views/list-items/org-list-item.jsx';
import Create from '../shared-views/create.jsx';
import Delete from '../shared-views/delete.jsx';

/* eslint-enable no-unused-vars */

// Define component
class OrganizationList extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      width: null,
      orgs: [],
      admin: false,
      modalCreate: false,
      modalDelete: false,
      error: null
    };

    // Create reference
    this.ref = React.createRef();

    // Bind component functions
    this.handleCreateToggle = this.handleCreateToggle.bind(this);
    this.handleDeleteToggle = this.handleDeleteToggle.bind(this);
    this.handleResize = this.handleResize.bind(this);
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
          url: '/api/orgs?populate=projects&minified=true',
          statusCode: {
            200: (orgs) => {
              // Verify if admin user
              if (data.admin) {
                // Set admin state
                this.setState({ admin: data.admin });
              }

              // Set org state
              this.setState({ orgs: orgs });

              // Create event listener for window resizing
              window.addEventListener('resize', this.handleResize);
              // Handle initial size of window
              this.handleResize();
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
    // Set the create modal state
    this.setState({ modalCreate: !this.state.modalCreate });
  }

  // Define toggle function
  handleDeleteToggle() {
    // Set the delete modal state
    this.setState({ modalDelete: !this.state.modalDelete });
  }

  render() {
    // Loop through all orgs
    const orgs = this.state.orgs.map(org => <OrgListItem className='hover-darken' key={`org-key-${org.id}`} org={org} href={`/orgs/${org.id}`}/>);

    // Return org list
    return (
      <React.Fragment>
        {/* Modal for creating an org */}
        <Modal isOpen={this.state.modalCreate} toggle={this.handleCreateToggle}>
          <ModalBody>
            <Create toggle={this.handleCreateToggle}/>
          </ModalBody>
        </Modal>
        {/* Modal for deleting an org */}
        <Modal isOpen={this.state.modalDelete} toggle={this.handleDeleteToggle}>
          <ModalBody>
            <Delete orgs={this.state.orgs} toggle={this.handleDeleteToggle}/>
          </ModalBody>
        </Modal>
        {/* Display the list of orgs */}
        <div id='workspace' ref={this.ref}>
          <div id='workspace-header' className='workspace-header header-box-depth'>
            <h2 className='workspace-title workspace-title-padding'>
              Your Organizations
            </h2>
              {/* Verify user is an admin */}
              {(!this.state.admin)
                ? ''
                // Display create and delete buttons
                : (<div className='workspace-header-button'>
                    <Button className='btn'
                            outline color="secondary"
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
                  </div>)
              }
          </div>
          {/* Verify there are orgs */}
          <div id='workspace-body' className='extra-padding'>
            {(this.state.orgs.length === 0)
              ? (<div className='main-workspace list-item'>
                  <h3> No organizations. </h3>
                 </div>)
              : (<List className='main-workspace'>
                  {orgs}
                 </List>)
            }
          </div>
        </div>
      </React.Fragment>
    );
  }

}

// Export component
export default OrganizationList;
