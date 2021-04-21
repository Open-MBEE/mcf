/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.branches.branch-new
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the form to create a new branch.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect } from 'react';
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
import validators from '../../../../../build/json/validators.json';
import { useApiClient } from '../../context/ApiClientProvider';
const uuidv4 = require('uuid/v4');

/* eslint-enable no-unused-vars */

function CreateBranch(props) {
  const { branchService } = useApiClient();
  const [branches, setBranches] = useState([]);
  const [values, setValues] = useState({
    name: '',
    id: uuidv4(),
    source: 'master',
    tag: false,
    custom: JSON.stringify({}, null, 2)
  });
  const [error, setError] = useState(null);

  const orgID = props.project.org;
  const projID = props.project.id;

  const handleChange = (e) => {
    setValues((prevState) => {
      const newState = {
        ...prevState
      };
      // Change the state to the new value
      if (e.target.name === 'tag') newState.tag = !prevState.tag;
      else newState[e.target.name] = e.target.value;
      return newState;
    });

    // Needed for the input to work properly
    e.persist();

    // Resize custom data field
    $('textarea[name="custom"]').autoResize();
  };

  const onSubmit = async () => {
    if (error) setError(null);

    // Data to create the branch
    const data = {
      ...values,
      custom: JSON.parse(values.custom)
    };

    // Send request to create the branch
    const [err, result] = await branchService.post(orgID, projID, data);

    if (err) {
      setError(err);
    }
    else if (result) {
      props.refresh();
      props.toggle();
    }
  };

  // on mount
  useEffect(() => {
    // Get branch data
    branchService.get(orgID, projID)
    .then(([err, data]) => {
      if (err) setError(err);
      else if (data) setBranches(data);
    });
  }, []);


  // Initialize validators
  let idInvalid = false;
  let customInvalid = false;

  const branchList = [];
  const tagList = [];

  // Create list of option elements
  branches.forEach((branch, idx) => {
    const options = (branch.tag) ? tagList : branchList;
    options.push(<option key={`opt-${idx}`} className='branch-opts' value={branch.id}>
      {(branch.name.length > 0) ? branch.name : branch.id}
    </option>);
  });

  // Verify if id is valid
  const { id } = values;
  const validatorsBranchId = `^${validators.branch.id.split(validators.ID_DELIMITER).pop()}`;
  const maxLength = validators.branch.idLength - validators.project.idLength - 1;

  if (id.length !== 0) {
    idInvalid = (id.length > maxLength || (!RegExp(validatorsBranchId).test(id)));
  }

  // Verify custom data is valid
  try {
    JSON.parse(values.custom);
  }
  catch (err) {
    // Set invalid fields
    customInvalid = true;
  }

  const disableSubmit = (customInvalid || idInvalid || id.length === 0);

  // Return the form to create a project
  return (
    <div id='workspace'>
      <div className='workspace-header'>
        <h2 className='workspace-title workspace-title-padding'>
          New Branch
        </h2>
      </div>
      <div className='extra-padding'>
        {(!error)
          ? ''
          : (<UncontrolledAlert color="danger">
            {error}
          </UncontrolledAlert>)
        }
        <Form>
          <FormGroup>
            <Label for="source">Source Branch</Label>
            <Input type='select'
                   name='source'
                   id='source'
                   className='branch-input'
                   value={values.source || ''}
                   onChange={handleChange}>
              <option disabled={true}>Branches</option>
              {branchList}
              <option disabled={true}>Tags</option>
              {tagList}
            </Input>
          </FormGroup>
          {/* Create an input for project id */}
          <FormGroup>
            <Label for="id">Branch ID*</Label>
            <Input type="id"
                   name="id"
                   id="id"
                   placeholder="ID"
                   value={values.id || ''}
                   invalid={idInvalid}
                   onChange={handleChange}/>
            {/* If invalid id, notify user */}
            <FormFeedback >
              Invalid: An id may only contain letters, numbers, or dashes.
            </FormFeedback>
          </FormGroup>
          {/* Create an input for project name */}
          <FormGroup>
            <Label for="name">Branch Name</Label>
            <Input type="name"
                   name="name"
                   id="name"
                   placeholder="Name"
                   value={values.name || ''}
                   onChange={handleChange}/>
          </FormGroup>
          {/* Create an input for custom data */}
          <FormGroup>
            <Label for="custom">Custom Data</Label>
            <Input type="textarea"
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
          <FormGroup check className='bottom-spacing'>
            <Label check>
              <Input type="checkbox"
                     name="tag"
                     id="tag"
                     checked={values.tag}
                     value={values.tag}
                     onChange={handleChange} />
              Tag
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

export default CreateBranch;
