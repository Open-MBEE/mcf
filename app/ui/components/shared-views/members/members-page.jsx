/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.shared-views.members.members-page
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders an org or project members page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';

// MBEE Modules
import { Button, Modal, ModalBody } from 'reactstrap';
import MemberEdit from './member-edit.jsx';

/* eslint-enable no-unused-vars */

class MembersPage extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      admin: false,
      modal: false,
      error: null
    };

    // Bind component functions
    this.handleToggle = this.handleToggle.bind(this);
  }

  // Define toggle function
  handleToggle() {
    // Set the create modal state
    this.setState({ modal: !this.state.modal });
  }

  render() {
    // Initialize variables
    let userperm;
    let users;

    if (this.props.org) {
      userperm = this.props.org.permissions;
      users = Object.keys(this.props.org.permissions);
    }
    else {
      userperm = this.props.project.permissions;
      users = Object.keys(this.props.project.permissions);
    }

    // Loop through project members
    const listItems = users.map(user => (<tr key={`key-${user}`}>
                <td>{user}</td>
                <td>{userperm[user]}</td>
              </tr>));

    // Return project member list
    return (
      <React.Fragment>
        {/* Modal for editing user roles */}
        <Modal isOpen={this.state.modal} toggle={this.handleToggle}>
          <ModalBody>
            {(this.props.project && !this.props.org)
              ? (<MemberEdit project={this.props.project}
                             toggle={this.handleToggle}/>)
              : (<MemberEdit org={this.props.org} toggle={this.handleToggle}/>)
            }
          </ModalBody>
        </Modal>
        <div id='workspace'>
          <div id='workspace-header' className='workspace-header'>
            <table className='workspace-title'>
              <tbody>
              <tr>
                <td className='user-title'><h2>Users</h2></td>
                <td><h2>Permissions</h2></td>
              </tr>
              </tbody>
            </table>
            {/* Verify user is admin */}
            {(!this.props.admin)
              ? ''
              : ( // Button to edit user roles
                <div className='workspace-header-button'>
                  <Button className='btn'
                          outline color="secondary"
                          onClick={this.handleToggle}>
                    Edit
                  </Button>
                </div>
              )
            }
          </div>
          <div id='workspace-body' className='extra-padding'>
            <div className='main-workspace table-padding'>
              <table className='table-width'>
                <tbody>
                  {listItems}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }

}

export default MembersPage;
