/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.admin-console-views.user-list
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the user list.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
import {
  Button,
  Modal,
  ModalBody, UncontrolledTooltip
} from 'reactstrap';

// MBEE modules
import List from '../general/list/list.jsx';
import UserListItem from '../shared-views/list-items/user-list-item.jsx';
import CreateUser from './create-user.jsx';
import DeleteUser from './delete-user.jsx';
import EditUser from '../profile-views/profile-edit.jsx';

// Define component
class UserList extends Component {

  /* eslint-enable no-unused-vars */

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      width: null,
      users: [],
      modalCreate: false,
      modalDelete: false,
      modalEdit: false,
      selectedUser: null,
      error: null
    };

    // Create reference
    this.ref = React.createRef();

    this.handleResize = this.handleResize.bind(this);
    this.handleEditToggle = this.handleEditToggle.bind(this);
    this.handleCreateToggle = this.handleCreateToggle.bind(this);
    this.handleDeleteToggle = this.handleDeleteToggle.bind(this);
  }

  handleDeleteToggle(username) {
    // Verify username provided
    if (typeof username === 'string') {
      // Set selected user state
      this.setState({ selectedUser: username });
    }
    else {
      this.setState({ selectedUser: null });
    }
    // Toggle the modal
    this.setState((prevState) => ({ modalDelete: !prevState.modalDelete }));
  }

  handleEditToggle(username) {
    // Verify username provided
    if (typeof username === 'object') {
      // Set selected user state
      this.setState({ selectedUser: username });
    }
    else {
      // Set selected user to null
      this.setState({ selectedUser: null });
    }
    // Toggle the modal
    this.setState((prevState) => ({ modalEdit: !prevState.modalEdit }));
  }

  handleCreateToggle() {
    // Toggle the modal
    this.setState((prevState) => ({ modalCreate: !prevState.modalCreate }));
  }

  componentDidMount() {
    const url = '/api/users';

    // Get project data
    $.ajax({
      method: 'GET',
      url: `${url}?minified=true&includeArchived=true`,
      statusCode: {
        200: (users) => {
          const result = users.sort((a, b) => {
            if (!a.username) {
              return 1;
            }
            else if (!b.username) {
              return -1;
            }
            else {
              const first = a.username;
              const second = b.username;

              if (first > second) {
                return 1;
              }
              else {
                return -1;
              }
            }
          });
          // Set states
          this.setState({ users: result });

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

  componentWillUnmount() {
    // Remove event listener
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize() {
    // Set state to width of window
    this.setState({ width: this.ref.current.clientWidth });
  }

  render() {
    let users;

    if (this.state.users) {
      users = this.state.users.map((user) => (
          <div className='user-info' key={`user-info-${user.username}`}>
            <UserListItem className='user-name'
                          adminState={true}
                          user={user}
                          adminLabel={true}
                          _key={`user-${user.username}`}
                          href={`/profile/${user.username}`}/>
            <div className='controls-container'>
              <UncontrolledTooltip placement='top' target={`edit-user-${user.username}`}>
                Edit
              </UncontrolledTooltip>
              <i id={`edit-user-${user.username}`}
                 onClick={() => this.handleEditToggle(user)}
                 className='fas fa-user-edit add-btn'/>
              <UncontrolledTooltip placement='top' target={`delete-${user.username}`}>
                Delete
              </UncontrolledTooltip>
              <i id={`delete-${user.username}`}
                 className='fas fa-trash-alt delete-btn'
                 onClick={() => this.handleDeleteToggle(user.username)}/>
            </div>
          </div>));
    }

    // Return user list
    return (
      <React.Fragment>
        {/* Modal for creating a local user */}
        <Modal isOpen={this.state.modalCreate} toggle={this.handleCreateToggle}>
          <ModalBody>
            <CreateUser toggle={this.handleCreateToggle}/>
          </ModalBody>
        </Modal>
        {/* Modal for deleting a user */}
        <Modal isOpen={this.state.modalDelete} toggle={this.handleDeleteToggle}>
          <ModalBody>
            <DeleteUser toggle={this.handleDeleteToggle}
                        selectedUser={this.state.selectedUser}/>
          </ModalBody>
        </Modal>
        {/* Modal for editing a user */}
        <Modal isOpen={this.state.modalEdit} toggle={this.handleEditToggle}>
          <ModalBody>
            <EditUser user={this.state.selectedUser}
                      onAdminPage={true}
                      viewingUser={{ admin: true }}
                      toggle={this.handleEditToggle}/>
          </ModalBody>
        </Modal>
        {/* Display the list of users */}
        <div id='workspace' ref={this.ref}>
          <div className='workspace-header header-box-depth'>
            <h2 className='workspace-title workspace-title-padding'>
              Users
            </h2>
            {/* Verify user is an admin */}
            <div className='workspace-header-button'>
              <Button outline color="primary"
                      onClick={this.handleCreateToggle}>
                {(this.state.width > 600)
                  ? 'Create'
                  : (<i className='fas fa-plus add-btn'/>)
                }
              </Button>
              <Button outline color="danger"
                      onClick={this.handleDeleteToggle}>
                {(this.state.width > 600)
                  ? 'Delete'
                  : (<i className='fas fa-trash-alt delete-btn'/>)
                }
              </Button>
            </div>
          </div>
          {/* Verify there are orgs */}
          <div id='workspace-body' className='extra-padding'>
            {(this.state.users.length === 0)
              ? (<div className='main-workspace list-item'>
                <h3> No users. </h3>
              </div>)
              : (<List>
                  <div className='template-header' key='user-info-template'>
                    <UserListItem className='head-info'
                                  adminState={true}
                                  label={true}
                                  user={{ fname: 'Name',
                                    lname: '',
                                    username: 'Username',
                                    preferredName: 'Preferred Name',
                                    email: 'E-mail',
                                    admin: true }}
                                  adminLabel={true}
                                  key='user-template'/>
                  </div>
                  {users}
                 </List>)
            }
          </div>
        </div>
      </React.Fragment>
    );
  }

}

// Export component
export default UserList;
