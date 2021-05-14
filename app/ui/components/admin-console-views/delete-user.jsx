/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.admin-console-views.delete-user
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the delete user page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */


// React modules
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Form,
  FormGroup,
  Label,
  Button,
  UncontrolledAlert,
  Row,
  Col,
  Input,
  Spinner
} from 'reactstrap';

// MBEE modules
import { useApiClient } from '../context/ApiClientProvider.js';

/* eslint-enable no-unused-vars */

function DeleteUser(props) {
  const { userService } = useApiClient();
  const [username, setUsername] = useState(props.selectedUser || '');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const onSubmit = async () => {
    const options = {
      ids: username
    };
    // Make the request to delete user
    const [err, result] = await userService.delete(null, options);

    // Set the state
    if (err) {
      setError(err);
    }
    else if (result) {
      props.refreshUsers();
      props.toggle();
    }
  };

  const selectUser = (name) => {
    setUsername(name);
    setResults(null);
  };

  const doSearch = async (e) => {
    setResults('searching...');

    let query = username;

    // Disable form submit
    if (typeof e !== 'string') {
      e.preventDefault();
    }
    else if (e) {
      query = e;
    }

    // Set options for request
    const options = {
      q: query,
      limit: 5
    };

    // Send search request
    const [err, data] = await userService.search(null, options);

    // Set the state
    if (err) {
      setResults([]);
    }
    else if (data) {
      const userOpts = data.map((user) => (
        <div className='members-dropdown-item' key={`user-${user.username}`}
             onClick={() => selectUser(user.username)}>
          <span>{user.fname} {user.lname}</span>
          <span className='member-username'>@{user.username}</span>
        </div>));
      setResults(userOpts);
    }
  };

  const updateUsername = (e) => {
    setUsername(e.target.value);
    doSearch(e.target.value);
  };


  const selectedUser = props.selectedUser;
  // Set search results or loading icons ...
  let searchResults = '';

  if (results === 'Searching ...') {
    searchResults = (
      <div style={{ width: '100%', textAlign: 'center' }}>
        <Spinner type='grow' color='primary' />
        <span style={{ paddingLeft: '20px' }}>
          Searching ...
        </span>
      </div>
    );
  }
  else if (Array.isArray(results)) {
    searchResults = results;
  }

  // Return the project delete form
  return (
    <div id='workspace'>
      <div className='workspace-header'>
        <h2 className='workspace-title workspace-title-padding'>
          Delete User
        </h2>
      </div>
      <div className='extra-padding'>
        {(!error)
          ? ''
          : (<UncontrolledAlert color='danger'>
            {error}
          </UncontrolledAlert>)
        }
        <Form>
          {(!selectedUser)
            ? (<div style={{ paddingBottom: '10px' }}>
                <Row form>
                  <Col>
                    <Input type='search'
                           name='username'
                           style={{ width: '325px' }}
                           id='username'
                           autoComplete='off'
                           placeholder='Search User...'
                           value={username || ''}
                           onChange={updateUsername}/>
                  </Col>
                  <Col md={2} sm={4} xs={6} >
                    <Button outline color='primary'
                            type='submit'
                            onClick={doSearch}>
                      Search
                    </Button>
                  </Col>
                </Row>
              {(searchResults.length !== 0)
                ? (<div className='members-dropdown'>
                  {searchResults}
                </div>)
                : ''
              }
            </div>)
            : (<FormGroup>
                <Label for='username'>Do you want to delete {selectedUser}?</Label>
               </FormGroup>)
          }
          {/* Button to submit and delete project */}
          <Button color='danger' onClick={onSubmit}> Delete </Button>{' '}
          <Button outline onClick={props.toggle}> Cancel </Button>
        </Form>
      </div>
    </div>
  );
}

DeleteUser.propTypes = {
  selectedUser: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  toggle: PropTypes.func,
  refreshUsers: PropTypes.func
};

export default DeleteUser;
