/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.admin-console-views.create-user
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the create new local user page.
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

class CreateUser extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      username: '',
      fname: '',
      lname: '',
      preferredname: '',
      email: '',
      password: '',
      admin: false,
      custom: JSON.stringify({}, null, 2),
      passwordInvalid: false,
      error: null
    };

    // Bind component functions
    this.handleChange = this.handleChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  componentDidMount() {
    $('textarea[name="custom"]').autoResize();
  }

  // Define handle change function
  handleChange(event) {
    // Verify target being changed
    if (event.target.name === 'admin') {
      // Change the admin state to opposite value
      this.setState(prevState => ({ admin: !prevState.admin }));
    }
    else {
      // Change the state with new value
      this.setState({ [event.target.name]: event.target.value });
    }

    // Verify if state is new password
    if (event.target.name === 'password') {
      // Initialize variables
      const password = event.target.value;

      // Test the validation of password
      try {
        // At least 8 characters
        const lengthValidator = (password.length >= 8);
        // At least 1 digit
        const digitsValidator = (password.match(/[0-9]/g).length >= 1);
        // At least 1 lowercase letter
        const lowercaseValidator = (password.match(/[a-z]/g).length >= 1);
        // At least 1 uppercase letter
        const uppercaseValidator = (password.match(/[A-Z]/g).length >= 1);
        // At least 1 special character
        const specialCharValidator = (password.match(/[-`~!@#$%^&*()_+={}[\]:;'",.<>?/|\\]/g).length >= 1);
        // Set password is valid
        this.setState({ passwordInvalid: false });
        // Return validation
        return (lengthValidator
          && digitsValidator
          && lowercaseValidator
          && uppercaseValidator
          && specialCharValidator);
      }
      catch (error) {
        // Set password is invalid
        this.setState({ passwordInvalid: true });
      }
    }

    // Resize custom data field
    $('textarea[name="custom"]').autoResize();
  }

  // Define the submit function
  onSubmit() {
    // Initialize user data
    const url = `/api/users/${this.state.username}`;
    const data = {
      username: this.state.username,
      fname: this.state.fname,
      lname: this.state.lname,
      preferredName: this.state.preferredname,
      email: this.state.email,
      admin: this.state.admin,
      password: this.state.password
    };

    $.ajax({
      method: 'POST',
      url: `${url}?minified=true`,
      contentType: 'application/json',
      data: JSON.stringify(data),
      statusCode: {
        200: () => {
          // On success, return to project-views page
          window.location.reload();
        },
        401: (err) => {
          // Refresh when session expires
          window.location.reload();
        },
        403: (err) => {
          this.setState({ error: err.responseText });
        },
        500: (err) => {
          this.setState({ error: err.responseText });
        }
      }
    });
  }

  render() {
    // Initialize validators
    let usernameInvalid = false;
    const usernameLengthInvalid = (this.state.username.length > validators.user.usernameLength);
    const fnameInvalid = (!RegExp(validators.user.firstName).test(this.state.fname));
    const lnameInvalid = (!RegExp(validators.user.lastName).test(this.state.lname));
    const preferredInvalid = (!RegExp(validators.user.firstName).test(this.state.preferredname));
    let emailInvalid = false;
    let customInvalid = false;

    if (this.state.email.length !== 0) {
      emailInvalid = (!RegExp(validators.user.email).test(this.state.email));
    }

    if (this.state.username.length !== 0) {
      // eslint-disable-next-line max-len
      usernameInvalid = ((!RegExp(validators.user.username).test(this.state.username)) || usernameLengthInvalid);
    }

    // Verify if custom data is correct JSON format
    try {
      JSON.parse(this.state.custom);
    }
    catch (err) {
      customInvalid = true;
    }

    const disableSubmit = (fnameInvalid
      || lnameInvalid
      || preferredInvalid
      || emailInvalid
      || usernameInvalid
      || customInvalid
      || this.state.passwordInvalid);

    // Return the form to create a project
    return (
      <div id='workspace'>
        <div className='workspace-header'>
          <h2 className='workspace-title workspace-title-padding'>New Local User</h2>
        </div>
        <div className='extra-padding'>
          {(!this.state.error)
            ? ''
            : (<UncontrolledAlert color='danger'>
              {this.state.error}
            </UncontrolledAlert>)
          }
          <Form>
            {/* Create an input for project id */}
            <FormGroup>
              <Label for='username'>Username*</Label>
              <Input type='username'
                     name='username'
                     id='username'
                     placeholder='Username'
                     value={this.state.username || ''}
                     invalid={usernameInvalid}
                     onChange={this.handleChange}/>
              {/* If invalid username, notify user */}
              <FormFeedback >
                Invalid: Invalid username.
              </FormFeedback>
            </FormGroup>
            {/* Create an input for user name */}
            <FormGroup>
              <Label for='fname'>First Name</Label>
              <Input type='fname'
                     name='fname'
                     id='fname'
                     placeholder='First Name'
                     invalid={fnameInvalid}
                     value={this.state.fname || ''}
                     onChange={this.handleChange}/>
              {/* If invalid name, notify user */}
              <FormFeedback >
                Invalid: First name can only be letters, dashes, and spaces.
              </FormFeedback>
            </FormGroup>
            {/* Create an input for preferred name */}
            <FormGroup>
              <Label for='preferredname'>Preferred Name</Label>
              <Input type='preferredname'
                     name='preferredname'
                     id='preferredname'
                     invalid={preferredInvalid}
                     placeholder='Preferred Name'
                     value={this.state.preferredname || ''}
                     onChange={this.handleChange}/>
              {/* If invalid name, notify user */}
              <FormFeedback >
                Invalid: Preferred name can only be letters, dashes, and spaces.
              </FormFeedback>
            </FormGroup>
            {/* Create an input for user last name */}
            <FormGroup>
              <Label for='lname'>Last Name</Label>
              <Input type='lname'
                     name='lname'
                     id='lname'
                     invalid={lnameInvalid}
                     placeholder='Last Name'
                     value={this.state.lname || ''}
                     onChange={this.handleChange}/>
              {/* If invalid name, notify user */}
              <FormFeedback >
                Invalid: Last name can only be letters, dashes, and spaces.
              </FormFeedback>
            </FormGroup>
            {/* Create an input for custom data */}
            <FormGroup>
              <Label for='email'>E-Mail</Label>
              <Input type='email'
                     name='email'
                     id='email'
                     placeholder='mbee@example.com'
                     value={this.state.email || ''}
                     invalid={emailInvalid}
                     onChange={this.handleChange}/>
              {/* If invalid custom data, notify user */}
              <FormFeedback>
                Invalid: Email invalid.
              </FormFeedback>
            </FormGroup>
            {/* Create an input for custom data */}
            <FormGroup>
              <Label for='password'>Temporary Password*</Label>
              <Input type='password'
                     name='password'
                     id='password'
                     placeholder='Password'
                     value={this.state.password || ''}
                     invalid={this.state.passwordInvalid}
                     onChange={this.handleChange}/>
              {/* If invalid custom data, notify user */}
              <FormFeedback>
                Invalid: Password must have at least 8 characters,
                a lowercase, uppercase, digit, and special character.
              </FormFeedback>
            </FormGroup>
            {/* Form section for custom data */}
            <FormGroup>
              <Label for='custom'>Custom Data</Label>
              <Input type='textarea'
                     name='custom'
                     id='custom'
                     placeholder='{}'
                     value={this.state.custom || ''}
                     invalid={customInvalid}
                     onChange={this.handleChange}/>
              {/* Verify fields are valid, or display feedback */}
              <FormFeedback>
                Invalid: Custom data must be valid JSON
              </FormFeedback>
            </FormGroup>
            <FormGroup check>
              <Label check>
                <Input type='checkbox'
                       name='admin'
                       id='admin'
                       placeholder='Admin'
                       value={this.state.admin || false}
                       onChange={this.handleChange} />
                Admin
              </Label>
            </FormGroup>
            <div className='required-fields'>* required fields.</div>
            {/* Button to create project */}
            <Button outline color='primary'
                    disabled={disableSubmit} onClick={this.onSubmit}>
              Create
            </Button>
            {' '}
            <Button outline onClick={this.props.toggle}> Cancel </Button>
          </Form>
        </div>
      </div>
    );
  }

}

export default CreateUser;
