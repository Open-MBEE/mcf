/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.profile-views.password-edit
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the password edit page.
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


/* eslint-enable no-unused-vars */

// Define component
class PasswordEdit extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      oldPassword: '',
      newPassword: '',
      confirmNewPassword: '',
      newPasswordInvalid: false,
      error: null
    };

    // Bind component functions
    this.handleChange = this.handleChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  handleChange(event) {
    // Change the state with new value
    this.setState({ [event.target.name]: event.target.value });

    // Verify if state is new password
    if (event.target.name === 'newPassword') {
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
        this.setState({ newPasswordInvalid: false });
        // Return validation
        return (lengthValidator
          && digitsValidator
          && lowercaseValidator
          && uppercaseValidator
          && specialCharValidator);
      }
      catch (error) {
        // Set password is invalid
        this.setState({ newPasswordInvalid: true });
      }
    }
  }

  onSubmit() {
    // Initialize variables
    const url = `/api/users/${this.props.user.username}/password`;
    const data = {
      oldPassword: this.state.oldPassword,
      password: this.state.newPassword,
      confirmPassword: this.state.confirmNewPassword
    };

    // Send a patch request to update user password
    $.ajax({
      method: 'PATCH',
      url: `${url}?minified=true`,
      contentType: 'application/json',
      data: JSON.stringify(data),
      statusCode: {
        200: () => { window.location.replace('/profile'); },
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

  render() {
    // Initialize variables
    let disableSubmit;
    let confirmPasswordInvalid;

    // Verify if new passwords match
    if (this.state.newPassword !== this.state.confirmNewPassword) {
      // Set invalid fields
      disableSubmit = true;
      confirmPasswordInvalid = true;
    }

    // Verify if new password valid
    if (this.state.newPasswordInvalid) {
      // Disable submit button
      disableSubmit = true;
    }

    // Render user password page
    return (
      <div id='workspace'>
        <div id='workspace-header' className='workspace-header'>
          <h2 className='workspace-title workspace-title-padding'>User Edit</h2>
        </div>
        <div id='workspace-body' className='extra-padding'>
          <div className='main-workspace'>
            {(!this.state.error)
              ? ''
              : (<UncontrolledAlert color="danger">
                {this.state.error}
              </UncontrolledAlert>)
            }
            {/* Create form to update user password */}
            <Form>
              {/* Input old password */}
              <FormGroup>
                <Label for="oldPassword">Old Password</Label>
                <Input type="password"
                       name="oldPassword"
                       id="oldPassword"
                       placeholder="Old Password"
                       value={this.state.oldPassword || ''}
                       onChange={this.handleChange}/>
              </FormGroup>
              {/* Input new password */}
              <FormGroup>
                <Label for="newPassword">New Password</Label>
                <Input type="password"
                       name="newPassword"
                       id="newPassword"
                       placeholder="New Password"
                       value={this.state.newPassword || ''}
                       invalid={this.state.newPasswordInvalid}
                       onChange={this.handleChange}/>
                <FormFeedback>
                  Invalid: Password must have at least 8 characters,
                  a lowercase, uppercase, digit, and special character.
                </FormFeedback>
              </FormGroup>
              {/* Input new password again */}
              <FormGroup>
                <Label for="confirmNewPassword">Confirm New Password</Label>
                <Input type="password"
                       name="confirmNewPassword"
                       id="confirmNewPassword"
                       placeholder="Confirm New Password"
                       value={this.state.confirmNewPassword || ''}
                       invalid={confirmPasswordInvalid}
                       onChange={this.handleChange}/>
                <FormFeedback>
                  Invalid: Password are not the same.
                </FormFeedback>
              </FormGroup>
              {/* Button to submit or cancel */}
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
export default PasswordEdit;
