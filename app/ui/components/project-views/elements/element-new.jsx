/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.element-new
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Josh Kaplan
 *
 * @description This renders create element form.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect, useRef } from 'react';
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
import { useApiClient } from '../../context/ApiClientProvider';
const uuidv4 = require('uuid/v4');

/* eslint-enable no-unused-vars */

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

function ElementNew(props) {
  const { elementService } = useApiClient();
  const [values, setValues] = useState({
    id: uuidv4(),
    name: '',
    type: ''
  });
  const [parent, setParent] = useState(props.parent || 'model');
  const [target, setTarget] = useState(null);
  const [targetNamespace, setTargetNamespace] = useState(null);
  const [source, setSource] = useState(null);
  const [sourceNamespace, setSourceNamespace] = useState(null);
  const [error, setError] = useState(null);

  const prevParent = usePrevious(props.parent);

  // Reset when a new parent is passed in through props
  useEffect(() => {
    if (props.parent !== prevParent) {
      setParent(props.parent);
    }
  }, [props.parent]);

  const handleChange = (e) => {
    setValues((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value
    }));
    e.persist();
  };

  const onSubmit = async () => {
    if (error) setError(null);

    // Initialize variables
    const data = {
      id: values.id,
      name: values.name,
      type: values.type,
      parent: parent
    };

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

    const orgID = props.orgID;
    const projID = props.projectID;
    const branchID = props.branchID;

    const [err, result] = await elementService.post(orgID, projID, branchID, data);

    if (err) setError(err);
    else if (result) props.closeSidePanel(null, [parent]);
  };

  /**
   * @description This function is called when the ElementSelector for the parent field
   * changes.
   *
   * @param {string} _id - The selected _id.
   */
  const parentSelectHandler = (_id) => {
    setParent(_id);
  };

  /**
   * @description This function is called when the ElementSelector for the source field
   * changes.
   *
   * @param {string} _id - The selected _id.
   * @param {string} _project - The current project.
   */
  const sourceSelectHandler = (_id, _project) => {
    // Verify if project was provided
    if (_project) {
      // Set the sourceNamespace field
      setSourceNamespace({
        org: _project.org,
        project: _project.id,
        branch: 'master'
      });
    }
    setSource(_id);
  };

  /**
   * @description This function is called when the ElementSelector for the target field
   * changes.
   *
   * @param {string} _id - The selected _id.
   * @param {object} _project - The current project.
   */
  const targetSelectHandler = (_id, _project) => {
    // Verify if project was provided
    if (_project) {
      // Set the targetNamespace field
      setTargetNamespace({
        org: _project.org,
        project: _project.id,
        branch: 'master'
      });
    }
    setTarget(_id);
  };


  let idInvalid;
  let disableSubmit;

  // Verify element id is valid
  const validatorsElementId = `^${validators.element.id.split(validators.ID_DELIMITER).pop()}`;
  const validLen = validators.element.idLength - validators.branch.idLength - 1;
  if (!RegExp(validatorsElementId).test(values.id) || validLen < values.id.length) {
    // Set invalid fields
    idInvalid = true;
    disableSubmit = true;
  }

  // Verify parent was selected
  if (parent === null) {
    // Disable submit
    disableSubmit = true;
  }

  // Verify target and source are set
  if ((!target && source)
    || (!source && target)) {
    disableSubmit = true;
  }

  // Render organization edit page
  return (
    <div className='element-create'>
      <h2>New Element</h2>
      {(!error)
        ? ''
        : (<UncontrolledAlert color="danger">
            {error}
           </UncontrolledAlert>)
      }
      <Form>
        <FormGroup row>
          <Label for="id" sm={2}>ID</Label>
          <Col sm={10}>
            <Input type="text"
                 name="id"
                 id="id"
                 placeholder="Element ID"
                 value={values.id}
                 invalid={idInvalid}
                 onChange={handleChange}/>
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
                   value={values.name || ''}
                   onChange={handleChange}/>
          </Col>
        </FormGroup>
        <FormGroup row>
          <Label for="type" sm={2}>Type</Label>
          <Col sm={10}>
            <Input type="text"
                   name="type"
                   id="type"
                   placeholder="Element type"
                   value={values.type || ''}
                   onChange={handleChange}/>
          </Col>
        </FormGroup>
        <FormGroup row>
          <Label for="parent" sm={2}>Parent*</Label>
          <Col sm={10}>
            <div id="parent" className={'selector-value'}>
              {parent || 'Select an element.'}
              <ElementSelector
                parent={true}
                currentSelection={parent}
                branchID={props.branchID}
                project={props.project}
                selectedHandler={parentSelectHandler} />
            </div>
          </Col>
          {(!parent) && (<div className='warning-label'>*Parent cannot be null.</div>)}
        </FormGroup>
        <FormGroup row>
          <Label for='name' sm={2}>Source</Label>
          <Col sm={10} className={'selector-value'}>
            {source || 'null'}
            <ElementSelector
              currentSelection={source}
              self={values.id}
              branchID={props.branchID}
              project={props.project}
              selectedHandler={sourceSelectHandler} />
          </Col>
          {(target && !source)
            ? (<div className='warning-label'>*The source needs to be set with the target.</div>)
            : ''
          }
        </FormGroup>
        {/* Form section for Element target */}
        <FormGroup row>
          <Label for='name' sm={2}>Target</Label>
          <Col sm={10} className={'selector-value'}>
            {target || 'null'}
            <ElementSelector
              currentSelection={target}
              self={values.id}
              branchID={props.branchID}
              project={props.project}
              selectedHandler={targetSelectHandler} />
          </Col>
          {(!target && source)
            ? (<div className='warning-label'>*The target needs to be set with the source.</div>)
            : ''
          }
        </FormGroup>
        <div className='required-fields'>* required fields.</div>
        <Button className='btn btn'
                outline color="primary"
                disabled={disableSubmit || !parent}
                onClick={onSubmit}>
          Submit
        </Button>
        <Button className='btn btn'
                outline color="secondary"
                onClick={props.closeSidePanel}>
          Cancel
        </Button>
      </Form>
    </div>
  );
}

// Export component
export default ElementNew;
