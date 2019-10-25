/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.shared-views.members.member-edit
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the user role edit page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
import {
  Form,
  FormGroup,
  FormFeedback,
  Label,
  Input,
  Button,
  UncontrolledAlert
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
    const url = (this.props.org)
      ? `/api/orgs/${this.props.org.id}`
      : `/api/orgs/${this.props.project.org}/projects/${this.props.project.id}`;

    const data = {
      permissions: {
        [this.state.username]: this.state.permissions
      }
    };

    if (this.state.error) {
      this.setState({ error: null });
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
      results: []
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
      if (res.status === 400) {
        this.setState({ results: [] });
      }
      else if (res.status === 404) {
        // Try username search endpoint
        $.ajax({
          method: 'GET',
          url: `/api/users/${query}`,
          statusCode: {
            401: () => {
              // Refresh when session expires
              window.location.reload();
            }
          }
        })
        .done(data => {
          const userOpt = (
            <div className='members-dropdown-item' key={`user-${data.username}`}
                 onClick={() => this.selectUser(data.username)}>
              <span>{data.fname} {data.lname}</span>
              <span className='member-username'>@{data.username}</span>
            </div>
          );

          this.setState({ results: [userOpt] });
        })
        .fail(response => {
          if (response.status === 404 || response.status === 400) {
            this.setState({ results: [] });
          }
        });
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
    const org = this.props.org;
    const project = this.props.project;
    const user = this.state.username;
    const results = this.state.results;
    const title = (org) ? org.name : project.name;

    // Check if user is a member of the Org or Project
    const orgMember = (org && org.permissions.hasOwnProperty(user));
    const projMember = (project && project.permissions.hasOwnProperty(user));

    const btnTitle = (orgMember || projMember) ? 'Save' : 'Add';
    const header = (orgMember || projMember) ? 'Modify User' : 'Add user';

    // Display error if permission is invalid or User not found
    const notFound = (results && results.length === 0 && user !== '') ? 'User not found.' : '';
    const error = (this.state.error) ? this.state.error : '';

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
                   value={this.state.username || ''}
                   invalid={notFound.length > 0}
                   onChange={this.userChange}/>
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
          <Button onClick={this.onSubmit} disabled={notFound.length > 0}>{btnTitle}</Button>
        </React.Fragment>
      </div>
    );
  }

}

// Export component
export default MemberEdit;
