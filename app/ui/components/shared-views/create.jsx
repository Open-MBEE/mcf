/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.shared-views.create
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the create page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect } from 'react';
import { Redirect } from 'react-router-dom';
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
import { useApiClient } from '../context/ApiClientProvider';
const uuidv4 = require('uuid/v4');

/* eslint-enable no-unused-vars */

function Create(props) {
  const { orgService, projectService } = useApiClient();
  const [orgOpt, setOrgOpt] = useState(null);
  const [values, setValues] = useState({
    org: uuidv4(),
    name: '',
    id: uuidv4(),
    visibility: 'private',
    custom: JSON.stringify({}, null, 2)
  });
  const [error, setError] = useState(null);
  const [redirect, setRedirect] = useState(null);

  const handleChange = (e) => {
    setValues((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value
    }));
    e.persist();
  };

  const onSubmit = async () => {
    // Initialize data
    const data = {
      id: values.id,
      name: values.name,
      custom: JSON.parse(values.custom)
    };

    // Initialize variables
    let post;
    let redirectUrl;

    // Verify if this is for a project
    if (props.project) {
      if (!props.org) {
        // Set org as the state prop
        post = (d, o) => projectService.post(values.org, d, o);
        redirectUrl = `/orgs/${values.org}/projects/${values.id}/branches/master/elements`;
      }
      else {
        // Set org as the parent prop
        post = (d, o) => projectService.post(props.org.id, d, o);
        redirectUrl = `/orgs/${props.org.id}/projects/${values.id}/branches/master/elements`;
      }
      // Set project visibility
      data.visibility = values.visibility;
    }
    else {
      post = (d, o) => orgService.post(d, o);
      redirectUrl = `/orgs/${values.id}`;
    }

    // Post the data via org or project service
    const [err, result] = await post(data, {});

    // Set error or redirect upon success
    if (err) setError(err);
    else if (result) setRedirect(redirectUrl);
  };

  // on mount
  useEffect(() => {
    // Verify no orgs were passed in props
    if (props.project && props.orgs) {
      // Loop through orgs
      const orgOptions = props.orgs.map((org) => (<option value={org.id}>{org.name}</option>));

      // Set the org options state
      setOrgOpt(orgOptions);
    }
  }, []);

  if (redirect) return <Redirect to={redirect}/>;

  // Initialize validators
  let title;
  let header;
  let idInvalid = false;
  let customInvalid = false;
  let validatorId;
  let validLen;

  if (props.project) {
    title = (props.org) ? `New Project in ${props.org.name}` : 'New Project';
    header = 'Project';
    validatorId = `^${validators.project.id.split(validators.ID_DELIMITER).pop()}`;
    // Calculate project ID sans delimiter
    validLen = validators.project.idLength - validators.org.idLength - 1;
  }
  else {
    validatorId = validators.org.id;
    validLen = validators.org.idLength;
    title = 'New Organization';
    header = 'Organization';
  }

  const { id, name } = values;

  if (id.length !== 0) {
    idInvalid = (id.length > validLen || (!RegExp(validatorId).test(id)));
  }

  // Verify custom data is valid
  try {
    JSON.parse(values.custom);
  }
  catch (err) {
    // Set invalid fields
    customInvalid = true;
  }

  const disableSubmit = (customInvalid || idInvalid || name.length === 0 || id.length === 0);

  // Return the form to create a project
  return (
    <div id='workspace'>
      <div className='workspace-header'>
        <h2 className='workspace-title workspace-title-padding'>{title}</h2>
      </div>
      <div className='extra-padding'>
        {(!error)
          ? ''
          : (<UncontrolledAlert color="danger">
              {error}
             </UncontrolledAlert>)
        }
        <Form>
          {/* Verify if org provided */}
          {(props.project && !props.org)
            ? (// Display options to choose the organization
              <FormGroup>
                <Label for="org">Organization ID</Label>
                <Input type="select"
                       name="org"
                       id="org"
                       value={values.org}
                       onChange={handleChange}>
                  <option>Choose one...</option>
                  {orgOpt}
                </Input>
              </FormGroup>)
            : ''
          }
          {/* Create an input for project id */}
          <FormGroup>
            <Label for="id">{header} ID*</Label>
            <Input type="id"
                   name="id"
                   id="id"
                   placeholder="ID"
                   value={values.id}
                   invalid={idInvalid}
                   onChange={handleChange}/>
            {/* If invalid id, notify user */}
            <FormFeedback >
              Invalid: An id may only contain letters, numbers, or dashes.
            </FormFeedback>
          </FormGroup>
          {/* Create an input for project name */}
          <FormGroup>
            <Label for="name">{header} Name*</Label>
            <Input type="name"
                   name="name"
                   id="name"
                   placeholder="Name"
                   value={values.name || ''}
                   onChange={handleChange}/>
            {/* If invalid name, notify user */}
            <FormFeedback >
              Invalid: A name may only contain letters, numbers, space, or dashes.
            </FormFeedback>
          </FormGroup>
          {/* Form section for project visibility */}
          {(!props.project)
            ? ''
            : (<FormGroup>
              <Label for="visibility">Visibility</Label>
              <Input type="select"
                     name="visibility"
                     id="visibility"
                     value={values.visibility || ''}
                     onChange={handleChange}>
                <option value='internal'>Internal</option>
                <option value='private'>Private</option>
              </Input>
            </FormGroup>)
          }
          {/* Create an input for custom data */}
          <FormGroup>
            <Label for="custom">Custom Data</Label>
            <Input type="custom"
                   name="custom"
                   id="custom"
                   placeholder="Custom Data"
                   value={values.custom || ''}
                   invalid={customInvalid}
                   onChange={handleChange}/>
            {/* If invalid custom data, notify user */}
            <FormFeedback>
              Invalid: Custom data must be valid JSON
            </FormFeedback>
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

export default Create;
