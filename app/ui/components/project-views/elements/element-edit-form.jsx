/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.element-edit-form
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Danny Chiu
 *
 * @author Danny Chiu
 *
 * @description This renders the element edit form.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect } from 'react';
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
import { useElementContext } from '../../context/ElementProvider.js';
import { useApiClient } from '../../context/ApiClientProvider';

/* eslint-enable no-unused-vars */

function ElementEditForm(props) {
  const { elementID, setProvidedElement } = useElementContext();
  const { elementService } = useApiClient();
  const [values, setValues] = useState({
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
    custom: {}
  });
  const [customInvalid, setCustomInvalid] = useState('');
  const [error, setError] = useState(null);

  const orgID = props.project.org;
  const projID = props.project.id;
  const branchID = props.branchID;

  const textboxProps = [
    { label: 'Last Modified By', disabled: true },
    { label: 'Updated On', disabled: true },
    { label: 'Name', disabled: false },
    { label: 'Type', disabled: false }
  ];

  const dropdownProps = [
    { label: 'Source', disabled: true },
    { label: 'Target', disabled: true },
    { label: 'Parent', disabled: true }
  ];

  const textareaProps = [
    { label: 'Documentation' },
    { label: 'Custom Data' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'archived') {
      // Change the archived state to opposite value
      setValues((prevState) => ({
        ...prevState,
        archived: !prevState.archived
      }));
    }
    else if (name === 'customData') {
      setValues((prevState) => ({
        ...prevState,
        custom: value
      }));
      // Verify if custom data is correct JSON format
      try {
        if (value.length > 0) {
          JSON.parse(value);
        }
        setCustomInvalid('');
      }
      catch (err) {
        setCustomInvalid('Custom data must be valid JSON.');
      }
    }
    else {
      // Change the state with new value
      setValues((prevState) => ({
        ...prevState,
        [name]: value
      }));
    }

    e.persist();
  };

  const getElement = async () => {
    // Get element data
    const options = {
      ids: elementID,
      includeArchived: true
    };
    const [err, elements] = await elementService.get(orgID, projID, branchID, options);

    if (err) {
      setError(err);
    }
    else if (elements) {
      const element = elements[0];
      // eslint-disable-next-line max-len
      const { name, type, documentation, custom, org, project, archived, lastModifiedBy, updatedOn, parent, source,
        target, targetNamespace, sourceNamespace } = element;
      const data = {
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
      };
      if (parent) {
        data.parent = parent;
      }
      if (source) {
        data.source = source;
      }
      if (target) {
        data.target = target;
      }
      if (targetNamespace) {
        data.targetNamespace = targetNamespace;
      }
      if (sourceNamespace) {
        data.sourceNamespace = sourceNamespace;
      }

      setValues(data);

      $('textarea[name="customData"]').autoResize();
      // Resize custom data field
      $('textarea[name="documentation"]').autoResize();
    }
  };

  const onSubmit = async () => {
    // Verify error is set to null
    if (error) setError(null);

    // Initialize variables
    // eslint-disable-next-line max-len
    const { name, type, parent, archived, documentation, custom, source, target, targetNamespace, sourceNamespace } = values;
    const data = {
      id: elementID,
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

    // send a request to update the element
    const [err, elements] = await elementService.patch(orgID, projID, branchID, data);

    if (err) {
      setError(err);
    }
    else if (elements) {
      // This will refresh the updated element in the element tree.
      if (props.refreshFunctions.hasOwnProperty(elementID)) props.refreshFunctions[elementID]();
      // This is used to refresh the element data in the Element.jsx component within the sidepanel.
      setProvidedElement(elements[0]);
      // Closes the edit modal.
      props.toggle();
    }
  };

  /**
   * @description This function is called when the ElementSelector for the parent field
   * changes.
   *
   * @param {string} _id - The selected _id.
   */
  const parentSelectHandler = (_id) => {
    setValues((prevState) => ({
      ...prevState,
      parent: _id
    }));
  };

  /**
   * @description This function is called when the ElementSelector for the source field
   * changes.
   *
   * @param {string} _id - The selected _id.
   * @param {object} project - The current project.
   */
  const sourceSelectHandler = (_id, project) => {
    // Verify if project was provided
    if (project) {
      // Set the sourceNamespace field
      setValues((prevState) => ({
        ...prevState,
        sourceNamespace: {
          org: project.org,
          project: project.id,
          branch: 'master'
        }
      }));
    }
    else {
      // Set the sourceNamespace field to null
      setValues((prevState) => ({
        ...prevState,
        sourceNamespace: null
      }));
    }
    setValues((prevState) => ({
      ...prevState,
      source: _id
    }));
  };

  /**
   * @description This function is called when the ElementSelector for the target field
   * changes.
   *
   * @param {string} _id - The selected _id.
   * @param {object} project - The current project.
   */
  const targetSelectHandler = (_id, project) => {
    // Verify if project was provided
    if (project) {
      // Set the targetNamespace field
      setValues((prevState) => ({
        ...prevState,
        targetNamespace: {
          org: project.org,
          project: project.id,
          branch: 'master'
        }
      }));
    }
    else {
      // Set the targetNamespace field  to null
      setValues((prevState) => ({
        ...prevState,
        targetNamespace: null
      }));
    }

    setValues((prevState) => ({
      ...prevState,
      target: _id
    }));
  };

  const handlers = {
    parentSelectHandler,
    sourceSelectHandler,
    targetSelectHandler
  };

  const renderColumnComponents = (componentList, numColumn) => {
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
  };

  const renderTextboxes = (numColumn) => {
    // eslint-disable-next-line no-undef
    const stateNames = textboxProps.map(propObj => toCamel(propObj.label));
    const textboxes = textboxProps.map(
      (propObj, index) => (
        <ElementTextbox key={`el-text-${index}`}
                        name={stateNames[index]}
                        value={values[stateNames[index]]}
                        id={`${stateNames[index]}_Id`}
                        label={propObj.label}
                        placeholder={values[stateNames[index]]}
                        disabled={propObj.disabled}
                        onChange={handleChange}/>)
    );
    return renderColumnComponents(textboxes, numColumn);
  };

  const renderSelector = (numColumn) => {
    // eslint-disable-next-line no-undef
    const stateNames = dropdownProps.map(propObj => toCamel(propObj.label));
    const { id, url, project } = props;
    const dropdowns = dropdownProps.map(
      (propObj, index) => (
        <ElementTextbox key={`el-text-${index}`}
                        name={stateNames[index]}
                        value={values[stateNames[index]]}
                        id={`${stateNames[index]}_Id`}
                        label={propObj.label}
                        placeholder={values[stateNames[index]]}
                        disabled={propObj.disabled}
                        onChange={handleChange}>
          <ElementSelector currentSelection={values[stateNames[index]]}
                           self={id}
                           url={url}
                           project={project}
                           branchID={branchID}
                           selectedHandler={handlers[`${stateNames[index]}SelectHandler`]}
                           parent={stateNames[index] === 'parent'}
                           differentProject={(stateNames[index] === 'parent') ? null : values[`${stateNames[index]}Namespace`]}/>
        </ElementTextbox>
      )
    );
    return renderColumnComponents(dropdowns, numColumn);
  };

  const renderTextareas = (numColumn) => {
    // eslint-disable-next-line no-undef
    const stateNames = textareaProps.map(propObj => toCamel(propObj.label));
    const textareas = [];
    textareaProps.forEach((propObj, index) => {
      const value = (stateNames[index] === 'customData') ? 'custom' : 'documentation';
      textareas.push(
        <ElementTextarea key={`el-textarea-${index}`}
                         name={stateNames[index]}
                         value={values[value]}
                         id={`${stateNames[index]}_Id`}
                         label={propObj.label}
                         placeholder={values[stateNames[index]]}
                         invalid={customInvalid}
                         onChange={handleChange}/>
      );
    });

    return renderColumnComponents(textareas, numColumn);
  };

  // on mount
  useEffect(() => {
    getElement();
  }, []);


  const { modal, toggle } = props;
  const { archived } = values;

  const textareas = renderTextareas(1);
  const documentation = textareas[0];
  const customData = textareas[1];

  return (
    <Modal isOpen={modal} toggle={toggle} size={'lg'}>
      <form>
        <ModalHeader>Element: {elementID}</ModalHeader>
        <ModalBody style={{ maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
          {(error) ? <UncontrolledAlert color='danger'>{error}</UncontrolledAlert> : ''}
          {renderTextboxes(2)}
          {documentation}
          <hr></hr>
          {renderSelector(2)}
          <hr></hr>
          {customData}
          <FormGroup check style={{ paddingLeft: 35 }}>
            <Label check for={'archived_Id'} style={{ fontSize: 13, margin: 0 }}>
              <Input type="checkbox"
                     name={'archived'}
                     id={'archived_Id'}
                     checked={archived}
                     value={archived}
                     onChange={handleChange}/>
              {'Archived'}
            </Label>
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="primary"
                  onClick={onSubmit}
                  disabled={customInvalid.length > 0}>
            Update
          </Button>{' '}
          <Button color="secondary" onClick={toggle}>Cancel</Button>
        </ModalFooter>
      </form>
    </Modal>

  );
}

export default ElementEditForm;
