/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.element-edit
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the element component
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
  Row,
  Col,
  UncontrolledTooltip,
  UncontrolledAlert
} from 'reactstrap';

// MBEE Modules
import validators from '../../../../../build/json/validators.json';

/* eslint-enable no-unused-vars */

class ElementEdit extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);
    // Initialize state props
    this.state = {
      id: this.props.id,
      name: '',
      type: '',
      parent: null,
      target: null,
      source: null,
      documentation: '',
      custom: {},
      org: null,
      project: null,
      parentUpdate: null,
      error: null
    };

    // Bind component function
    this.getElement = this.getElement.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  getElement() {
    // Initialize variables
    const elementId = this.state.id;
    const url = `${this.props.url}/branches/master/elements/${elementId}?minified=true`;

    // Get element data
    $.ajax({
      method: 'GET',
      url: url,
      statusCode: {
        200: (element) => {
          this.setState({
            element: element,
            name: element.name,
            type: element.type,
            documentation: element.documentation,
            custom: JSON.stringify(element.custom, null, 2),
            org: element.org,
            project: element.project
          });

          if (element.parent) {
            this.setState({ parent: element.parent });
            this.setState({ parentUpdate: element.parent });
          }
          if (element.source) {
            this.setState({ source: element.source });
          }
          if (element.target) {
            this.setState({ target: element.target });
          }

          $('textarea[name="custom"]').autoResize();
          // Resize custom data field
          $('textarea[name="documentation"]').autoResize();
        },
        401: (err) => {
          // Throw error and set state
          this.setState({ error: err.responseJSON.description });

          // Refresh when session expires
          window.location.reload();
        },
        404: (err) => {
          this.setState({ error: err.responseJSON.description });
        }
      }
    });
  }

  componentDidMount() {
    this.getElement();
  }

  // Define handle change function
  handleChange(event) {
    // Change the state with new value
    this.setState({ [event.target.name]: event.target.value });

    if (event.target.name === 'custom') {
      // Resize custom data field
      $('textarea[name="custom"]').autoResize();

      // Verify if custom data is correct JSON format
      try {
        JSON.parse(this.state.custom);
      }
      catch (err) {
        this.setState({ error: 'Custom data must be valid JSON.' });
      }
    }
    else if (event.target.name === 'documentation') {
      // Resize custom data field
      $('textarea[name="documentation"]').autoResize();
    }
  }

  // Define the submit function
  onSubmit() {
    // Initialize variables
    let parentUpdated;
    const elementId = this.state.id;
    const url = `${this.props.url}/branches/master/elements/${elementId}?minified=true`;
    const data = {
      name: this.state.name,
      type: this.state.type,
      parent: this.state.parent,
      documentation: this.state.documentation,
      custom: JSON.parse(this.state.custom)
    };

    // Check variables are defined
    if (this.state.target) {
      data.target = this.state.target;
    }

    if (this.state.source) {
      data.source = this.state.source;
    }

    if (this.state.parentUpdate !== this.state.parent) {
      parentUpdated = true;
    }

    // Send a patch request to update element data
    $.ajax({
      method: 'PATCH',
      url: url,
      data: JSON.stringify(data),
      contentType: 'application/json',
      statusCode: {
        200: () => {
          if (parentUpdated) {
            this.props.closeSidePanel(null, true, true);
          }
          else {
            this.props.closeSidePanel(null, true);
          }
        },
        401: (err) => {
          this.setState({ error: err.responseJSON.description });

          // Refresh when session expires
          window.location.reload();
        },
        404: (err) => {
          this.setState({ error: err.responseJSON.description });
        },
        403: (err) => {
          this.setState({ error: err.responseJSON.description });
        }
      }
    });
  }

  render() {
    // // Initialize variables
    let parentInvalid;
    let targetInvalid;
    let sourceInvalid;
    let customInvalid;

    // Verify id
    if (!RegExp(validators.id).test(this.state.target)) {
      parentInvalid = true;
    }
    // Verify id
    if (!RegExp(validators.id).test(this.state.target)) {
      targetInvalid = true;
    }
    // Verify id
    if (!RegExp(validators.id).test(this.state.source)) {
      sourceInvalid = true;
    }

    // Verify if custom data is correct JSON format
    try {
      JSON.parse(this.state.custom);
    }
    catch (err) {
      customInvalid = true;
    }

    // Render organization edit page
    return (
      <div className='element-panel-display'>
        <div className='element-data'>
          <div className='element-header'>
            <h2>
              Element Edit
            </h2>
            <div className='side-icons'>
              <UncontrolledTooltip placement='left' target='saveBtn'>
                Save
              </UncontrolledTooltip>
              <i id='saveBtn' className='fas fa-save edit-btn' onClick={this.onSubmit}/>
              <UncontrolledTooltip placement='left' target='cancelBtn'>
                Exit
              </UncontrolledTooltip>
              <i id='cancelBtn' className='fas fa-times exit-btn' onClick={() => { this.props.closeSidePanel(); }}/>
            </div>
          </div>
          {(!this.state.error)
            ? ''
            : (<UncontrolledAlert color="danger">
                {this.state.error}
              </UncontrolledAlert>)
          }
          {/* Create form to update element data */}
          <Form className='element-edit-form'>
            {/* Form section for Element name */}
            <FormGroup row>
              <Label for='name' sm={2}><b>Name</b></Label>
              <Col sm={10}>
                <Input type='text'
                       name='name'
                       id='name'
                       placeholder='Name'
                       value={this.state.name || ''}
                       onChange={this.handleChange}/>
              </Col>
            </FormGroup>
            {(!this.state.parent)
              ? ''
              // Form section for Element parent
              : (<FormGroup row>
                <Label for='parent' sm={2}><b>Parent</b></Label>
                  <Col sm={10}>
                    <Input type='text'
                           name='parent'
                           id='parent'
                           placeholder='Parent ID'
                           invalid={parentInvalid}
                           value={this.state.parent || ''}
                           onChange={this.handleChange}/>
                  </Col>
                  {/* Verify fields are valid, or display feedback */}
                <FormFeedback>
                  Invalid: An Element parent may only contain letters, numbers, space, or dashes.
                </FormFeedback>
                 </FormGroup>)
            }
            {/* Form section for Element type */}
            <FormGroup row>
              <Label for='type' sm={2}><b>Type</b></Label>
              <Col sm={10}>
                <Input type='text'
                       name='type'
                       id='type'
                       placeholder='Type'
                       value={this.state.type || ''}
                       onChange={this.handleChange}/>
              </Col>
            </FormGroup>
            {/* Form section for Element source */}
            <FormGroup row>
              <Label for='name' sm={2}><b>Source</b></Label>
              <Col sm={10}>
                <Input type='text'
                       name='source'
                       id='source'
                       placeholder='Source ID'
                       invalid={sourceInvalid}
                       value={this.state.source || ''}
                       onChange={this.handleChange}/>
              </Col>
              {/* Verify fields are valid, or display feedback */}
              <FormFeedback>
                Invalid:
                An Element source may only contain letters, numbers, space, or dashes.
              </FormFeedback>
            </FormGroup>
            {/* Form section for Element target */}
            <FormGroup row>
              <Label for='name' sm={2}><b>Target</b></Label>
              <Col sm={10}>
                <Input type='text'
                       name='target'
                       id='target'
                       placeholder='Target ID'
                       invalid={targetInvalid}
                       value={this.state.target || ''}
                       onChange={this.handleChange}/>
              </Col>
              {/* Verify fields are valid, or display feedback */}
              <FormFeedback>
                Invalid:
                An Element target may only contain letters, numbers, space, or dashes.
              </FormFeedback>
            </FormGroup>
            {/* Form section for custom data */}
            <FormGroup>
              <Label for='documentation'><b>Documentation</b></Label>
              <Input type='textarea'
                     name='documentation'
                     id='documentation'
                     placeholder='Documentation'
                     value={this.state.documentation || ''}
                     onChange={this.handleChange}/>
            </FormGroup>
            {/* Form section for custom data */}
            <FormGroup>
              <Label for='custom'><b>Custom Data</b></Label>
              <pre>
                <Input type='textarea'
                       name='custom'
                       id='custom'
                       placeholder='{}'
                       value={this.state.custom || ''}
                       invalid={customInvalid}
                       onChange={this.handleChange}/>
              </pre>
            </FormGroup>
          </Form>
        </div>
      </div>
    );
  }

}

// Export component
export default ElementEdit;
