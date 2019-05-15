/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.profile-views.profile-edit
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the user's edit page.
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
  FormFeedback,
  Button,
  UncontrolledAlert
} from 'reactstrap';

// MBEE Modules
import validators from '../../../../build/json/validators.json';

/* eslint-enable no-unused-vars */

// Define component
class ProfileEdit extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      fname: this.props.user.fname,
      lname: this.props.user.lname,
      custom: JSON.stringify(this.props.user.custom || {}, null, 2),
      error: null
    };

    // Bind component functions
    this.handleChange = this.handleChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  // Define handle change function
  handleChange(event) {
    // Change the state with new value
    this.setState({ [event.target.name]: event.target.value });
  }

  // Define the submit function
  onSubmit() {
    const url = `/api/users/${this.props.user.username}`;
    const data = {
      fname: this.state.fname,
      lname: this.state.lname,
      custom: JSON.parse(this.state.custom)
    };

    // Send a patch request to update user data
    $.ajax({
      method: 'PATCH',
      url: `${url}?minified=true`,
      contentType: 'application/json',
      data: JSON.stringify(data),
      statusCode: {
        200: () => { window.location.replace('/profile'); },
        401: (err) => {
          this.setState({ error: err.responseJSON.description });

          // Refresh when session expires
          window.location.reload();
        },
        403: (err) => {
          this.setState({ error: err.responseJSON.description });
        },
        404: (err) => {
          this.setState({ error: err.responseJSON.description });
        }
      }
    });
  }

  render() {
    // Initialize variables
    let fnameInvalid;
    let lnameInvalid;
    let customInvalid;
    let disableSubmit;
    let titleClass = 'workspace-title workspace-title-padding';
    let localUser = false;

    // Check admin/write permissions
    if (this.props.user.provider === 'local') {
      localUser = true;
      titleClass = 'workspace-title';
    }

    // Verify if user's first name is valid
    if (!RegExp(validators.user.fname).test(this.state.fname)) {
      // Set invalid fields
      fnameInvalid = true;
      disableSubmit = true;
    }

    // Verify if user's last name is valid
    if (!RegExp(validators.user.lname).test(this.state.lname)) {
      // Set invalid fields
      lnameInvalid = true;
      disableSubmit = true;
    }

    // Verify if custom data is correct JSON format
    try {
      JSON.parse(this.state.custom);
    }
    catch (err) {
      // Set invalid fields
      customInvalid = true;
      disableSubmit = true;
    }

    // Render user edit page
    return (
      <div id='workspace'>
        <div id='workspace-header' className='profile-edit-title'>
          <h2 className={titleClass}>User Edit</h2>
          {(!localUser)
            ? ''
            : (<div className='workspace-header-button'>
                <Button className='btn'
                        size='sm'
                        outline color='primary'
                        onClick={this.props.togglePasswordModal}>
                  Edit Password
                </Button>
               </div>)
          }
        </div>
        <div id='workspace-body' className='extra-padding'>
          <div className='main-workspace'>
            {(!this.state.error)
              ? ''
              : (<UncontrolledAlert color="danger">
                  {this.state.error}
                </UncontrolledAlert>)
            }
            {/* Create form to update user data */}
            <Form>
              {/* Form section for user's first name */}
              <FormGroup>
                <Label for="fname">User's First Name</Label>
                <Input type="fname"
                       name="fname"
                       id="fname"
                       placeholder="User's first name"
                       value={this.state.fname || ''}
                       invalid={fnameInvalid}
                       onChange={this.handleChange}/>
                {/* Verify fields are valid, or display feedback */}
                <FormFeedback >
                  Invalid: A user's first name may only contain letters.
                </FormFeedback>
              </FormGroup>
              {/* Form section for user's last name */}
              <FormGroup>
                <Label for="lname">User's Last Name</Label>
                <Input type="lname"
                       name="lname"
                       id="lname"
                       placeholder="User's last name"
                       value={this.state.lname || ''}
                       invalid={lnameInvalid}
                       onChange={this.handleChange}/>
                {/* Verify fields are valid, or display feedback */}
                <FormFeedback >
                  Invalid: A user's last name may only contain letters.
                </FormFeedback>
              </FormGroup>
              {/* Form section for custom data */}
              <FormGroup>
                <Label for="custom">Custom Data</Label>
                <Input type="custom"
                       name="custom"
                       id="custom"
                       placeholder="Custom Data"
                       value={this.state.custom || ''}
                       invalid={customInvalid}
                       onChange={this.handleChange}/>
                {/* Verify fields are valid, or display feedback */}
                <FormFeedback>
                  Invalid: Custom data must be valid JSON
                </FormFeedback>
              </FormGroup>
              {/* Button to submit changes */}
              <Button outline color='primary' disabled={disableSubmit} onClick={this.onSubmit}> Submit </Button>
              {' '}
              <Button outline onClick={this.props.toggle}> Cancel </Button>
            </Form>
          </div>
        </div>
      </div>
    );
  }

}

// Export component
export default ProfileEdit;
