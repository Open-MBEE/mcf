/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.profile-views.password-edit
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the password edit page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState } from 'react';
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
import { useApiClient } from '../context/ApiClientProvider.js';

/* eslint-enable no-unused-vars */

// Define component
function PasswordEdit(props) {
  const { userService } = useApiClient();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [newPasswordInvalid, setNewPasswordInvalid] = useState(false);
  const [sessionUser] = useState(JSON.parse(window.sessionStorage.getItem('mbee-user')));
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    if (e.target.name === 'oldPassword') {
      setOldPassword(e.target.value);
    }
    else if (e.target.name === 'confirmNewPassword') {
      setConfirmNewPassword(e.target.value);
    }
    else if (e.target.name === 'newPassword') {
      setNewPassword(e.target.value);

      // Verify that new password is valid
      const password = e.target.value;

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

        // Set password status
        setNewPasswordInvalid(!(lengthValidator
          && digitsValidator
          && lowercaseValidator
          && uppercaseValidator
          && specialCharValidator));
      }
      catch (err) {
        // Set password invalid
        setNewPasswordInvalid(true);
      }
    }
  };

  const onSubmit = async () => {
    // Initialize variables
    const data = {
      oldPassword: oldPassword,
      password: newPassword,
      confirmPassword: confirmNewPassword
    };

    // Send a request to update the password
    const [err, result] = await userService.password(data, props.user.username);

    // Set the state
    if (err) {
      setError(err);
    }
    else if (result && sessionUser.username !== props.user.username) {
      props.toggle();
    }
  };


  // Get the session user, used to see if an admin is changing another user's password
  const noOldPassword = sessionUser.admin && sessionUser.username !== props.user.username;

  // Initialize variables
  let disableSubmit;
  let confirmPasswordInvalid;

  // Verify if new passwords match
  if (newPassword !== confirmNewPassword) {
    // Set invalid fields
    disableSubmit = true;
    confirmPasswordInvalid = true;
  }

  // Verify if new password valid
  if (newPasswordInvalid) {
    // Disable submit button
    disableSubmit = true;
  }

  // Render user password page
  return (
    <div id='workspace'>
      <div className='workspace-header'>
        <h2 className='workspace-title workspace-title-padding'>Change Password</h2>
      </div>
      <div id='workspace-body' className='extra-padding'>
        <div className='main-workspace'>
          {(!error)
            ? ''
            : (<UncontrolledAlert color="danger">
              {error}
            </UncontrolledAlert>)
          }
          {/* Create form to update user password */}
          <Form>
            {/* Input old password */}
            {(noOldPassword)
              ? ''
              : <FormGroup>
                  <Label for="oldPassword">Old Password</Label>
                  <Input type="password"
                         name="oldPassword"
                         id="oldPassword"
                         placeholder="Old Password"
                         value={oldPassword || ''}
                         onChange={handleChange}/>
                </FormGroup>}
            {/* Input new password */}
            <FormGroup>
              <Label for="newPassword">New Password</Label>
              <Input type="password"
                     name="newPassword"
                     id="newPassword"
                     placeholder="New Password"
                     value={newPassword || ''}
                     invalid={newPasswordInvalid}
                     onChange={handleChange}/>
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
                     value={confirmNewPassword || ''}
                     invalid={confirmPasswordInvalid}
                     onChange={handleChange}/>
              <FormFeedback>
                Invalid: Passwords are not the same.
              </FormFeedback>
            </FormGroup>
            {/* Button to submit or cancel */}
            <Button outline color='primary'
                    disabled={disableSubmit}
                    onClick={onSubmit}> Submit </Button>
            {' '}
            <Button outline
                    disabled={props.passwordExpired}
                    onClick={props.toggle}> Cancel </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}

// Export component
export default PasswordEdit;
