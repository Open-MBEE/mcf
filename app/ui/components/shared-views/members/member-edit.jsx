/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.shared-views.members.member-edit
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the user role edit page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect, useRef } from 'react';
import {
  Form,
  FormGroup,
  FormFeedback,
  Label,
  Input,
  Button,
  UncontrolledAlert
} from 'reactstrap';

// MBEE modules
import { useApiClient } from '../../context/ApiClientProvider';

/* eslint-enable no-unused-vars */

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

// Define component
function MemberEdit(props) {
  const { orgService, projectService, userService } = useApiClient();
  const [username, setUsername] = useState(props.selectedUser ? props.selectedUser.username : '');
  const [permissions, setPermissions] = useState(props.selectedUser ? props.selectedUser.perm : '');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const prevSelectedUser = usePrevious(props.selectedUser);
  const prevResults = usePrevious(props.results);

  const handleChange = (e) => {
    setPermissions(e.target.value);
  };

  const selectUser = (name) => {
    setUsername(name);
    setResults(null);

    if (props.org) {
      if (props.org.permissions.hasOwnProperty(name)) {
        setPermissions(props.org.permissions[name]);
      }
    }
    else if (props.project.permissions.hasOwnProperty(name)) {
      setPermissions(props.project.permissions[username]);
    }
    else {
      setPermissions('');
    }
  };

  const onSubmit = async () => {
    if (error) setError(null);

    // Set data to submit
    const data = {
      permissions: {
        [username]: permissions
      }
    };

    // Initialize options for request
    let patch;
    const options = {};
    if (props.org) {
      patch = (d, o) => orgService.patch(d, o);
      data.id = props.org.id;
    }
    else {
      patch = (d, o) => projectService.patch(props.project.org, d, o);
      data.id = props.project.id;
    }

    // Make the request
    const [err, result] = await patch(data, options);

    // Set the state
    if (err) setError(err);
    else if (result) props.refresh();
  };

  const doSearch = async (e) => {
    setResults([]);

    let query;

    // Disable form submit
    if (typeof e !== 'string') {
      e.preventDefault();
    }
    else if (e) {
      query = e;
    }

    const options = {
      limit: 5
    };

    // Make the search request
    const [err, searchData] = await userService.search(query, options);

    // Set the state
    if (err === 'No users found.') {
      // Try the username endpoint
      const options2 = {
        usernames: query
      };
      const [err2, findData] = await userService.get(options2);

      // Set the state
      if (err2) {
        setResults([]);
      }
      else if (findData) {
        const user = findData[0];
        const userOpt = (
          <div className='members-dropdown-item' key={`user-${user.username}`}
               onClick={() => selectUser(user.username)}>
            <span>{user.fname} {user.lname}</span>
            <span className='member-username'>@{user.username}</span>
          </div>
        );
        setResults(userOpt);
      }
    }
    else if (searchData) {
      const userOpts = searchData.map((user) => (
        <div className='members-dropdown-item' key={`user-${user.username}`}
             onClick={() => selectUser(user.username)}>
          <span>{user.fname} {user.lname}</span>
          <span className='member-username'>@{user.username}</span>
        </div>));

      setResults(userOpts);
    }
  };

  const resetForm = () => {
    setUsername('');
    setPermissions('');
    setResults(null);
  };

  const userChange = (e) => {
    setUsername(e.target.value);
    doSearch(e.target.value);
    if (e.target.value.length === 0) resetForm();
  };

  // on update
  useEffect(() => {
    if (props.selectedUser !== prevSelectedUser && props.selectedUser !== null) {
      setUsername(props.selectedUser.username);
      setPermissions(props.selectedUser.perm);
    }
    if ((results !== prevResults) && (username.length === 0)) {
      setResults(null);
    }
  }, [props]);


  const org = props.org;
  const project = props.project;
  const title = (org) ? org.name : project.name;

  // Check if user is a member of the Org or Project
  const orgMember = (org && org.permissions.hasOwnProperty(username));
  const projMember = (project && project.permissions.hasOwnProperty(username));

  const btnTitle = (orgMember || projMember) ? 'Save' : 'Add';
  const header = (orgMember || projMember) ? 'Modify User' : 'Add user';

  // Display error if permission is invalid or User not found
  const notFound = (results && results.length === 0 && username !== '') ? 'User not found.' : '';

  const searchResults = (Array.isArray(results) && results.length > 0)
    ? (<div className='members-dropdown'>
      {results}
    </div>)
    : '';

  return (
    <div className='extra-padding'>
      <h2>{header}</h2>
      <hr/>
      <React.Fragment>
        <h3> {title} </h3>
        { (!error) ? '' : (<UncontrolledAlert color="danger">{error}</UncontrolledAlert>) }
        {/* Create form to update user roles */}
        <FormGroup style={{ margin: '0' }}>
          <Input type='search'
                 name='username'
                 id='username'
                 autoComplete='off'
                 placeholder='Search User...'
                 value={username || ''}
                 invalid={notFound.length > 0}
                 onChange={userChange}/>
          { searchResults }
          <FormFeedback>
            { notFound }
          </FormFeedback>
        </FormGroup>
        <Form style={{ paddingTop: '10px' }}>
          {/* Permissions user updates with */}
          <FormGroup>
            <Label for='permissions'>Permissions</Label>
            <Input type='select'
                   name='permissions'
                   id='permissions'
                   value={permissions}
                   onChange={handleChange}>
              <option>Choose one...</option>
              <option>read</option>
              <option>write</option>
              <option>admin</option>
              <option>REMOVE_ALL</option>
            </Input>
          </FormGroup>
        </Form>
        {/* Button to submit changes */}
        <Button onClick={onSubmit} disabled={notFound.length > 0}>{btnTitle}</Button>
      </React.Fragment>
    </div>
  );
}

// Export component
export default MemberEdit;
