/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.elements.element-new
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders create element component.
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
  Button,
  Col,
  FormFeedback,
  UncontrolledAlert
} from 'reactstrap';

// MBEE Modules
import validators from '../../../../../build/json/validators';

/* eslint-enable no-unused-vars */

class ElementNew extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Generate a pseudo-UUID
    const rnd = (n) => Math.random().toString(16).slice(2, 2 + n);
    const rndID = `${rnd(8)}-${rnd(4)}-${rnd(4)}-${rnd(4)}-${rnd(8)}${rnd(8)}`;

    // Initialize state props
    this.state = {
      id: rndID,
      name: '',
      type: '',
      parent: this.props.parent,
      target: null,
      source: null,
      custom: null,
      org: null,
      project: null,
      branch: 'master',
      error: null
    };

    // Bind component function
    this.handleChange = this.handleChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props.parent !== prevProps.parent) {
      this.setState({ parent: this.props.parent });
    }
  }

  // Define handle change function
  handleChange(event) {
    // Change the state with new value
    this.setState({ [event.target.name]: event.target.value });
  }

  // Define the submit function
  onSubmit() {
    // Initialize variables
    const data = {
      id: this.state.id,
      name: this.state.name,
      type: this.state.type,
      parent: this.state.parent
    };

    const oid = this.props.project.org;
    const pid = this.props.project.id;
    const baseUrl = `/api/orgs/${oid}/projects/${pid}/branches/master`;
    const url = `${baseUrl}/elements/${data.id}`;

    $.ajax({
      method: 'POST',
      url: `${url}?minified=true`,
      contentType: 'application/json',
      data: JSON.stringify(data),
      statusCode: {
        200: () => {
          this.props.closeSidePanel(null, true, false);
        },
        401: (err) => {
          this.setState({ error: err.responseJSON.description });

          // Refresh when session expires
          window.location.reload();
        },
        403: (err) => {
          this.setState({ error: err.responseJSON.description });
        }
      }
    });
  }

  render() {
    let idInvalid;
    let disableSubmit;

    // Verify if user's first name is valid
    if (!RegExp(validators.id).test(this.state.id)) {
      // Set invalid fields
      idInvalid = true;
      disableSubmit = true;
    }
    // Verify parent was selected
    if (this.state.parent === null) {
      // Disable submit
      disableSubmit = true;
    }

    // Render organization edit page
    return (
      <div className='element-create'>
        <h2>New Element</h2>
        {(!this.state.error)
          ? ''
          : (<UncontrolledAlert color="danger">
              {this.state.error}
             </UncontrolledAlert>)
        }
        <Form>
          <FormGroup row>
            <Label for="name" sm={2}>ID</Label>
            <Col sm={10}>
              <Input type="text"
                   name="id"
                   id="name"
                   placeholder="Element name"
                   value={this.state.id}
                   invalid={idInvalid}
                   onChange={this.handleChange}/>
              {/* If invalid id, notify user */}
              <FormFeedback >
                Invalid: A id may only contain lower case letters, numbers, or dashes.
              </FormFeedback>
            </Col>
          </FormGroup>
          <FormGroup row>
            <Label for="name" sm={2}>Name</Label>
            <Col sm={10}>
              <Input type="text"
                     name="name"
                     id="name"
                     placeholder="Element name"
                     value={this.state.name || ''}
                     onChange={this.handleChange}/>
            </Col>
          </FormGroup>
          <FormGroup row>
            <Label for="type" sm={2}>Type</Label>
            <Col sm={10}>
              <Input type="text"
                     name="type"
                     id="type"
                     placeholder="Element type"
                     value={this.state.type || ''}
                     onChange={this.handleChange}/>
            </Col>
          </FormGroup>
          <FormGroup row>
            <Label for="parent" sm={2}>Parent</Label>
            <Col sm={10}>
              <p id="parent">
                {this.state.parent || 'Select an element in the model tree.'}
              </p>
            </Col>
          </FormGroup>
          <Button className='btn btn'
                  outline color="primary"
                  disabled={disableSubmit} onClick={this.onSubmit}>
            Submit
          </Button>
          <Button className='btn btn'
                  outline color="secondary"
                  onClick={this.props.closeSidePanel}>
            Cancel
          </Button>
        </Form>
      </div>
    );
  }

}

// Export component
export default ElementNew;
