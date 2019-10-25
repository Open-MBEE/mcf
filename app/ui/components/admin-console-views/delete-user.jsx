/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.admin-console-views.delete-user
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the delete user page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
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

/* eslint-enable no-unused-vars */

class DeleteUser extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      users: [],
      username: '',
      results: null,
      error: null
    };

    if (this.props.selectedUser) {
      this.state.username = this.props.selectedUser;
    }

    // Bind component functions
    this.handleChange = this.handleChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.updateUsername = this.updateUsername.bind(this);
    this.selectUser = this.selectUser.bind(this);
    this.doSearch = this.doSearch.bind(this);
  }

  // Define handle change function
  handleChange(event) {
    // Set the state of the changed states in the form
    this.setState({ [event.target.name]: event.target.value });
  }

  // Define the on submit function
  onSubmit() {
    // Initialize project data
    const url = `/api/users/${this.state.username}`;

    // Delete the project selected
    $.ajax({
      method: 'DELETE',
      url: `${url}?minified=true`,
      contentType: 'application/json',
      statusCode: {
        200: () => {
          // On success, return to the project-views page
          window.location.reload();
        },
        401: (err) => {
          this.setState({ error: err.responseText });

          // Refresh when session expires
          window.location.reload();
        },
        403: (err) => {
          this.setState({ error: err.responseText });
        }
      }
    });
  }

  // Define update username
  updateUsername(event) {
    this.setState({ username: event.target.value });
    this.doSearch(event.target.value);
  }

  selectUser(username) {
    this.setState({ username: username, results: null });
  }

  doSearch(e) {
    // Pre-search state resets
    this.setState({
      message: '',
      results: 'Searching ...'
    }, () => { this.render(); });

    let query = this.state.username;

    // Disable form submit
    if (typeof e !== 'string') {
      e.preventDefault();
    }
    else if (e) {
      query = e;
    }

    // Build query URL
    const url = '/api/users/search';
    // Do ajax request
    $.ajax({
      method: 'GET',
      url: `${url}?q=${query}&limit=5&minified=true`,
      statusCode: {
        401: () => {
          // Refresh when session expires
          window.location.reload();
        }
      }
    })
    .done(data => {
      // Loop through users
      const userOpts = data.map((user) => (
        <div className='members-dropdown-item' key={`user-${user.username}`}
             onClick={() => this.selectUser(user.username)}>
          <span>{user.fname} {user.lname}</span>
          <span className='member-username'>@{user.username}</span>
        </div>));

      this.setState({
        results: userOpts
      });
    })
    .fail(res => {
      // Verify failed status
      // Set empty results array
      if (res.status === 404) {
        this.setState({ results: [] });
      }
      if (res.status === 400) {
        this.setState({ results: [] });
      }
    });
  }

  render() {
    const selectedUser = this.props.selectedUser;
    // Set search results or loading icons ...
    let searchResults = '';

    if (this.state.results === 'Searching ...') {
      searchResults = (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <Spinner type='grow' color='primary' />
          <span style={{ paddingLeft: '20px' }}>
            Searching ...
          </span>
        </div>
      );
    }
    else if (Array.isArray(this.state.results)) {
      searchResults = this.state.results;
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
          {(!this.state.error)
            ? ''
            : (<UncontrolledAlert color='danger'>
              {this.state.error}
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
                             value={this.state.username || ''}
                             onChange={this.updateUsername}/>
                    </Col>
                    <Col md={2} sm={4} xs={6} >
                      <Button outline color='primary'
                              type='submit'
                              onClick={this.doSearch}>
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
            <Button color='danger' onClick={this.onSubmit}> Delete </Button>{' '}
            <Button outline onClick={this.props.toggle}> Cancel </Button>
          </Form>
        </div>
      </div>
    );
  }

}

export default DeleteUser;
