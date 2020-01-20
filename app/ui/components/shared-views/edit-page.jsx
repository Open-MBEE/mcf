/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.shared-views.edit-page
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
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

// React modules
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

// MBEE modules
import CustomEdit from '../general/custom-data/custom-edit.jsx';

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

    if (props.org) {
      name = props.org.name;
      archived = props.org.archived;
      custom = props.org.custom;
    }
    else if (props.branch) {
      name = props.branch.name;
      archived = props.branch.archived;
      custom = props.branch.custom;
    }
    else {
      name = props.project.name;
      archived = props.project.archived;
      custom = props.project.custom;
      visibility = props.project.visibility;
    }

    this.state = {
      name: name,
      visibility: visibility,
      archived: archived,
      custom: JSON.stringify(custom || {}, null, 2),
      error: null,
      message: ''
    };

    // Bind component function
    this.handleChange = this.handleChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.customChange = this.customChange.bind(this);
  }

  customChange(rows, error) {
    const newState = { message: error };

    if (error.length === 0) {
      // Create custom data object from rows of key/value pairs.
      const custom = {};
      rows.forEach((row) => {
        let value = '';

        // Parse custom data input values
        try {
          value = JSON.parse(row.value);
        }
        catch (err) {
          // Treat input as string
          value = row.value;
        }

        Object.assign(custom, { [row.key]: value });
      });

      newState.custom = JSON.stringify(custom, null, 2);
    }

    this.setState(newState);
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
  }

  // Define the submit function
  onSubmit() {
    if (this.state.error) {
      this.setState({ error: null });
    }

    // Initialize variables
    let url;
    const custom = JSON.parse(this.state.custom);
    const data = { name: this.state.name, custom: custom };

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

    // Remove blank key/value pair in custom data
    if (data.custom[''] === '') {
      delete data.custom[''];
    }

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
    let disableSubmit = (this.state.message.length > 0);
    let title;

    if (this.props.org) {
      title = 'Organization';
    }
    else if (this.props.branch) {
      title = `[${this.props.branch.id}] Branch`;
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
                           value={this.state.visibility}
                           onChange={this.handleChange}>
                      <option value='internal'>Internal</option>
                      <option value='private'>Private</option>
                    </Input>
                   </FormGroup>)
              }
              {/* Form section for custom data */}
              <FormGroup>
                <CustomEdit data={this.state.custom}
                            customChange={this.customChange}
                            handleChange={this.handleChange}/>
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
