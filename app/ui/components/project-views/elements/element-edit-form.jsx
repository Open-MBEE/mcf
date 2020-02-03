/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.element-edit-form
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Danny Chiu
 *
 * @author Danny Chiu
 *
 * @description This renders the element edit form.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  UncontrolledAlert,
  FormGroup,
  Row,
  Label,
  Input
} from 'reactstrap';

// MBEE modules
import ElementSelector from './element-selector.jsx';
import ElementTextbox from './element-textbox.jsx';
import ElementTextarea from './element-textarea.jsx';

/* eslint-enable no-unused-vars */

class ElementEditForm extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);
    this.state = {
      lastModifiedBy: '',
      updatedOn: '',
      name: '',
      type: '',
      parent: null,
      source: null,
      sourceNamespace: null,
      target: null,
      targetNamespace: null,
      documentation: '',
      archived: props.archived,
      custom: {},
      org: null,
      project: null,
      error: null,
      customInvalid: ''
    };

    this.textboxProps = [
      { label: 'Last Modified By', disabled: true },
      { label: 'Updated On', disabled: true },
      { label: 'Name', disabled: false },
      { label: 'Type', disabled: false }
    ];

    this.dropdownProps = [
      { label: 'Source', disabled: true },
      { label: 'Target', disabled: true },
      { label: 'Parent', disabled: true }
    ];

    this.textareaProps = [
      { label: 'Documentation' },
      { label: 'Custom Data' }
    ];

    this.handleChange = this.handleChange.bind(this);
    this.getElement = this.getElement.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.parentSelectHandler = this.parentSelectHandler.bind(this);
    this.sourceSelectHandler = this.sourceSelectHandler.bind(this);
    this.targetSelectHandler = this.targetSelectHandler.bind(this);
  }

  handleChange(event) {
    const { name, value } = event.target;
    if (name === 'archived') {
      // Change the archived state to opposite value
      this.setState(prevState => ({ archived: !prevState.archived }));
    }
    else if (name === 'customData') {
      this.setState({ custom: value });
      // Verify if custom data is correct JSON format
      try {
        if (value.length > 0) {
          JSON.parse(value);
        }
        this.setState({ customInvalid: '' });
      }
      catch (err) {
        this.setState({ customInvalid: 'Custom data must be valid JSON.' });
      }
    }
    else {
      // Change the state with new value
      this.setState({ [name]: value });
    }
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

  // eslint-disable-next-line class-methods-use-this
  renderColumnComponents(componentList, numColumn) {
    const style = { padding: 4, margin: 0, border: 6 };
    const componentRows = [];
    let dataRow = [];
    componentList.forEach((component, index) => {
      dataRow.push(component);
      if ((index + 1) % numColumn === 0) {
        componentRows.push(<FormGroup row style={style} key={`el-col-${index}`}>{dataRow}</FormGroup>);
        dataRow = [];
      }
    });
    if (dataRow.length > 0) {
      componentRows.push(<FormGroup row style={style} key={`el-col-${componentList.length}`}>{dataRow}</FormGroup>);
    }
    return componentRows;
  }

  renderTextboxes(numColumn) {
    // eslint-disable-next-line no-undef
    const stateNames = this.textboxProps.map(propObj => toCamel(propObj.label));
    const textboxes = this.textboxProps.map(
      (propObj, index) => (
        <ElementTextbox key={`el-text-${index}`}
                        name={stateNames[index]}
                        value={this.state[stateNames[index]]}
                        id={`${stateNames[index]}_Id`}
                        label={propObj.label}
                        placeholder={this.state[stateNames[index]]}
                        disabled={propObj.disabled}
                        onChange={this.handleChange}/>)
    );
    return this.renderColumnComponents(textboxes, numColumn);
  }

  renderSelector(numColumn) {
    // eslint-disable-next-line no-undef
    const stateNames = this.dropdownProps.map(propObj => toCamel(propObj.label));
    const { id, url, project, branch } = this.props;
    const dropdowns = this.dropdownProps.map(
      (propObj, index) => (
        <ElementTextbox key={`el-text-${index}`}
                        name={stateNames[index]}
                        value={this.state[stateNames[index]]}
                        id={`${stateNames[index]}_Id`}
                        label={propObj.label}
                        placeholder={this.state[stateNames[index]]}
                        disabled={propObj.disabled}
                        onChange={this.handleChange}>
          <ElementSelector currentSelection={this.state[stateNames[index]]}
                           self={id}
                           url={url}
                           project={project}
                           branch={branch}
                           selectedHandler={this[`${stateNames[index]}SelectHandler`]}
                           parent={stateNames[index] === 'parent'}
                           differentProject={(stateNames[index] === 'parent') ? null : this.state[`${stateNames[index]}Namespace`]}/>
        </ElementTextbox>
      )
    );
    return this.renderColumnComponents(dropdowns, numColumn);
  }

  renderTextareas(numColumn) {
    // eslint-disable-next-line no-undef
    const stateNames = this.textareaProps.map(propObj => toCamel(propObj.label));
    const textareas = [];
    this.textareaProps.forEach((propObj, index) => {
      const value = (stateNames[index] === 'customData') ? 'custom' : 'documentation';
      textareas.push(
        <ElementTextarea key={`el-textarea-${index}`}
                         name={stateNames[index]}
                         value={this.state[value]}
                         id={`${stateNames[index]}_Id`}
                         label={propObj.label}
                         placeholder={this.state[stateNames[index]]}
                         invalid={this.state.customInvalid}
                         onChange={this.handleChange}/>
      );
    });

    return this.renderColumnComponents(textareas, numColumn);
  }

  getElement() {
    // Initialize variables
    const url = `${this.props.url}/elements/${this.props.id}?minified=true&includeArchived=true`;
    // Get element data
    $.ajax({
      method: 'GET',
      url: url,
      statusCode: {
        200: (element) => {
          // eslint-disable-next-line max-len
          const { name, type, documentation, custom, org, project, archived, lastModifiedBy, updatedOn, parent, source,
            target, targetNamespace, sourceNamespace } = element;
          this.setState({
            element: element,
            name: name,
            type: type,
            documentation: documentation,
            custom: JSON.stringify(custom, null, 2),
            org: org,
            project: project,
            archived: archived,
            lastModifiedBy: lastModifiedBy,
            updatedOn: updatedOn
          });
          if (parent) {
            this.setState({ parent: parent });
          }
          if (source) {
            this.setState({ source: source });
          }
          if (target) {
            this.setState({ target: target });
          }
          if (targetNamespace) {
            this.setState({ targetNamespace: targetNamespace });
          }
          if (sourceNamespace) {
            this.setState({ sourceNamespace: sourceNamespace });
          }

          $('textarea[name="customData"]').autoResize();
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

  onSubmit() {
    // Verify error is set to null
    if (this.state.error) {
      this.setState({ error: null });
    }

    // Initialize variables
    // eslint-disable-next-line max-len
    const { name, type, parent, archived, documentation, custom, source, target, targetNamespace, sourceNamespace } = this.state;
    const url = `${this.props.url}/elements/${this.props.id}?minified=true`;
    const data = {
      name: name,
      type: type,
      parent: parent,
      archived: archived,
      documentation: documentation,
      custom: JSON.parse(custom)
    };

    // Verify that there is a source and target
    if (source !== null && target !== null) {
      data.source = source;
      data.target = target;
    }

    // Verify if there is a targetNamespace and target
    if (targetNamespace && target) {
      data.targetNamespace = targetNamespace;
    }
    // Verify if there is a sourceNamespace and source
    if (sourceNamespace && source) {
      data.sourceNamespace = sourceNamespace;
    }

    // Send a patch request to update element data
    $.ajax({
      method: 'PATCH',
      url: url,
      data: JSON.stringify(data),
      contentType: 'application/json',
      statusCode: {
        200: () => {
          window.location.reload();
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

  componentDidMount() {
    this.getElement();
  }

  render() {
    const { modal, toggle, id } = this.props;
    const { error, archived } = this.state;

    const textareas = this.renderTextareas(1);
    const documentation = textareas[0];
    const customData = textareas[1];

    return (
      <Modal isOpen={modal} toggle={toggle} size={'lg'}>
        <form>
          <ModalHeader>Element: {id}</ModalHeader>
          <ModalBody style={{ maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
            {(error) ? <UncontrolledAlert color='danger'>{error}</UncontrolledAlert> : ''}
            {this.renderTextboxes(2)}
            {documentation}
            <hr></hr>
            {this.renderSelector(2)}
            <hr></hr>
            {customData}
            <FormGroup check style={{ paddingLeft: 35 }}>
              <Label check for={'archived_Id'} style={{ fontSize: 13, margin: 0 }}>
                <Input type="checkbox"
                       name={'archived'}
                       id={'archived_Id'}
                       checked={archived}
                       value={archived}
                       onChange={this.handleChange}/>
                {'Archived'}
              </Label>
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button color="primary"
                    onClick={this.onSubmit}
                    disabled={this.state.customInvalid.length > 0}>
              Update
            </Button>{' '}
            <Button color="secondary" onClick={toggle}>Cancel</Button>
          </ModalFooter>
        </form>
      </Modal>

    );
  }

}

export default ElementEditForm;
