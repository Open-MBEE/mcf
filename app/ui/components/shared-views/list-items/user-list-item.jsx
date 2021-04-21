/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.shared-views.list-items.user-list-item
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the user list items.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// MBEE modules
import StatsList from '../../general/stats/stats-list.jsx';
import Stat from '../../general/stats/stat.jsx';
import { useApiClient } from '../../context/ApiClientProvider.js';

/* eslint-enable no-unused-vars */

// Define component
function UserListItem(props) {
  const { userService } = useApiClient();
  const listItemRef = useRef();
  const [user, setUser] = useState(props.user);
  const [width, setWidth] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState(null);

  const handleResize = () => {
    setWidth(listItemRef.current.clientWidth);
  };

  const populateUserData = async () => {
    if (!props.label) {
      if (typeof user !== 'object') {
        // Set options for request
        const options = {
          usernames: user,
          includeArchived: true
        };
        // Get user data
        const [err, users] = await userService.get(options);

        // Set the state
        if (err) setError(err);
        if (users) setUser(users[0]);
      }
      else if (user !== props.user) {
        setUser(props.user);
      }
    }
  };

  // Set resize listener
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    // Set initial size of window
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get user if needed
  useEffect(() => {
    populateUserData();
  }, [props.user]);


  // Initialize variables
  const perm = props.permission;
  let name;
  let classNames = 'list-header';
  let minimizeClass;
  let stats;
  let archivedClass;

  if (props.label) {
    classNames = 'template-item minimize';
    minimizeClass = 'minimize';
  }

  if (props.adminLabel && user.admin) {
    stats = (<StatsList className='stats-list-member'>
              <Stat title='Admin'
                    icon='fas fa-check'
                    className={minimizeClass}
                    label={props.label}
                    _key={props._key}/>
             </StatsList>);
  }
  else if (perm) {
    if (!props.label) {
      minimizeClass = 'spacing minimize';
    }
    let permChecks;
    // Verify which permissions user has
    if (perm === 'admin') {
      // Add read permission check
      permChecks = [
        <Stat title='Read'
              icon='fas fa-check'
              className={minimizeClass}
              label={props.label}
              noToolTip={true}
              key={`read-${user.username}`}
              _key={`read-${user.username}`}/>,
        <Stat title='Write'
              icon='fas fa-check'
              className={minimizeClass}
              label={props.label}
              noToolTip={true}
              key={`write-${user.username}`}
              _key={`write-${user.username}`}/>,
        <Stat title='Admin'
              icon='fas fa-check'
              className={minimizeClass}
              label={props.label}
              noToolTip={true}
              key={`admin-${user.username}`}
              _key={`admin-${user.username}`}/>
      ];
    }
    else if (perm === 'write') {
      permChecks = [
        <Stat title='Read'
              icon='fas fa-check'
              className={minimizeClass}
              label={props.label}
              noToolTip={true}
              key={`read-${user.username}`}
              _key={`read-${user.username}`}/>,
        <Stat title='Write'
              icon='fas fa-check'
              className={minimizeClass}
              label={props.label}
              noToolTip={true}
              key={`write-${user.username}`}
              _key={`write-${user.username}`}/>,
        <Stat title='Admin'
              icon='fas fa-window-minimize'
              className={minimizeClass}
              label={props.label}
              noToolTip={true}
              key={`admin-${user.username}`}
              _key={`admin-${user.username}`}/>
      ];
    }
    else if (perm === 'read') {
      // Add admin permission check
      permChecks = [
        <Stat title='Read'
              icon='fas fa-check'
              className={minimizeClass}
              label={props.label}
              noToolTip={true}
              key={`read-${user.username}`}
              _key={`read-${user.username}`}/>,
        <Stat title='Write'
              icon='fas fa-window-minimize'
              className={minimizeClass}
              label={props.label}
              noToolTip={true}
              key={`write-${user.username}`}
              _key={`write-${user.username}`}/>,
        <Stat title='Admin'
              icon='fas fa-window-minimize'
              className={minimizeClass}
              label={props.label}
              noToolTip={true}
              key={`admin-${user.username}`}
              _key={`admin-${user.username}`}/>
      ];
    }

    // Return new stat list
    stats = (
      <StatsList className='stats-list-member' key='statlist-perms'>
        {permChecks}
      </StatsList>);
  }

  if (user && user.fname) {
    name = `${user.fname} ${user.lname}`;
  }

  if (user.archived) {
    archivedClass = 'grayed-out';
  }

  // Render the user stat list items
  return (
    <div className={`stats-list-item ${props.className}`} ref={listItemRef}>
      <div id='user-list-items' className={classNames}>
        { props.link
          ? (<Link to={props.link}>
              <span className={archivedClass}>
                {name}
              </span>
            </Link>)
          : <span className={archivedClass}>{name}</span>
        }
        <div className={archivedClass}>
          <span>{user.username}</span>
        </div>
        {(!props.adminState)
          ? ''
          : (<React.Fragment>
            <div className={archivedClass}>
              <span>{user.preferredName}</span>
            </div>
            <div className={archivedClass}>
              <span>{user.email}</span>
            </div>
          </React.Fragment>)
        }
      </div>
      {(width > 600) ? stats : ''}
    </div>
  );
}

// Export component
export default UserListItem;
