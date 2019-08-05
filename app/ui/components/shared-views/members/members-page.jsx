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
import { Button, Modal, ModalBody, UncontrolledTooltip } from 'reactstrap';
import MemberEdit from './member-edit.jsx';
import UserListItem from '../list-items/user-list-item.jsx';
import List from '../../general/list/list.jsx';

/* eslint-enable no-unused-vars */

class MembersPage extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      admin: false,
      modal: false,
      selectedUser: null,
      error: null
    };

    // Bind component functions
    this.handleToggle = this.handleToggle.bind(this);
  }

  // Define toggle function
  handleToggle(username, perm) {
    // Verify username provided
    if (typeof username === 'string') {
      // Set selected user state
      this.setState({ selectedUser: { username: username, perm: perm } });
    }
    else {
      this.setState({ selectedUser: null });
    }
  }

  render() {
    // Initialize variables
    let userperm;
    let users;
    let title;

    if (this.props.org) {
      userperm = this.props.org.permissions;
      users = Object.keys(this.props.org.permissions);
      title = this.props.org.name;
    }
    else {
      userperm = this.props.project.permissions;
      users = Object.keys(this.props.project.permissions);
      title = this.props.project.name;
    }

    // Loop through project members
    const listItems = users.map(user => {
      const perm = userperm[user];
      return (
        <div className='user-info' key={`user-info-${user}`}>
          <UserListItem className='user-name'
                        user={user}
                        permission={perm}
                        _key={`key-${user}`}
                        href={`/profile/${user}`}/>
          <div className='controls-container'>
            <UncontrolledTooltip placement='top'
                                 target={`edit-${user}-roles`}>
              Edit
            </UncontrolledTooltip>
            <i id={`edit-${user}-roles`}
               className='fas fa-user-edit add-btn'
               onClick={() => this.handleToggle(user, perm)}/>
          </div>
        </div>
      );
    });

    // Return project member list
    return (
      <React.Fragment>
        <div id='workspace'>
          <div id='workspace-header' className='workspace-header header-box-depth'>
            <h2 className='workspace-title workspace-title-padding'>
              Members of {title}
            </h2>
          </div>
          <div id='workspace-body' className='extra-padding'>
            <div className='main-workspace table-padding'>
              <div className='roles-box'>
                {(this.props.project && !this.props.org)
                  ? (<MemberEdit project={this.props.project}
                                 selectedUser={this.state.selectedUser}/>)
                  : (<MemberEdit org={this.props.org}
                                 selectedUser={this.state.selectedUser}/>)
                }
              </div>
              <List className='members-box'>
                <div className='template-header' key='user-info-template'>
                  <UserListItem className='head-info'
                                label={true}
                                user={{ fname: 'Name',
                                  lname: '',
                                  username: 'Username' }}
                                permission={'admin'}
                                _key='user-template'/>
                </div>
                {listItems}
              </List>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }

}

export default MembersPage;
