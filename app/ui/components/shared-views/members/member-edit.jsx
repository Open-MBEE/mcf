/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.shared-views.members.member-edit
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the user role edit page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';
import {
  Form,
  FormGroup,
  Label,
  Input,
  Button,
  UncontrolledAlert, Spinner, Row, Col
} from 'reactstrap';

/* eslint-enable no-unused-vars */

// Define component
class MemberEdit extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      users: null,
      username: '',
      permissions: '',
      results: null,
      error: null
    };

    // Bind component functions
    this.handleChange = this.handleChange.bind(this);
    this.userChange = this.userChange.bind(this);
    this.selectUser = this.selectUser.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.doSearch = this.doSearch.bind(this);
    this.resetForm = this.resetForm.bind(this);
  }

  // Define handle change function
  handleChange(event) {
    // Change the state with new value
    this.setState({ [event.target.name]: event.target.value });
  }

  userChange(event) {
    this.setState({ username: event.target.value });

    this.doSearch(event.target.value);

    if (event.target.value.length === 0) {
      this.resetForm();
    }
  }

  selectUser(username) {
    this.setState({ username: username, results: null });

    // Verify if org provided
    if (this.props.org) {
      if (this.props.org.permissions.hasOwnProperty(username)) {
        this.setState({ permissions: this.props.org.permissions[username] });
      }
    }
    else if (this.props.project.permissions.hasOwnProperty(username)) {
      this.setState({ permissions: this.props.project.permissions[username] });
    }
    else {
      this.setState({ permissions: '' });
    }
  }

  // Define the submit function
  onSubmit() {
    // Initialize variables
    const username = this.state.username;
    let url;
    const data = {
      permissions: {
        [username]: this.state.permissions
      }
    };

    if (this.state.error) {
      this.setState({ error: null });
    }

    // Verify if org provided
    if (this.props.org) {
      // Set url and redirect to org information
      url = `/api/orgs/${this.props.org.id}`;
    }
    else {
      // Set url and redirect to project information
      url = `/api/orgs/${this.props.project.org}/projects/${this.props.project.id}`;
    }

    // Send a patch request to update data
    $.ajax({
      method: 'PATCH',
      url: `${url}?minified=true`,
      data: JSON.stringify(data),
      contentType: 'application/json',
      statusCode: {
        200: () => {
          // Update the page to reload to user page
          window.location.reload();
        },
        400: (err) => {
          this.setState({ error: err.responseText });
        },
        401: (err) => {
          this.setState({ error: err.responseText });

          // Refresh when session expires
          window.location.reload();
        },
        404: (err) => {
          this.setState({ error: err.responseText });
        },
        403: (err) => {
          this.setState({ error: err.responseText });
        }
      }
    });
  }


  doSearch(e) {
    // Pre-search state resets
    this.setState({
      message: '',
      results: 'Searching ...'
    });

    let query;

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
      if (res.status === 404 || res.status === 400) {
        this.setState({ results: [] });
      }
    });
  }

  resetForm() {
    this.setState({ username: '', permissions: '', results: null });
  }

  componentDidMount() {
    if (this.props.selectedUser) {
      const username = this.props.selectedUser.username;
      const permission = this.props.selectedUser.perm;
      this.setState({ username: username, permissions: permission });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.selectedUser !== prevProps.selectedUser) {
      this.componentDidMount();
    }
    if ((this.state.results !== prevState.results) && (this.state.username.length === 0)) {
      this.setState({ results: null });
    }
  }

  render() {
    // Initialize variables
    let title;
    let btnTitle = 'Add';
    let header = 'Add User';

    if (this.state.username.length === 0) {
      header = 'Add User';
      btnTitle = 'Add';
    }

    // Verify if org provided
    if (this.props.org) {
      // Set title to org name
      title = this.props.org.name;

      if (this.props.org.permissions.hasOwnProperty(this.state.username)) {
        btnTitle = 'Save';
        header = 'Modify User';
      }
    }
    else {
      // Set title to project name
      title = this.props.project.name;
      if (this.props.project.permissions.hasOwnProperty(this.state.username)) {
        btnTitle = 'Save';
        header = 'Modify User';
      }
    }

    // Set search results or loading icons ...
    let searchResults = '';
    if (this.state.results === 'Searching ...') {
      searchResults = (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <Spinner type="grow" color="primary" />
          <span style={{ paddingLeft: '20px' }}>
            Searching ...
          </span>
        </div>
      );
    }
    else if (Array.isArray(this.state.results)) {
      if (this.state.results.length > 0) {
        searchResults = this.state.results;
      }
      else {
        searchResults = (
          <div className='members-dropdown-item' key='no-user'>
            <span>No matches found.</span>
          </div>);
      }
    }

    // Render project edit page
    return (
      <div className='extra-padding'>
        <h2>{header}</h2>
        <hr />
        <div>
          <h3 className='edit-role-title'> {title} </h3>
          {(!this.state.error)
            ? ''
            : (<UncontrolledAlert color="danger">
                {this.state.error}
              </UncontrolledAlert>)
          }
          {/* Create form to update user roles */}
          <div>
            <Input type='search'
                   name='username'
                   id='username'
                   autoComplete='off'
                   placeholder='Search User...'
                   value={this.state.username || ''}
                   onChange={this.userChange}/>
          {(searchResults.length !== 0)
            ? (<div className='members-dropdown'>
                {searchResults}
               </div>)
            : ''
          }
        </div>
          <Form style={{ paddingTop: '10px' }}>
            {/* Permissions user updates with */}
            <FormGroup>
              <Label for="permissions">Permissions</Label>
              <Input type='select'
                     name='permissions'
                     id='permissions'
                     value={this.state.permissions}
                     onChange={this.handleChange}>
                  <option>Choose one...</option>
                  <option>read</option>
                  <option>write</option>
                  <option>admin</option>
                  <option>REMOVE_ALL</option>
              </Input>
            </FormGroup>
          </Form>
          {/* Button to submit changes */}
          <Button onClick={this.onSubmit}> {btnTitle} </Button>
        </div>
      </div>
    );
  }

}

// Export component
export default MemberEdit;
