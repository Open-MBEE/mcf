/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.profile-views.profile-edit
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the user's edit page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState } from 'react';
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

// Define component
function ProfileEdit(props) {
  const { userService } = useApiClient();
  const [state, setState] = useState({
    username: props.user.username || '',
    fname: props.user.fname || '',
    lname: props.user.lname || '',
    preferredName: props.user.preferredName || '',
    email: props.user.email || '',
    admin: props.user.admin,
    archived: props.user.archived,
    custom: JSON.stringify(props.user.custom || {}, null, 2)
  });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    if (e.target.name === 'admin' || e.target.name === 'archived') {
      setState((prevState) => ({
        ...prevState,
        [e.target.name]: !prevState[e.target.name]
      }));
    }
    else {
      setState((prevState) => ({
        ...prevState,
        [e.target.name]: e.target.value
      }));
    }
    // This is needed for successions of events within an input html element for some reason
    e.persist();
  };

  const onSubmit = async () => {
    const data = {
      ...state,
      custom: JSON.parse(state.custom)
    };

    // Send request
    const [err, result] = await userService.patch(data);

    // Set the state
    if (err) {
      setError(err);
    }
    else if (result) {
      props.refreshUsers();
      // Toggle the modal
      props.toggle(props.user);
    }
  };


  // Initialize variables
  const fnameInvalid = (!RegExp(validators.user.firstName).test(state.fname));
  const lnameInvalid = (!RegExp(validators.user.lastName).test(state.lname));
  const preferredInvalid = (!RegExp(validators.user.firstName).test(state.preferredname));
  let emailInvalid = false;
  let customInvalid = false;
  let titleClass = 'workspace-title workspace-title-padding';
  let localUser = false;
  let adminUser = false;

  // Ensure the characters have been entered first
  if (state.email.length !== 0) {
    emailInvalid = (!RegExp(validators.user.email).test(state.email));
  }

  // Check admin/write permissions
  if (props.user.provider === 'local') {
    localUser = true;
    titleClass = 'workspace-title';
  }

  if (props.user.admin) {
    adminUser = true;
  }

  if (props.viewingUser) {
    adminUser = props.viewingUser.admin;
  }

  // Verify if custom data is correct JSON format
  try {
    JSON.parse(state.custom);
  }
  catch (err) {
    // Set invalid fields
    customInvalid = true;
  }

  // eslint-disable-next-line max-len
  const disableSubmit = (fnameInvalid
    || lnameInvalid
    || preferredInvalid
    || emailInvalid
    || customInvalid);

  // Render user edit page
  return (
    <div id='workspace'>
      <div className='workspace-header'>
        <h2 className={titleClass}>User Edit</h2>
        {(localUser)
          ? (<div className='workspace-header-button'>
            <Button className='bigger-width-btn'
                    size='sm'
                    outline color='primary'
                    onClick={props.togglePasswordModal}>
              Edit Password
            </Button>
          </div>)
          : ''
        }
      </div>
      <div id='workspace-body' className='extra-padding'>
        <div className='main-workspace'>
          {(error)
            ? (<UncontrolledAlert color="danger">
              {error}
            </UncontrolledAlert>)
            : ''
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
                     value={state.fname}
                     invalid={fnameInvalid}
                     onChange={handleChange}/>
              {/* Verify fields are valid, or display feedback */}
              <FormFeedback >
                Invalid: First name can only be letters, dashes, and spaces.
              </FormFeedback>
            </FormGroup>
            {/* Form section for user's preferred name */}
            <FormGroup>
              <Label for="preferredName">User's Preferred Name</Label>
              <Input type="preferredName"
                     name="preferredName"
                     id="preferredName"
                     placeholder="User's preferred name"
                     value={state.preferredName}
                     invalid={preferredInvalid}
                     onChange={handleChange}/>
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
                     value={state.lname}
                     invalid={lnameInvalid}
                     onChange={handleChange}/>
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
                     value={state.email}
                     invalid={emailInvalid}
                     onChange={handleChange}/>
            </FormGroup>
            {/* Form section for custom data */}
            <FormGroup>
              <Label for="custom">Custom Data</Label>
              <Input type="custom"
                     name="custom"
                     id="custom"
                     placeholder="Custom Data"
                     value={state.custom}
                     invalid={customInvalid}
                     onChange={handleChange}/>
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
                             checked={state.admin}
                             value={state.admin}
                             onChange={handleChange} />
                        Admin
                    </Label>
                  </FormGroup>
                  <FormGroup check className='bottom-spacing'>
                    <Label check>
                      <Input type="checkbox"
                             name="archived"
                             id="archived"
                             checked={state.archived}
                             value={state.archived || false}
                             onChange={handleChange} />
                        Archived
                    </Label>
                  </FormGroup>
                </React.Fragment>)
            }
            {/* Button to submit changes */}
            <Button outline
                    color='primary'
                    disabled={disableSubmit}
                    onClick={onSubmit}> Submit </Button>
            {' '}
            <Button outline onClick={props.toggle}> Cancel </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}

ProfileEdit.propTypes = {
  user: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  viewingUser: PropTypes.object,
  togglePasswordModal: PropTypes.func,
  toggle: PropTypes.func,
  refreshUsers: PropTypes.func
};

// Export component
export default ProfileEdit;
