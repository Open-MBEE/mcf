/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.artifacts.artifact-form.jsx
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author James Eckstein
 *
 * @description This renders the form to create/update an artifact.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
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

/* eslint-enable no-unused-vars */

class ArtifactForm extends Component {

  constructor(props) {
    super(props);

    this.state = {
      id: '',
      archived: false,
      custom: JSON.stringify({}, null, 2),
      error: null,
      file: null,
      filename: '',
      filesize: 0,
      description: '',
      location: '',
      upload: true
    };

    // Bind component functions
    this.handleChange = this.handleChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  handleChange(event) {
    const { name, value, files } = event.target;

    if (name === 'archived') {
      this.setState((prevState) => ({ [name]: !prevState.archived }));
    }
    else if (name === 'file') {
      this.setState({ file: files[0], filename: files[0].name });
    }
    else if (name === 'upload' || name === 'existing') {
      this.setState((prevState) => ({ upload: !prevState.upload, filename: '' }));
    }
    else {
      this.setState({ [name]: value });
    }

    // Resize custom data field
    $('textarea[name="custom"]').autoResize();
  }

  // Submit Artifact data
  onSubmit() {
    if (this.state.error) {
      this.setState({ error: null });
    }

    // Base request variables
    const orgId = this.props.project.org;
    const projId = this.props.project.id;
    const branchId = this.props.branchId;
    const artifactId = (this.props.artifactId) ? this.props.artifactId : this.state.id;
    const method = (this.props.artifactId) ? 'PATCH' : 'POST';
    const base = `/api/orgs/${orgId}/projects/${projId}/branches/${branchId}/artifacts`;
    const url = `${base}/${artifactId}`;

    // Extract state data
    const { id, file, filename, filesize, location, custom, archived, description } = this.state;

    // Set size of blob, if file is provided
    const size = (file) ? file.size : filesize;

    const body = {
      id: id,
      filename: filename,
      location: location,
      custom: JSON.parse(custom),
      archived: archived,
      description: description,
      size: size
    };

    // Artifact document POST/PATCH
    $.ajax({
      method: method,
      url: `${url}?minified=true`,
      contentType: 'application/json',
      data: JSON.stringify(body)
    })
    .done(() => {
      // Artifact Blob POST
      if (file) {
        // Build url for Artifact Blob endpoint
        const blobUrl = `/api/orgs/${orgId}/projects/${projId}/artifacts/blob`;

        // Add file to be uploaded
        const data = new FormData();
        data.append('file', file);
        data.append('filename', filename);
        data.append('location', location);

        $.ajax({
          method: 'POST',
          url: blobUrl,
          data: data,
          enctype: 'multipart/form-data',
          processData: false,
          contentType: false
        })
        .done(() => {
          window.location.reload();
        })
        .fail((res) => {
          this.setState({ error: res.responseText });
        });
      }
      else {
        window.location.reload();
      }
    })
    .fail(res => {
      this.setState({ error: res.responseText });
    });
  }

  // Populate form with Artifact data
  componentDidMount() {
    if (!this.props.artifactId) {
      return;
    }

    // Base URL variables
    const { org, id } = this.props.project;
    const branchId = this.props.branchId;
    const base = `/api/orgs/${org}/projects/${id}/branches/${branchId}/artifacts/${this.props.artifactId}`;
    const opts = 'includeArchived=true&minified=true';
    const url = `${base}?${opts}`;

    $.ajax({
      method: 'GET',
      url: url,
      contentType: 'application/json'
    })
    .done(data => {
      this.setState({
        id: data.id,
        description: data.description,
        filename: data.filename,
        filesize: data.size,
        location: data.location,
        custom: JSON.stringify(data.custom, null, 2),
        archived: data.archived
      });
    })
    .fail(res => {
      this.setState({ error: res.responseText });
    });

    // Resize custom data field
    $('textarea[name="custom"]').autoResize();
  }

  // Render Artifacts form
  render() {
    let title = 'Create Artifact';
    let artifactId = this.state.id;
    let disableUpdate = false;

    // If user is editing an Artifact Document
    if (this.props.artifactId) {
      title = 'Edit Artifact';
      artifactId = this.props.artifactId;

      // Allow user to modify blob location and filename if a file was selected
      disableUpdate = (!this.state.file);
    }

    // Validate input
    const idInvalid = (artifactId.length > 0) ? (!RegExp(validators.id).test(artifactId)) : false;
    let customInvalid;

    // Verify custom data is valid
    try {
      JSON.parse(this.state.custom);
    }
    catch (err) {
      customInvalid = true;
    }

    // Error alert
    const error = (this.state.error)
      ? (<UncontrolledAlert color="danger">
          {this.state.error}
         </UncontrolledAlert>)
      : '';

    // Render file selector based on radio button selection
    const fileSelection = (this.state.upload)
      ? (<FormGroup>
        <Input id="fileBrowser" type="file" name="file" onChange={this.handleChange}/>
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
            {error}
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
                       disabled={!!(this.props.artifactId)}
                       onChange={this.handleChange}/>
              </FormGroup>
              {/* Form section for artifact branch */}
              <FormGroup>
                <Label for="branch">Branch</Label>
                <Input type="branch"
                       name="branch"
                       id="branch"
                       placeholder="Branch"
                       value={this.props.branchId || 'master'}
                       disabled
                       onChange={this.handleChange}/>
              </FormGroup>
              {/* Form section for artifact location */}
              <FormGroup>
                <Label for="location">Location</Label>
                <Input type="location"
                       name="location"
                       id="location"
                       placeholder="Location"
                       disabled={disableUpdate}
                       value={this.state.location || ''}
                       onChange={this.handleChange}/>
              </FormGroup>
              {/* Form section for artifact filename */}
              <FormGroup>
                <Label for="filename">Filename</Label>
                <Input type="filename"
                       name="filename"
                       id="filename"
                       placeholder="Filename"
                       disabled={disableUpdate}
                       value={this.state.filename || ''}
                       onChange={this.handleChange}/>
              </FormGroup>
              {/* Radio Buttons for file browser */}
              <Row style={{ marginLeft: '0', marginBottom: '10px' }}>
                <FormGroup check>
                  <Label check>
                    <Input type="radio"
                           name="upload"
                           value={this.state.upload}
                           checked={this.state.upload}
                           onChange={this.handleChange}/>{' '}
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
                       value={this.state.description || ''}
                       onChange={this.handleChange}/>
              </FormGroup>
              {/* Create an input for custom data */}
              <FormGroup>
                <Label for="custom">Custom Data</Label>
                <Input type="textarea"
                       name="custom"
                       id="custom"
                       placeholder="Custom Data"
                       value={this.state.custom || ''}
                       invalid={customInvalid}
                       onChange={this.handleChange}/>
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
                         checked={this.state.archived}
                         value={this.state.archived || false}
                         onChange={this.handleChange} />
                  Archive
                </Label>
              </FormGroup>
              {/* Button to submit changes */}
              <Button color='primary'
                      disabled={idInvalid || customInvalid}
                      onClick={this.onSubmit}>
                Submit
              </Button>
              {' '}
              <Button outline onClick={this.props.toggle}> Cancel </Button>
            </Form>
          </div>
        </div>
      </div>
    );
  }

}

export default ArtifactForm;
