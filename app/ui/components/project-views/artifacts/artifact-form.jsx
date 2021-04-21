/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.artifacts.artifact-form.jsx
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author James Eckstein
 *
 * @description This renders the form to create/update an artifact.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect } from 'react';
import {
  Form,
  Row,
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
function ArtifactForm(props) {
  const { artifactService } = useApiClient();
  const [values, setValues] = useState({
    id: uuidv4(),
    filename: '',
    description: '',
    archived: false,
    filesize: 0,
    location: '',
    custom: JSON.stringify({}, null, 2)
  });
  const [file, setFile] = useState(null);
  const [upload, setUpload] = useState(true);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === 'archived') {
      setValues((prevState) => ({
        ...prevState,
        archived: !prevState.archived
      }));
    }
    else if (name === 'file') {
      setFile(files[0]);
      setValues((prevState) => ({
        ...prevState,
        filename: files[0].name
      }));
    }
    else if (name === 'upload' || name === 'existing') {
      setUpload((prevState) => !prevState);
      setValues((prevState) => ({
        ...prevState,
        filename: ''
      }));
    }
    else {
      setValues((prevState) => ({
        ...prevState,
        [name]: value
      }));
    }

    e.persist();

    // Resize custom data field
    $('textarea[name="custom"]').autoResize();
  };

  const onSubmit = async () => {
    if (error) setError(null);

    // Base request variables
    const orgID = props.project.org;
    const projID = props.project.id;
    const branchID = props.branchId;
    const method = (props.artifactId) ? 'patch' : 'post';

    // Extract state data
    const { id, filename, filesize, location, custom, archived, description } = values;

    // Set size of blob, if file is provided
    const size = (file) ? file.size : filesize;

    const data = {
      id: id,
      filename: filename,
      location: location,
      custom: JSON.parse(custom),
      archived: archived,
      description: description,
      size: size
    };

    // Post or patch the artifact data
    const [err, result] = await artifactService[method](orgID, projID, branchID, data);


    if (err) {
      if (err === 'Artifact blob already exists.') {
        props.refresh();
        props.toggle();
      }
      else {
        setError(err);
      }
    }
    else if (result) {
      // If posting an artifact, post the blob too
      if (method === 'post') {
        // Add file to be uploaded
        const fileData = new FormData();
        fileData.append('file', file);
        fileData.append('filename', filename);
        fileData.append('location', location);

        // Post the blob
        const [blobErr] = await artifactService.postBlob(orgID, projID, fileData);

        if (blobErr) {
          setError(blobErr);
          return;
        }
      }
      props.refresh();
      props.toggle();
    }
  };

  // on mount
  useEffect(() => {
    if (!props.artifactId) {
      return;
    }

    // Populate form with artifact data if an artifact is being edited
    const orgID = props.project.org;
    const projectID = props.project.id;
    const branchID = props.branchId;

    const options = {
      ids: props.artifactId,
      includeArchived: true
    };

    // Get artifact data
    artifactService.get(orgID, projectID, branchID, options)
    .then(([err, artifacts]) => {
      if (err) {
        setError(err);
      }
      else if (artifacts) {
        const artifact = artifacts[0];
        setValues({
          id: artifact.id,
          description: artifact.description,
          filename: artifact.filename,
          filesize: artifact.size,
          location: artifact.location,
          custom: JSON.stringify(artifact.custom, null, 2),
          archived: artifact.archived
        });
      }
    });

    // Resize custom data field
    $('textarea[name="custom"]').autoResize();
  }, []);

  let title = 'Create Artifact';
  let artifactId = values.id;
  let disableUpdate = false;
  let customInvalid = false;
  let idInvalid = false;
  let locationInvalid = false;
  let filenameInvalid = false;


  // If user is editing an Artifact Document use ID from props
  if (props.artifactId) {
    title = 'Edit Artifact';
    artifactId = props.artifactId;

    // Allow user to modify blob location and filename if a file was selected
    disableUpdate = (!file);
  }

  // Only validate if ID has been entered
  if (artifactId.length !== 0) {
    const validatorsArtifactId = `^${validators.artifact.id.split(validators.ID_DELIMITER).pop()}`;
    const maxLength = validators.artifact.idLength - validators.branch.idLength - 1;
    const validLength = (artifactId.length <= maxLength);
    idInvalid = (!validLength) || (!RegExp(validatorsArtifactId).test(artifactId));
  }

  const { location, filename } = values;

  // Validate if location is entered or file has been selected
  if (location.length !== 0 || file || filename.length !== 0) {
    const validatorLocation = validators.artifact.locationRegEx;
    const validatorFilename = validators.artifact.filenameRegEx;
    locationInvalid = (!RegExp(validatorLocation).test(location));
    filenameInvalid = (!RegExp(validatorFilename).test(filename));
  }

  // Verify custom data is valid
  try {
    JSON.parse(values.custom);
  }
  catch (err) {
    customInvalid = true;
  }

  const disableSubmit = (idInvalid || locationInvalid || filenameInvalid || customInvalid);

  // Error alert
  const errorAlert = (error)
    ? (<UncontrolledAlert color="danger">
        {error}
       </UncontrolledAlert>)
    : '';

  // Render file selector based on radio button selection
  const fileSelection = (upload)
    ? (<FormGroup>
      <Input id="fileBrowser" type="file" name="file" onChange={handleChange}/>
      </FormGroup>)
    : ('');

  // Render artifact edit page
  return (
    <div id='workspace'>
      <div className='workspace-header'>
        <h2 className='workspace-title workspace-title-padding'>{title}</h2>
      </div>
      <div id='workspace-body' className='extra-padding'>
        <div className='main-workspace'>
          {/* If errors are detected, display alert */}
          {errorAlert}
          {/* Create form to update artifact data */}
          <Form>
            {/* Form section for artifact ID */}
            <FormGroup>
              <Label for="id">Artifact ID*</Label>
              <Input type="id"
                     name="id"
                     id="id"
                     placeholder="Artifact ID"
                     value={artifactId || ''}
                     invalid={idInvalid}
                     disabled={!!(props.artifactId)}
                     onChange={handleChange}/>
            </FormGroup>
            {/* Form section for artifact branch */}
            <FormGroup>
              <Label for="branch">Branch</Label>
              <Input type="branch"
                     name="branch"
                     id="branch"
                     placeholder="Branch"
                     value={props.branchId || 'master'}
                     disabled
                     onChange={handleChange}/>
            </FormGroup>
            {/* Form section for artifact location */}
            <FormGroup>
              <Label for="location">Location*</Label>
              <Input type="location"
                     name="location"
                     id="location"
                     placeholder="Location"
                     disabled={disableUpdate}
                     value={values.location || ''}
                     invalid={locationInvalid}
                     onChange={handleChange}/>
            </FormGroup>
            {/* Form section for artifact filename */}
            <FormGroup>
              <Label for="filename">Filename</Label>
              <Input type="filename"
                     name="filename"
                     id="filename"
                     placeholder="Filename"
                     disabled={disableUpdate}
                     value={values.filename || ''}
                     invalid={filenameInvalid}
                     onChange={handleChange}/>
            </FormGroup>
            {/* Radio Buttons for file browser */}
            <Row style={{ marginLeft: '0', marginBottom: '10px' }}>
              <FormGroup check>
                <Label check>
                  <Input type="radio"
                         name="upload"
                         value={upload}
                         checked={upload}
                         onChange={handleChange}/>{' '}
                  Upload File
                </Label>
              </FormGroup>
            </Row>
            {/* Create an input for file upload */}
            {fileSelection}
            {/* Create an input for artifact description */}
            <FormGroup>
              <Label for="description">Description</Label>
              <Input type="description"
                     name="description"
                     id="description"
                     placeholder="Description"
                     value={values.description || ''}
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
            {/* Form section for archiving */}
            <FormGroup check className='bottom-spacing'>
              <Label check>
                <Input type="checkbox"
                       name="archived"
                       id="archived"
                       checked={values.archived}
                       value={values.archived || false}
                       onChange={handleChange} />
                Archive
              </Label>
            </FormGroup>
            <div className='required-fields'>* required fields.</div>
            {/* Button to submit changes */}
            <Button color='primary'
                    disabled={disableSubmit}
                    onClick={onSubmit}>
              Submit
            </Button>
            {' '}
            <Button outline onClick={props.toggle}> Cancel </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default ArtifactForm;
