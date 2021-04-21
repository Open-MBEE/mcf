/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.element-selector
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Josh Kaplan
 * @author Leah De Laurell
 *
 * @description Renders an element selector that has two parts: the selected
 * element and the modal to select an element.
 */
/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  InputGroup,
  Input
} from 'reactstrap';

// MBEE modules
import ElementTree from './element-tree.jsx';
import { useApiClient } from '../../context/ApiClientProvider';

/* eslint-enable no-unused-vars */

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

function ElementSelector(props) {
  const { orgService } = useApiClient();
  const [modal, setModal] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectID, setProjectID] = useState(props.project.id);
  // eslint-disable-next-line no-unused-vars
  const [selectedElement, setSelectedElement] = useState('');
  const [selectedElementPreview, setSelectedElementPreview] = useState(props.currentSelection || '');
  const [selectDisabled, setSelectDisabled] = useState(false);
  const [error, setError] = useState(null);

  const prevSelection = usePrevious(props.currentSelection);
  const prevDifferentProject = usePrevious(props.differentProject);

  /**
   * @description Toggle the state of the modal.
   */
  const toggle = () => {
    setModal((prevState) => !prevState);
  };

  /**
   * @description Changes the project.
   *
   * @param {object} e - The event trigger.
   */
  const handleChange = (e) => {
    setProjectID(e.target.value);
  };

  /**
   * @description This is the click handler used to select an element.
   *
   * @param {string} id - The id of the selected element.
   */
  const selectElementHandler = (id) => {
    // Verify id is not self
    if (id === props.self && projectID === props.project.id) {
      // Display error
      setSelectedElementPreview(null);
      setSelectDisabled(true);
      setError('Element cannot select self.');
      return;
    }
    // Otherwise, reset error to null and set selected state
    setSelectedElementPreview(id);
    setSelectDisabled(false);
    setError(null);
  };

  /**
   * @description Confirms and finalizes the element selection. Then closes the modal.
   */
  const select = () => {
    setSelectedElement(selectedElementPreview);
    toggle();

    // Using preview here because it appears setState is async.
    // When using this.state.selectedElement here is is not yet set when it
    // is passed into the selectedHandler
    // Verify if the element is being referenced in a different project
    if (projectID !== props.project.id) {
      // Grab the project that it is referencing and pass it back to parent
      // to update namespace field.
      projects.forEach((p) => {
        if (p.id === projectID) {
          props.selectedHandler(selectedElementPreview, p);
        }
      });
    }
    else {
      props.selectedHandler(selectedElementPreview);
    }
  };

  /**
   * @description Resets the selectedElementPreview state.
   */
  const clear = () => {
    setSelectedElementPreview(null);
  };

  // Reset if selection is changed
  useEffect(() => {
    // Verify if currentSelection prop updated
    if (prevSelection !== props.currentSelection) {
      // Update selectedElementPreview state
      setSelectedElementPreview(props.currentSelection);
    }

    if ((prevDifferentProject !== props.differentProject)
      && (props.differentProject)) {
      setProjectID(props.differentProject.project);
    }
  }, [props.currentSelection, props.differentProject]);

  // on mount
  useEffect(() => {
    // Get projects from current org and default org
    const options = {
      ids: `${props.project.org},default`,
      populate: 'projects',
      fields: 'projects'
    };

    orgService.get(options)
    .then(([err, orgs]) => {
      if (err) {
        setError(err);
      }
      else if (orgs) {
        let projectList = [];
        orgs.forEach((org) => {
          projectList = projectList.concat(org.projects);
        });
        setProjects(projectList);
      }
    });
  }, []);


  // Initialize Variables
  let errorMsg = '';
  const defaultOrgOpts = [];
  const currentOrgOpts = [];
  let projObj = props.project;

  // Verify error
  if (error) {
    // Display error
    errorMsg = <span className={'text-danger'}>{error}</span>;
  }

  // Verify there are projects
  if (projects.length > 0) {
    // Loop through all projects
    projects.forEach((p) => {
      // Verify project has internal visibility or is the current project
      if (p.visibility === 'internal' || (p.id === props.project.id)) {
        // Verify if project is current project
        if (p.id === projectID) {
          // Set new project object
          projObj = p;
        }

        // Create an option element
        const projOpt = (<option value={p.id} key={`proj-${p.id}`}> {p.name} </option>);
        // If org is default
        if (p.org === 'default') {
          // Push to default org array
          defaultOrgOpts.push(projOpt);
        }
        else {
          // Else, push to current org array
          currentOrgOpts.push(projOpt);
        }
      }
    });
  }

  return (
    <div className='element-selector'>
      <i className='fas fa-caret-square-down' onClick={toggle}/>
      <Modal size="lg"
             isOpen={modal}
             toggle={toggle}
             className='element-selector-modal element-tree-container'>
        <ModalHeader toggle={toggle}>Select an element</ModalHeader>
        <ModalBody>
          {/* Verify if element selector is for the parent */}
          {(props.parent)
            ? ''
            : (<div className='element-selector-project'>
                <InputGroup size='sm'>
                  <span className='project-label'>Projects:</span>
                  <Input type='select'
                         name='project'
                         id='project'
                         className='project-input'
                         value={projectID}
                         onChange={handleChange}>
                    <option key='opt-default-org'
                            disabled={true}>Default Org</option>
                    {defaultOrgOpts}
                    <option key='opt-current-org'
                            disabled={true}>Current Org</option>
                    {currentOrgOpts}
                  </Input>
                </InputGroup>
              </div>)
          }
          <ElementTree project={projObj}
                       displayIds={true}
                       linkElements={false}
                       branchID={props.branchID}
                       clickHandler={selectElementHandler}/>
        </ModalBody>
        <ModalFooter style={{ overflow: 'hidden' }}>
          <p style={{ overflow: 'scroll' }}>
            Selected: {selectedElementPreview}
            {(selectedElementPreview)
              ? <i className='fas fa-times-circle clear-btn' onClick={clear}/>
              : 'null'
            }
          </p>
            {errorMsg}
          <Button color="primary"
                  disabled={selectDisabled}
                  onClick={select}>Select</Button>
          <Button color="secondary" onClick={toggle}>Cancel</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

// Export component
export default ElementSelector;
