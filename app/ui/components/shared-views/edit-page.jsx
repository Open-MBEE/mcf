/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.shared-views.edit-page
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 * @author Jake Ursetta
 *
 * @description This renders the edit page.
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
import CustomEdit from '../general/custom-data/custom-edit.jsx';
import { useApiClient } from '../context/ApiClientProvider';

/* eslint-enable no-unused-vars */

function EditPage(props) {
  const { orgService, projectService, branchService } = useApiClient();

  // Initialize state props
  let _name;
  let _custom;
  let _visibility;
  let _archived;

  if (props.org) {
    _name = props.org.name;
    _archived = props.org.archived;
    _custom = props.org.custom;
  }
  else if (props.project) {
    _name = props.project.name;
    _archived = props.project.archived;
    _custom = props.project.custom;
    _visibility = props.project.visibility;
  }
  else if (props.branch) {
    _name = props.branch.name;
    _archived = props.branch.archived;
    _custom = props.branch.custom;
  }

  const [name, setName] = useState(_name);
  const [visibility, setVisibility] = useState(_visibility);
  const [archived, setArchived] = useState(_archived);
  const [custom, setCustom] = useState(JSON.stringify(_custom || {}, null, 2));
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    // Verify target being changed
    switch (e.target.name) {
      case 'archived':
        setArchived((prevState) => !prevState);
        break;
      case 'name':
        setName(e.target.value);
        break;
      case 'visibility':
        setVisibility(e.target.value);
        break;
      default:
        break;
    }
  };

  const customChange = (rows, err) => {
    setMessage(err);

    if (err.length === 0) {
      // Create custom data object from rows of key/value pairs.
      const obj = {};
      rows.forEach((row) => {
        let value = '';

        // Parse custom data input values
        try {
          value = JSON.parse(row.value);
        }
        catch (e) {
          // Treat input as string
          value = row.value;
        }

        Object.assign(obj, { [row.key]: value });
      });

      setCustom(JSON.stringify(obj, null, 2));
    }
  };

  const onSubmit = async () => {
    if (error) {
      setError(null);
    }

    // Initialize variables
    let patch;
    const data = {
      name: name,
      archived: archived,
      custom: JSON.parse(custom)
    };

    if (props.org) {
      patch = (d, o) => orgService.patch(d, o);
      data.id = props.org.id;
    }
    else if (props.project) {
      patch = (d, o) => projectService.patch(props.project.org, d, o);
      data.id = props.project.id;
      data.visibility = visibility;
    }
    else if (props.branch) {
      patch = (d, o) => branchService.patch(props.branch.org, props.branch.project, d, o);
      data.id = props.branch.id;
    }

    // Remove blank key/value pair in custom data
    if (data.custom[''] === '') {
      delete data.custom[''];
    }

    const [err, response] = await patch(data, {});

    if (err) {
      setError(err);
    }
    else if (response) {
      props.refresh();
      props.toggle();
    }
  };


  // Initialize variables
  let disableSubmit = (message.length > 0);
  let title;

  if (props.org) {
    title = 'Organization';
  }
  else if (props.branch) {
    title = `[${props.branch.id}] Branch`;
  }
  else {
    title = 'Project';
  }

  // Verify if custom data is correct JSON format
  try {
    JSON.parse(custom);
  }
  catch (err) {
    // Set invalid fields
    disableSubmit = true;
  }

  // Render organization edit page
  return (
    <div id='workspace'>
      <div className='workspace-header'>
        <h2 className='workspace-title workspace-title-padding'>Edit {title}</h2>
      </div>
      <div id='workspace-body' className='extra-padding'>
        <div className='main-workspace'>
          {(!error)
            ? ''
            : (<UncontrolledAlert color="danger">
                {error}
              </UncontrolledAlert>)
          }
          {/* Create form to update org data */}
          <Form>
            {/* Form section for org name */}
            <FormGroup>
              <Label for="name">Name</Label>
              <Input type="name"
                     name="name"
                     id="name"
                     placeholder="Name"
                     value={name || ''}
                     onChange={handleChange}/>
            </FormGroup>
            {(!props.project)
              ? ''
              // Form section for project visibility
              : (<FormGroup>
                  <Label for="visibility">Visibility</Label>
                  <Input type="select"
                         name="visibility"
                         id="visibility"
                         value={visibility}
                         onChange={handleChange}>
                    <option value='internal'>Internal</option>
                    <option value='private'>Private</option>
                  </Input>
                 </FormGroup>)
            }
            {/* Form section for custom data */}
            <FormGroup>
              <CustomEdit data={custom}
                          customChange={customChange}
                          handleChange={handleChange}/>
            </FormGroup>
            {/* Form section for archiving */}
            <FormGroup check className='bottom-spacing'>
              <Label check>
                <Input type="checkbox"
                       name="archived"
                       id="archived"
                       checked={archived}
                       value={archived || false}
                       onChange={handleChange} />
                Archive
              </Label>
            </FormGroup>
            {/* Button to submit changes */}
            <Button color='primary' disabled={disableSubmit} onClick={onSubmit}> Submit </Button>
            {' '}
            <Button outline onClick={props.toggle}> Cancel </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default EditPage;
