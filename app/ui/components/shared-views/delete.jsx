/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.shared-views.delete
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the delete page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState } from 'react';
import { Form, FormGroup, Label, Input, Button, UncontrolledAlert } from 'reactstrap';

// MBEE modules
import { useApiClient } from '../context/ApiClientProvider';

/* eslint-enable no-unused-vars */

function Delete(props) {
  const { orgService, projectService, branchService, elementService } = useApiClient();
  const [org, setOrg] = useState(null);
  const [id, setID] = useState(null);
  const [projectOpt, setProjectOpt] = useState(null);
  const [error, setError] = useState(null);

  const handleOrgChange = async (e) => {
    setOrg(e.target.value);

    if (props.projects) {
      // Request project data
      const options = {
        fields: 'id,name'
      };
      const [err, projects] = await projectService.get(e.target.value, options);

      // Set state
      if (err) {
        setError(err);
        setProjectOpt([]);
      }
      else if (projects) {
        // Loop through project-views and create proj options
        const projectOptions = projects.map(
          (project) => (<option value={project.id}>{project.name}</option>)
        );

        // Set the new project options
        setProjectOpt(projectOptions);
      }
    }
  };

  const handleChange = (e) => {
    setID(e.target.value);
  };

  // Define the on submit function
  const onSubmit = async () => {
    // Initialize variables
    let deleteRequest;

    // Verify if project-views provided
    if (props.element) {
      deleteRequest = () => elementService.delete(props.element.org,
        props.element.project, props.element.branch, [props.element.id]);
    }
    else if (props.branch) {
      deleteRequest = () => branchService.delete(props.branch.org,
        props.branch.project, [props.branch.id]);
    }
    else if (props.projects) {
      deleteRequest = () => projectService.delete(org, [id]);
    }
    else if (props.project) {
      deleteRequest = () => projectService.delete(props.project.org, [props.project.id]);
    }
    else if (props.orgs) {
      deleteRequest = () => orgService.delete([org]);
    }
    else {
      deleteRequest = () => orgService.delete([props.org.id]);
    }

    // Make the request
    const [err, result] = await deleteRequest();

    if (err) {
      setError(err);
    }
    else if (result) {
      if (props.element) {
        props.closeSidePanel(null, [props.element.parent]);
        props.toggle();
      }
      else {
        // On success, return to the project-views page
        props.refresh();
        props.toggle();
      }
    }
  };


  // Initialize variables
  let title;
  let orgOptions;
  let name;

  if (props.project || props.projects) {
    title = 'Project';
  }
  else if (props.element) {
    title = 'Element';
  }
  else if (props.branch) {
    title = 'Branch';
  }
  else {
    title = 'Organization';
  }

  // Verify if orgs provided
  if (props.orgs) {
    // Loop through orgs
    orgOptions = props.orgs.map((o) => (<option key={`key-${o.id}`} value={o.id}>{o.name}</option>));
  }

  if (props.org) {
    name = props.org.name;
  }
  else if (props.project) {
    name = props.project.name;
  }
  else if (props.element) {
    name = (<span className='element-name'>
              {props.element.name} {' '}
        <span className={'element-id'}>({props.element.id})</span>
            </span>
    );
  }
  else if (props.branch) {
    name = props.branch.name ? props.branch.name : props.branch.id;
  }

  // Return the project delete form
  return (
    <div id='workspace'>
      <div className='workspace-header'>
        <h2 className='workspace-title workspace-title-padding'>
          Delete {title}
        </h2>
      </div>
      <div className='extra-padding'>
        {(!error)
          ? ''
          : (<UncontrolledAlert color="danger">
            {error}
          </UncontrolledAlert>)
        }
        <Form>
          {
            (!props.orgs)
              ? ''
              : (
                <FormGroup>
                  <Label for="org">Organization ID</Label>
                  <Input type="select"
                         name="org"
                         id="org"
                         value={org || ''}
                         onChange={handleOrgChange}>
                    <option>Choose one...</option>
                    {orgOptions}
                  </Input>
                </FormGroup>
              )
          }
          {/* Verify if project-views provided */}
          { // Create a form to choose the project
            (!props.projects)
              ? ''
              : (
                <FormGroup>
                  <Label for="id">Project ID</Label>
                  <Input type="select"
                         name="id"
                         id="id"
                         value={id || ''}
                         onChange={handleChange}>
                    <option>Choose one...</option>
                    {projectOpt}
                  </Input>
              </FormGroup>)
          }
          {/* Verify if project provided */}
          {(props.org || props.project || props.branch || props.element)
            ? (<FormGroup>
                <Label for="id">Do you want to delete {name}?</Label>
               </FormGroup>)
            // Display confirmation
            : ''
          }
          {/* Button to submit and delete project */}
          <Button color='danger' onClick={onSubmit}> Delete </Button>{' '}
          <Button outline onClick={props.toggle}> Cancel </Button>
        </Form>
      </div>
    </div>
  );
}

export default Delete;
