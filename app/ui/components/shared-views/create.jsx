/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.shared-views.create
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the create page.
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
import validators from '../../../../build/json/validators.json';

/* eslint-enable no-unused-vars */

class Create extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      orgOpt: null,
      org: null,
      name: '',
      id: '',
      visibility: 'private',
      error: null,
      custom: JSON.stringify({}, null, 2)
    };

    // Bind component functions
    this.handleChange = this.handleChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  // Define handle change function
  handleChange(event) {
    // Set state of the changed states in form
    this.setState({ [event.target.name]: event.target.value });
  }

  // Define the submit function
  onSubmit() {
    // Initialize data
    const data = {
      id: this.state.id,
      name: this.state.name,
      custom: JSON.parse(this.state.custom)
    };

    // Initialize variables
    let url;
    let redirect;

    // Verify if this is for a project
    if (this.props.project) {
      if (!this.props.org) {
        // Set org as the state prop
        url = `/api/orgs/${this.state.org}/projects/${this.state.id}`;
        redirect = `/orgs/${this.state.org}/projects/${this.state.id}/branches/master/elements`;
      }
      else {
        // Set org as the parent prop
        url = `/api/orgs/${this.props.org.id}/projects/${this.state.id}`;
        redirect = `/orgs/${this.props.org.id}/projects/${this.state.id}/branches/master/elements`;
      }
      // Set project visibility
      data.visibility = this.state.visibility;
    }
    else {
      url = `/api/orgs/${this.state.id}`;
      redirect = `/orgs/${this.state.id}`;
    }

    $.ajax({
      method: 'POST',
      url: `${url}?minified=true`,
      contentType: 'application/json',
      data: JSON.stringify(data),
      statusCode: {
        200: () => {
          // On success, return to project-views page
          window.location.replace(redirect);
        },
        401: (err) => {
          // Refresh when session expires
          window.location.reload();
        },
        403: (err) => {
          this.setState({ error: err.responseText });
        }
      }
    });
  }

  componentDidMount() {
    // Verify no orgs were passed in props
    if (this.props.project && this.props.orgs) {
      // Loop through orgs
      const orgOptions = this.props.orgs.map((org) => (<option value={org.id}>{org.name}</option>));

      // Set the org options state
      this.setState({ orgOpt: orgOptions });
    }
  }


  render() {
    // Initialize validators
    let title;
    let header;
    let idInvalid = false;
    let customInvalid = false;
    let validatorId;
    let validLen;

    if (this.props.project) {
      title = (this.props.org) ? `New Project in ${this.props.org.name}` : 'New Project';
      header = 'Project';
      validatorId = validators.project.id.split(validators.ID_DELIMITER).pop();
      // Calculate project ID sans delimiter
      validLen = validators.project.idLength - validators.org.idLength - 1;
    }
    else {
      validatorId = validators.org.id;
      validLen = validators.org.idLength;
      title = 'New Organization';
      header = 'Organization';
    }

    const { id, name } = this.state;

    if (id.length !== 0) {
      idInvalid = (id.length > validLen || (!RegExp(validatorId).test(id)));
    }

    // Verify custom data is valid
    try {
      JSON.parse(this.state.custom);
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
          {(!this.state.error)
            ? ''
            : (<UncontrolledAlert color="danger">
                {this.state.error}
               </UncontrolledAlert>)
          }
          <Form>
            {/* Verify if org provided */}
            {(this.props.project && !this.props.org)
              ? (// Display options to choose the organization
                <FormGroup>
                  <Label for="org">Organization ID</Label>
                  <Input type="select"
                         name="org"
                         id="org"
                         value={this.state.org || ''}
                         onChange={this.handleChange}>
                    <option>Choose one...</option>
                    {this.state.orgOpt}
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
                     value={this.state.id || ''}
                     invalid={idInvalid}
                     onChange={this.handleChange}/>
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
                     value={this.state.name || ''}
                     onChange={this.handleChange}/>
              {/* If invalid name, notify user */}
              <FormFeedback >
                Invalid: A name may only contain letters, numbers, space, or dashes.
              </FormFeedback>
            </FormGroup>
            {/* Form section for project visibility */}
            {(!this.props.project)
              ? ''
              : (<FormGroup>
                <Label for="visibility">Visibility</Label>
                <Input type="select"
                       name="visibility"
                       id="visibility"
                       value={this.state.visibility || ''}
                       onChange={this.handleChange}>
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
                     value={this.state.custom || ''}
                     invalid={customInvalid}
                     onChange={this.handleChange}/>
              {/* If invalid custom data, notify user */}
              <FormFeedback>
                Invalid: Custom data must be valid JSON
              </FormFeedback>
            </FormGroup>
            <div className='required-fields'>* required fields.</div>

            {/* Button to create project */}
                <Button outline color='primary'
                        disabled={disableSubmit} onClick={this.onSubmit}>
                  Create
                </Button>
                {' '}
                <Button outline onClick={this.props.toggle}> Cancel </Button>
            </Form>
        </div>
    </div>
    );
  }

}

export default Create;
