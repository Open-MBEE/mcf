/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.element-new
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Josh Kaplan
 *
 * @description This renders create element form.
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
  Button,
  Col,
  FormFeedback,
  UncontrolledAlert
} from 'reactstrap';

// MBEE modules
import validators from '../../../../../build/json/validators';
import ElementSelector from './element-selector.jsx';

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
      parent: this.props.parent || 'model',
      target: null,
      targetNamespace: null,
      source: null,
      sourceNamespace: null,
      custom: null,
      org: null,
      project: null,
      error: null
    };

    // Bind component function
    this.handleChange = this.handleChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.parentSelectHandler = this.parentSelectHandler.bind(this);
    this.sourceSelectHandler = this.sourceSelectHandler.bind(this);
    this.targetSelectHandler = this.targetSelectHandler.bind(this);
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
    if (this.state.error) {
      this.setState({ error: null });
    }

    // Initialize variables
    const data = {
      id: this.state.id,
      name: this.state.name,
      type: this.state.type,
      parent: this.state.parent
    };

    if (this.state.source !== null && this.state.target !== null) {
      data.source = this.state.source;
      data.target = this.state.target;
    }

    // Verify if there is a targetNamespace and target
    if (this.state.targetNamespace && this.state.target) {
      data.targetNamespace = this.state.targetNamespace;
    }
    // Verify if there is a sourceNamespace and source
    if (this.state.sourceNamespace && this.state.source) {
      data.sourceNamespace = this.state.sourceNamespace;
    }

    const url = `${this.props.url}/elements/${data.id}`;

    $.ajax({
      method: 'POST',
      url: `${url}?minified=true`,
      contentType: 'application/json',
      data: JSON.stringify(data),
      statusCode: {
        200: () => {
          this.props.closeSidePanel(null, [this.state.parent]);
        },
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

  /**
   * @description This function is called when the ElementSelector for the parent field
   * changes.
   *
   * @param {string} _id - The selected _id.
   */
  parentSelectHandler(_id) {
    this.setState({ parent: _id });
  }

  /**
   * @description This function is called when the ElementSelector for the source field
   * changes.
   *
   * @param {string} _id - The selected _id.
   * @param {string} project - The current project.
   */
  sourceSelectHandler(_id, project) {
    // Verify if project was provided
    if (project) {
      // Set the sourceNamespace field
      this.setState({
        sourceNamespace: {
          org: project.org,
          project: project.id,
          branch: 'master'
        }
      });
    }

    this.setState({ source: _id });
  }

  /**
   * @description This function is called when the ElementSelector for the target field
   * changes.
   *
   * @param {string} _id - The selected _id.
   * @param {object} project - The current project.
   */
  targetSelectHandler(_id, project) {
    // Verify if project was provided
    if (project) {
      // Set the targetNamespace field
      this.setState({
        targetNamespace: {
          org: project.org,
          project: project.id,
          branch: 'master'
        }
      });
    }

    this.setState({ target: _id });
  }

  render() {
    let idInvalid;
    let disableSubmit;

    // Verify element id is valid
    const validatorsElementId = validators.element.id.split(validators.ID_DELIMITER).pop();
    const validLen = validators.element.idLength - validators.branch.idLength - 1;
    if (!RegExp(validatorsElementId).test(this.state.id) || validLen < this.state.id.length) {
      // Set invalid fields
      idInvalid = true;
      disableSubmit = true;
    }

    // Verify parent was selected
    if (this.state.parent === null) {
      // Disable submit
      disableSubmit = true;
    }

    // Verify target and source are set
    if ((!this.state.target && this.state.source)
      || (!this.state.source && this.state.target)) {
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
                Invalid: An id may only contain letters, numbers, or dashes.
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
            <Label for="parent" sm={2}>Parent*</Label>
            <Col sm={10}>
              <div id="parent" className={'selector-value'}>
                {this.state.parent || 'Select an element.'}
                <ElementSelector
                  parent={true}
                  currentSelection={this.state.parent}
                  url={this.props.url}
                  branch={this.props.branch}
                  project={this.props.project}
                  selectedHandler={this.parentSelectHandler} />
              </div>
            </Col>
            {(!this.state.parent) && (<div className='warning-label'>*Parent cannot be null.</div>)}
          </FormGroup>
          <FormGroup row>
            <Label for='name' sm={2}>Source</Label>
            <Col sm={10} className={'selector-value'}>
              {this.state.source || 'null'}
              <ElementSelector
                currentSelection={this.state.source}
                self={this.state.id}
                url={this.props.url}
                branch={this.props.branch}
                project={this.props.project}
                selectedHandler={this.sourceSelectHandler} />
            </Col>
            {(this.state.target && !this.state.source)
              ? (<div className='warning-label'>*The source needs to be set with the target.</div>)
              : ''
            }
          </FormGroup>
          {/* Form section for Element target */}
          <FormGroup row>
            <Label for='name' sm={2}>Target</Label>
            <Col sm={10} className={'selector-value'}>
              {this.state.target || 'null'}
              <ElementSelector
                currentSelection={this.state.target}
                self={this.state.id}
                branch={this.props.branch}
                url={this.props.url}
                project={this.props.project}
                selectedHandler={this.targetSelectHandler} />
            </Col>
            {(!this.state.target && this.state.source)
              ? (<div className='warning-label'>*The target needs to be set with the source.</div>)
              : ''
            }
          </FormGroup>
          <div className='required-fields'>* required fields.</div>
          <Button className='btn btn'
                  outline color="primary"
                  disabled={disableSubmit || !this.state.parent}
                  onClick={this.onSubmit}>
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
