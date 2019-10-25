/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.element-edit
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 * @author Josh Kaplan
 * @author James Eckstein
 *
 * @description This renders the element edit form.
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
  Col,
  UncontrolledAlert,
  Tooltip
} from 'reactstrap';

// MBEE modules
import ElementSelector from './element-selector.jsx';

/* eslint-enable no-unused-vars */

class ElementEdit extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Set mounted variable
    this.mounted = false;

    // Initialize state props
    this.state = {
      id: this.props.id,
      name: '',
      type: '',
      parent: null,
      source: null,
      sourceNamespace: null,
      target: null,
      targetNamespace: null,
      documentation: '',
      archived: false,
      custom: {},
      org: null,
      project: null,
      parentUpdate: null,
      isSaveTooltipOpen: false,
      isExitTooltipOpen: false,
      error: null
    };

    // Bind component function
    this.getElement = this.getElement.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.parentSelectHandler = this.parentSelectHandler.bind(this);
    this.handleSaveTooltipToggle = this.handleSaveTooltipToggle.bind(this);
    this.handleExitTooltipToggle = this.handleExitTooltipToggle.bind(this);
    this.sourceSelectHandler = this.sourceSelectHandler.bind(this);
    this.targetSelectHandler = this.targetSelectHandler.bind(this);
  }

  getElement() {
    // Initialize variables
    const elementId = this.state.id;
    const url = `${this.props.url}/elements/${elementId}?minified=true&includeArchived=true`;

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
            project: element.project,
            archived: element.archived
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
          if (element.targetNamespace) {
            this.setState({ targetNamespace: element.targetNamespace });
          }
          if (element.sourceNamespace) {
            this.setState({ sourceNamespace: element.sourceNamespace });
          }

          $('textarea[name="custom"]').autoResize();
          // Resize custom data field
          $('textarea[name="documentation"]').autoResize();
        },
        401: (err) => {
          // Throw error and set state
          this.setState({ error: err.responseText });

          // Refresh when session expires
          window.location.reload();
        },
        404: (err) => {
          this.setState({ error: err.responseText });
        }
      }
    });
  }

  componentDidMount() {
    // Set the mounted variable
    this.mounted = true;

    // Get element information
    this.getElement();
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
    // Verify error is set to null
    if (this.state.error) {
      this.setState({ error: null });
    }

    // Initialize variables
    let doRefresh;
    const elementId = this.state.id;
    const url = `${this.props.url}/elements/${elementId}?minified=true`;
    const data = {
      name: this.state.name,
      type: this.state.type,
      parent: this.state.parent,
      archived: this.state.archived,
      documentation: this.state.documentation,
      custom: JSON.parse(this.state.custom)
    };

    if (this.state.parentUpdate !== this.state.parent) {
      doRefresh = true;
    }

    // Verify that there is a source and target
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

    // Send a patch request to update element data
    $.ajax({
      method: 'PATCH',
      url: url,
      data: JSON.stringify(data),
      contentType: 'application/json',
      statusCode: {
        200: () => {
          // Verify parent has been updated
          if (doRefresh) {
            // Send the parents IDs to be refreshed in element tree
            const refreshIds = [this.state.parentUpdate, this.state.parent];
            this.props.closeSidePanel(null, refreshIds);
          }
          else {
            this.props.closeSidePanel(null, [elementId]);
          }
        },
        401: (err) => {
          this.setState({ error: err.responseText });

          // Refresh when session expires
          window.location.reload();
        },
        404: (err) => {
          this.setState({ error: err.responseText });
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

  // Toggles the tooltip
  handleSaveTooltipToggle() {
    const isTooltipOpen = this.state.isSaveTooltipOpen;

    // Verify component is not unmounted
    if (!this.mounted) {
      return;
    }

    return this.setState({ isSaveTooltipOpen: !isTooltipOpen });
  }

  // Toggles the tooltip
  handleExitTooltipToggle() {
    const isTooltipOpen = this.state.isExitTooltipOpen;

    // Verify component is not unmounted
    if (!this.mounted) {
      return;
    }

    return this.setState({ isExitTooltipOpen: !isTooltipOpen });
  }

  componentWillUnmount() {
    // Set mounted variable
    this.mounted = false;
  }

  /**
   * @description This function is called when the ElementSelector for the source field
   * changes.
   *
   * @param {string} _id - The selected _id.
   * @param {object} project - The current project.
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
    else {
      // Set the sourceNamespace field to null
      this.setState({ sourceNamespace: null });
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
    else {
      // Set the targetNamespace field  to null
      this.setState({ targetNamespace: null });
    }

    this.setState({ target: _id });
  }

  /**
   * @description Renders the component.
   *
   * @returns {object} Page content.
   */
  render() {
    // // Initialize variables
    let customInvalid;

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
              <Tooltip
                placement='left'
                isOpen={this.state.isSaveTooltipOpen}
                target='saveBtn'
                toggle={this.handleSaveTooltipToggle}>
                Save
              </Tooltip>
              <i id='saveBtn' className='fas fa-save edit-btn' onClick={this.onSubmit}/>
              <Tooltip
                placement='left'
                isOpen={this.state.isExitTooltipOpen}
                target='cancelBtn'
                toggle={this.handleExitTooltipToggle}>
                Exit
              </Tooltip>
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
                  <Col sm={10} className={'selector-value'}>
                    {this.state.parent || ''}
                    <ElementSelector
                      parent={true}
                      self={this.state.id}
                      url={this.props.url}
                      currentSelection={this.state.parent}
                      project={this.props.project}
                      branch={this.props.branch}
                      selectedHandler={this.parentSelectHandler} />
                  </Col>
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
              <Col sm={10} className={'selector-value'}>
                {this.state.source || 'null'}
                <ElementSelector
                  currentSelection={this.state.source}
                  self={this.state.id}
                  url={this.props.url}
                  differentProject={this.state.sourceNamespace}
                  project={this.props.project}
                  branch={this.props.branch}
                  selectedHandler={this.sourceSelectHandler} />
              </Col>
              {(this.state.target && !this.state.source)
                ? (<div className='warning-label'>*The source needs to be set with the target.</div>)
                : ''
              }
            </FormGroup>
            {/* Form section for Element target */}
            <FormGroup row>
              <Label for='name' sm={2}><b>Target</b></Label>
              <Col sm={10} className={'selector-value'}>
                {this.state.target || 'null'}
                <ElementSelector
                  currentSelection={this.state.target}
                  self={this.state.id}
                  url={this.props.url}
                  branch={this.props.branch}
                  differentProject={this.state.targetNamespace}
                  project={this.props.project}
                  selectedHandler={this.targetSelectHandler} />
              </Col>
              {(!this.state.target && this.state.source)
                ? (<div className='warning-label'>*The target needs to be set with the source.</div>)
                : ''
              }
            </FormGroup>
            {/* Form section for archiving */}
            <FormGroup className='bottom-spacing' row>
              <Label for='archived' sm={2}>
                <b>Archive</b>
              </Label>
              <Col sm={10}>
                <Label check sm={2}>
                  <Input type='checkbox'
                         name='archived'
                         id='archived'
                         checked={this.state.archived}
                         value={this.state.archived || false}
                         onChange={this.handleChange} />
                </Label>
              </Col>
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
