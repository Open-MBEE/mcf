/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.branches.branch-new
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the form to create a new branch.
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
import validators from '../../../../../build/json/validators.json';

/* eslint-enable no-unused-vars */

class CreateBranch extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      branches: [],
      name: '',
      id: '',
      source: 'master',
      tag: false,
      error: null,
      custom: JSON.stringify({}, null, 2)
    };

    // Bind component functions
    this.handleChange = this.handleChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  // Define handle change function
  handleChange(event) {
    // Verify target being changed
    if (event.target.name === 'tag') {
      // Change the archive state to opposite value
      this.setState(prevState => ({ tag: !prevState.tag }));
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
    const orgId = this.props.project.org;
    const projId = this.props.project.id;
    const base = `/api/orgs/${orgId}/projects/${projId}/branches`;
    const url = `${base}/${this.state.id}`;

    // Initialize project data
    const data = {
      id: this.state.id,
      name: this.state.name,
      source: this.state.source,
      tag: this.state.tag,
      custom: JSON.parse(this.state.custom)
    };

    $.ajax({
      method: 'POST',
      url: `${url}?minified=true`,
      contentType: 'application/json',
      data: JSON.stringify(data),
      statusCode: {
        200: () => {
          window.location.reload();
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
    const orgId = this.props.project.org;
    const projId = this.props.project.id;
    const base = `/api/orgs/${orgId}/projects/${projId}/branches`;
    const url = `${base}?minified=true`;

    $.ajax({
      method: 'GET',
      url: url,
      statusCode: {
        200: (data) => {
          this.setState({ branches: data });
        },
        400: (err) => {
          this.setState({ error: err.responseText });
        },
        401: () => {
          this.setState({ branches: [] });

          // Refresh when session expires
          window.location.reload();
        },
        403: (err) => {
          this.setState({ error: err.responseText });
        },
        404: (err) => {
          this.setState({ error: err.responseText });
        }
      }
    });
  }


  render() {
    // Initialize validators
    let idInvalid = false;
    let customInvalid = false;

    const branches = [];
    const tags = [];

    this.state.branches.forEach((branch, idx) => {
      const option = (<option key={`opt-${idx}`} className='branch-opts' value={branch.id}>
                        {(branch.name.length > 0) ? branch.name : branch.id}
                      </option>);

      const options = (branch.tag) ? tags : branches;

      options.push(option);
    });

    // Verify if id is valid
    const { id } = this.state;
    const validatorsBranchId = validators.branch.id.split(validators.ID_DELIMITER).pop();
    const maxLength = validators.branch.idLength - validators.project.idLength - 1;

    if (id.length !== 0) {
      idInvalid = (id.length > maxLength || (!RegExp(validatorsBranchId).test(id)));
    }

    // Verify custom data is valid
    try {
      JSON.parse(this.state.custom);
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
          {(!this.state.error)
            ? ''
            : (<UncontrolledAlert color="danger">
              {this.state.error}
            </UncontrolledAlert>)
          }
          <Form>
            <FormGroup>
              <Label for="source">Source Branch</Label>
              <Input type='select'
                     name='source'
                     id='source'
                     className='branch-input'
                     value={this.state.source || ''}
                     onChange={this.handleChange}>
                <option disabled={true}>Branches</option>
                {branches}
                <option disabled={true}>Tags</option>
                {tags}
              </Input>
            </FormGroup>
            {/* Create an input for project id */}
            <FormGroup>
              <Label for="id">Branch ID*</Label>
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
              <Label for="name">Branch Name</Label>
              <Input type="name"
                     name="name"
                     id="name"
                     placeholder="Name"
                     value={this.state.name || ''}
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
            <FormGroup check className='bottom-spacing'>
              <Label check>
                <Input type="checkbox"
                       name="tag"
                       id="tag"
                       checked={this.state.tag}
                       value={this.state.tag}
                       onChange={this.handleChange} />
                Tag
              </Label>
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

export default CreateBranch;
