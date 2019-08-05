/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.shared-views.edit-page
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the edit page.
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

class EditPage extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    let name;
    let custom;
    let visibility;
    let archived;

    if (this.props.org) {
      name = this.props.org.name;
      archived = this.props.org.archived;
      custom = this.props.org.custom;
    }
    else if (this.props.branch) {
      name = this.props.branch.name;
      archived = this.props.branch.archived;
      custom = this.props.branch.custom;
    }
    else {
      name = this.props.project.name;
      archived = this.props.project.archived;
      custom = this.props.project.custom;
      visibility = this.props.visibility;
    }

    this.state = {
      name: name,
      visibility: visibility,
      archived: archived,
      custom: JSON.stringify(custom || {}, null, 2),
      error: null
    };

    // Bind component function
    this.handleChange = this.handleChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  componentDidMount() {
    $('textarea[name="custom"]').autoResize();
  }

  // Define handle change function
  handleChange(event) {
    // Verify target being changed
    if (event.target.name === 'archived') {
      // Change the archive state to opposite value
      this.setState(prevState => ({ archived: !prevState.archived }));
    }
    else {
      // Change the state with new value
      this.setState({ [event.target.name]: event.target.value });
    }

    // Resize custom data field
    $('textarea[name="custom"]').autoResize();
  }

  // Define the submit function
  onSubmit() {
    if (this.state.error) {
      this.setState({ error: null });
    }

    // Initialize variables
    let url;
    const data = {
      name: this.state.name,
      custom: JSON.parse(this.state.custom)
    };


    if (this.props.org) {
      url = `/api/orgs/${this.props.org.id}`;
    }
    else if (this.props.branch) {
      const branch = this.props.branch;
      url = `/api/orgs/${branch.org}/projects/${branch.project}/branches/${branch.id}`;
    }
    else {
      data.visibility = this.state.visibility;
      url = `/api/orgs/${this.props.orgid}/projects/${this.props.project.id}`;
    }

    data.archived = this.state.archived;

    $.ajax({
      method: 'PATCH',
      url: `${url}?minified=true`,
      contentType: 'application/json',
      data: JSON.stringify(data),
      statusCode: {
        200: () => { window.location.reload(); },
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
    let customInvalid;
    let disableSubmit;
    let title;

    if (this.props.org) {
      title = 'Organization';
    }
    else if (this.props.branch) {
      title = ` [${this.props.branch.id}] Branch`;
    }
    else {
      title = 'Project';
    }


    // Verify if custom data is correct JSON format
    try {
      JSON.parse(this.state.custom);
    }
    catch (err) {
      // Set invalid fields
      customInvalid = true;
      disableSubmit = true;
    }

    // Render organization edit page
    return (
      <div id='workspace'>
        <div id='workspace-header' className='workspace-header'>
          <h2 className='workspace-title workspace-title-padding'>Edit {title}</h2>
        </div>
        <div id='workspace-body' className='extra-padding'>
          <div className='main-workspace'>
            {(!this.state.error)
              ? ''
              : (<UncontrolledAlert color="danger">
                  {this.state.error}
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
                       value={this.state.name || ''}
                       onChange={this.handleChange}/>
              </FormGroup>
              {(!this.props.project)
                ? ''
                // Form section for project visibility
                : (<FormGroup>
                    <Label for="visibility">Visibility</Label>
                    <Input type="select"
                           name="visibility"
                           id="visibility"
                           value={this.state.visibility || ''}
                           onChange={this.handleChange}>
                      <option>Choose one...</option>
                      <option value='internal'>Internal</option>
                      <option value='private'>Private</option>
                    </Input>
                   </FormGroup>)
              }
              {/* Form section for custom data */}
              <FormGroup>
                <Label for="custom">Custom Data</Label>
                <Input type="textarea"
                       name="custom"
                       id="custom"
                       placeholder="Custom Data"
                       value={this.state.custom || ''}
                       invalid={customInvalid}
                       onChange={this.handleChange}/>
                {/* Verify fields are valid, or display feedback */}
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
              <Button color='primary' disabled={disableSubmit} onClick={this.onSubmit}> Submit </Button>
              {' '}
              <Button outline onClick={this.props.toggle}> Cancel </Button>
            </Form>
          </div>
        </div>
      </div>
    );
  }

}

export default EditPage;
