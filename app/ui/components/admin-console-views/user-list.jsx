/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.admin-console-views.user-list
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the user list.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect, useRef } from 'react';
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
import PasswordEdit from '../profile-views/password-edit.jsx';
import { useApiClient } from '../context/ApiClientProvider.js';

// Define component
function UserList(props) {
  const { userService } = useApiClient();
  const userRef = useRef();
  const [width, setWidth] = useState(null);
  const [users, setUsers] = useState([]);
  const [modalCreate, setModalCreate] = useState(false);
  const [modalDelete, setModalDelete] = useState(false);
  const [modalEdit, setModalEdit] = useState(false);
  const [modalPassword, setModalPassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState(null);

  const handleResize = () => {
    // Set state to width of window
    setWidth(userRef.current.clientWidth);
  };

  const handleEditToggle = (user) => {
    // Verify username provided
    if (typeof user === 'object') {
      // Set selected user state
      setSelectedUser(user);
    }
    else {
      // Set selected user to null
      setSelectedUser(null);
    }
    // Toggle the modal
    setModalEdit((prevState) => !prevState);
  };

  const handleCreateToggle = () => {
    // Toggle the modal
    setModalCreate((prevState) => !prevState);
  };

  const handleDeleteToggle = (username) => {
    // Verify username provided
    if (typeof username === 'string') {
      // Set selected user state
      setSelectedUser(username);
    }
    else {
      setSelectedUser(null);
    }
    // Toggle the modal
    setModalDelete((prevState) => !prevState);
  };

  const handlePasswordToggle = () => {
    // Open or close modal
    setModalPassword((prevState) => !prevState);
  };

  const refreshUsers = async () => {
    // Set options for request
    const options = {
      includeArchived: true,
      sort: 'username'
    };

    // Request user data
    const [err, data] = await userService.get(options);

    // Set state
    if (err) setError(err);
    else if (data) setUsers(data);
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  let listedUsers;

  if (users) {
    listedUsers = users.map((user) => (
      <div className='user-info' key={`user-info-${user.username}`}>
        <UserListItem className='user-name'
                      adminState={true}
                      user={user}
                      adminLabel={true}
                      _key={`user-${user.username}`}
                      link={`/profile/${user.username}`}/>
        <div className='controls-container'>
          <UncontrolledTooltip placement='top' target={`edit-user-${user.username}`}>
            Edit
          </UncontrolledTooltip>
          <i id={`edit-user-${user.username}`}
             onClick={() => handleEditToggle(user)}
             className='fas fa-user-edit add-btn'/>
          <UncontrolledTooltip placement='top' target={`delete-${user.username}`}>
            Delete
          </UncontrolledTooltip>
          <i id={`delete-${user.username}`}
             className='fas fa-trash-alt delete-btn'
             onClick={() => handleDeleteToggle(user.username)}/>
        </div>
      </div>));
  }

  // Return user list
  return (
    <React.Fragment>
      {/* Modal for creating a local user */}
      <Modal isOpen={modalCreate} toggle={handleCreateToggle}>
        <ModalBody>
          <CreateUser toggle={handleCreateToggle}
                      refreshUsers={refreshUsers}/>
        </ModalBody>
      </Modal>
      {/* Modal for deleting a user */}
      <Modal isOpen={modalDelete} toggle={handleDeleteToggle}>
        <ModalBody>
          <DeleteUser toggle={handleDeleteToggle}
                      selectedUser={selectedUser}
                      refreshUsers={refreshUsers}/>
        </ModalBody>
      </Modal>
      {/* Modal for editing a user */}
      <Modal isOpen={modalEdit} toggle={handleEditToggle}>
        <ModalBody>
          <EditUser user={selectedUser}
                    viewingUser={{ admin: true }}
                    togglePasswordModal={handlePasswordToggle}
                    toggle={handleEditToggle}
                    refreshUsers={refreshUsers}/>
        </ModalBody>
      </Modal>
      <Modal isOpen={modalPassword} toggle={handlePasswordToggle}>
        <ModalBody>
          <PasswordEdit user={selectedUser}
                        toggle={handlePasswordToggle}/>
        </ModalBody>
      </Modal>
      {/* Display the list of users */}
      <div id='workspace' ref={userRef}>
        <div className='workspace-header header-box-depth'>
          <h2 className='workspace-title workspace-title-padding'>
            Users
          </h2>
          <div className='workspace-header-button'>
            <Button outline color="primary"
                    onClick={handleCreateToggle}>
              {(width > 600)
                ? 'Create'
                : (<i className='fas fa-plus add-btn'/>)
              }
            </Button>
            <Button outline color="danger"
                    onClick={handleDeleteToggle}>
              {(width > 600)
                ? 'Delete'
                : (<i className='fas fa-trash-alt delete-btn'/>)
              }
            </Button>
          </div>
        </div>
        {/* Verify there are orgs */}
        <div id='workspace-body' className='extra-padding'>
          {(users.length === 0)
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
                {listedUsers}
               </List>)
          }
        </div>
      </div>
    </React.Fragment>
  );
}

// Export component
export default UserList;
