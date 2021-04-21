/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.admin-console-views.create-user
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the create new local user page.
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
  Input,
  FormFeedback,
  Button,
  UncontrolledAlert
} from 'reactstrap';

// MBEE modules
import validators from '../../../../build/json/validators.json';
import { useApiClient } from '../context/ApiClientProvider.js';

/* eslint-enable no-unused-vars */

function CreateUser(props) {
  const { userService } = useApiClient();
  const [state, setState] = useState({
    username: '',
    fname: '',
    lname: '',
    preferredName: '',
    email: '',
    password: '',
    admin: false,
    custom: JSON.stringify({}, null, 2)
  });
  const [passwordInvalid, setPasswordInvalid] = useState(false);
  const [error, setError] = useState(false);

  const handleChange = (e) => {
    if (e.target.name === 'admin') {
      setState((prevState) => ({
        ...prevState,
        admin: !prevState.admin
      }));
    }
    else {
      setState((prevState) => ({
        ...prevState,
        [e.target.name]: e.target.value
      }));
    }
    if (e.target.name === 'password') {
      const pass = e.target.value;

      // Test the validation of password
      try {
        // At least 8 characters
        const lengthValidator = (pass.length >= 8);
        // At least 1 digit
        const digitsValidator = (pass.match(/[0-9]/g).length >= 1);
        // At least 1 lowercase letter
        const lowercaseValidator = (pass.match(/[a-z]/g).length >= 1);
        // At least 1 uppercase letter
        const uppercaseValidator = (pass.match(/[A-Z]/g).length >= 1);
        // At least 1 special character
        const specialCharValidator = (pass.match(/[-`~!@#$%^&*()_+={}[\]:;'",.<>?/|\\]/g).length >= 1);

        // Set status in state
        setPasswordInvalid(!(lengthValidator
          && digitsValidator
          && lowercaseValidator
          && uppercaseValidator
          && specialCharValidator));
      }
      catch (err) {
        setPasswordInvalid(true);
      }
    }

    // Resize custom data field
    $('textarea[name="custom"]').autoResize();

    // This is needed for successions of events within an input html element for some reason
    e.persist();
  };

  const onSubmit = async () => {
    // Set data to send
    const data = {
      ...state
    };

    // Send request to post user
    const [err, result] = await userService.post(data);

    // Set the state
    if (err) {
      setError(err);
    }
    else if (result) {
      props.refreshUsers();
      props.toggle();
    }
  };

  // Set autoresize for custom field
  useEffect(() => {
    $('textarea[name="custom"]').autoResize();
  }, []);


  // Initialize validators
  let usernameInvalid = false;
  const usernameLengthInvalid = (state.username.length > validators.user.usernameLength);
  const fnameInvalid = (!RegExp(validators.user.firstName).test(state.fname));
  const lnameInvalid = (!RegExp(validators.user.lastName).test(state.lname));
  const preferredInvalid = (!RegExp(validators.user.firstName).test(state.preferredname));
  let emailInvalid = false;
  let customInvalid = false;

  if (state.email.length !== 0) {
    emailInvalid = (!RegExp(validators.user.email).test(state.email));
  }

  if (state.username.length !== 0) {
    // eslint-disable-next-line max-len
    usernameInvalid = ((!RegExp(validators.user.username).test(state.username)) || usernameLengthInvalid);
  }

  // Verify if custom data is correct JSON format
  try {
    JSON.parse(state.custom);
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
    || state.passwordInvalid);

  // Return the form to create a project
  return (
    <div id='workspace'>
      <div className='workspace-header'>
        <h2 className='workspace-title workspace-title-padding'>New Local User</h2>
      </div>
      <div className='extra-padding'>
        {(!error)
          ? ''
          : (<UncontrolledAlert color='danger'>
            {error}
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
                   value={state.username || ''}
                   invalid={usernameInvalid}
                   onChange={handleChange}/>
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
                   value={state.fname || ''}
                   onChange={handleChange}/>
            {/* If invalid name, notify user */}
            <FormFeedback >
              Invalid: First name can only be letters, dashes, and spaces.
            </FormFeedback>
          </FormGroup>
          {/* Create an input for preferred name */}
          <FormGroup>
            <Label for='preferredName'>Preferred Name</Label>
            <Input type='preferredName'
                   name='preferredName'
                   id='preferredName'
                   invalid={preferredInvalid}
                   placeholder='Preferred Name'
                   value={state.preferredName || ''}
                   onChange={handleChange}/>
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
                   value={state.lname || ''}
                   onChange={handleChange}/>
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
                   value={state.email || ''}
                   invalid={emailInvalid}
                   onChange={handleChange}/>
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
                   value={state.password}
                   invalid={passwordInvalid}
                   onChange={handleChange}/>
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
                   value={state.custom || ''}
                   invalid={customInvalid}
                   onChange={handleChange}/>
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
                     value={state.admin || false}
                     onChange={handleChange} />
              Admin
            </Label>
          </FormGroup>
          <div className='required-fields'>* required fields.</div>
          {/* Button to create project */}
          <Button outline color='primary'
                  disabled={disableSubmit} onClick={onSubmit}>
            Create
          </Button>
          {' '}
          <Button outline onClick={props.toggle}> Cancel </Button>
        </Form>
      </div>
    </div>
  );
}

CreateUser.propTypes = {
  toggle: PropTypes.func,
  refreshUsers: PropTypes.func
};

export default CreateUser;
