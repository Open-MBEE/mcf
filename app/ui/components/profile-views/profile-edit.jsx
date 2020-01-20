/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.profile-views.profile-edit
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the user's edit page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
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

// MBEE modules
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
      preferred: this.props.user.preferredName,
      email: this.props.user.email,
      admin: this.props.user.admin,
      archived: this.props.user.archived,
      custom: JSON.stringify(this.props.user.custom || {}, null, 2),
      error: null
    };

    // Bind component functions
    this.handleChange = this.handleChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  // Define handle change function
  handleChange(event) {
    // Verify target being changed
    if (event.target.name === 'admin') {
      // Change the admin state to opposite value
      this.setState(prevState => ({ admin: !prevState.admin }));
    }
    else if (event.target.name === 'archived') {
      // Change the archived state to opposite value
      this.setState(prevState => ({ archived: !prevState.archived }));
    }
    else {
      // Change the state with new value
      this.setState({ [event.target.name]: event.target.value });
    }
  }

  // Define the submit function
  onSubmit() {
    const url = `/api/users/${this.props.user.username}`;
    let reroute = '/profile';

    const data = {
      fname: this.state.fname,
      lname: this.state.lname,
      preferredName: this.state.preferred,
      admin: this.state.admin,
      archived: this.state.archived,
      custom: JSON.parse(this.state.custom)
    };

    if (this.state.email) {
      data.email = this.state.email;
    }

    if (this.props.onAdminPage) {
      reroute = '/admin';
    }
    else if (this.props.viewingUser) {
      reroute = `/profile/${this.props.user.username}`;
    }

    // Send a patch request to update user data
    $.ajax({
      method: 'PATCH',
      url: `${url}?minified=true`,
      contentType: 'application/json',
      data: JSON.stringify(data),
      statusCode: {
        200: () => {
          window.location.replace(reroute);
        },
        401: (err) => {
          this.setState({ error: err.responseText });

          // Refresh when session expires
          window.location.reload();
        },
        403: (err) => {
          this.setState({ error: err.responseText });
        },
        404: (err) => {
          this.setState({ error: err.responseText });
        }
      }
    });
  }

  render() {
    // Initialize variables
    let fnameInvalid;
    let lnameInvalid;
    let preferredInvalid;
    let customInvalid;
    let disableSubmit;
    let titleClass = 'workspace-title workspace-title-padding';
    let localUser = false;
    let adminUser = false;
    // Check admin/write permissions
    if (this.props.user.provider === 'local') {
      localUser = true;
      titleClass = 'workspace-title';
    }

    if (this.props.user.admin) {
      adminUser = true;
    }

    if (this.props.viewingUser) {
      localUser = false;
      adminUser = this.props.viewingUser.admin;
    }

    // Verify if user's first name is valid
    if (!RegExp(validators.user.fname).test(this.state.fname)) {
      // Set invalid fields
      fnameInvalid = true;
      disableSubmit = true;
    }

    if (!RegExp(validators.user.fname).test(this.state.preferredname)) {
      // Set invalid fields
      preferredInvalid = true;
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
        <div className='workspace-header'>
          <h2 className={titleClass}>User Edit</h2>
          {(!localUser)
            ? ''
            : (<div className='workspace-header-button'>
                <Button className='bigger-width-btn'
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
                  Invalid: First name can only be letters, dashes, and spaces.
                </FormFeedback>
              </FormGroup>
              {/* Form section for user's preferred name */}
              <FormGroup>
                <Label for="preferred">User's Preferred Name</Label>
                <Input type="preferred"
                       name="preferred"
                       id="preferred"
                       placeholder="User's preferred name"
                       value={this.state.preferred || ''}
                       invalid={preferredInvalid}
                       onChange={this.handleChange}/>
                {/* Verify fields are valid, or display feedback */}
                <FormFeedback >
                  Invalid: Preferred name can only be letters, dashes, and spaces.
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
                  Invalid: Last name can only be letters, dashes, and spaces.
                </FormFeedback>
              </FormGroup>
              {/* Form section for the user's email */}
              <FormGroup>
                <Label for="email">Email</Label>
                <Input type="email"
                       name="email"
                       id="email"
                       placeholder="email@example.com"
                       value={this.state.email || ''}
                       onChange={this.handleChange}/>
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
              {(!adminUser)
                ? ''
                : (<React.Fragment>
                    <FormGroup check>
                      <Label check>
                        <Input type="checkbox"
                               name="admin"
                               id="admin"
                               checked={this.state.admin}
                               value={this.state.admin}
                               onChange={this.handleChange} />
                          Admin
                      </Label>
                    </FormGroup>
                    <FormGroup check className='bottom-spacing'>
                      <Label check>
                        <Input type="checkbox"
                               name="archived"
                               id="archived"
                               checked={this.state.archived}
                               value={this.state.archived || false}
                               onChange={this.handleChange} />
                          Archived
                      </Label>
                    </FormGroup>
                  </React.Fragment>)
              }
              {/* Button to submit changes */}
              <Button outline
                      color='primary'
                      disabled={disableSubmit}
                      onClick={this.onSubmit}> Submit </Button>
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
