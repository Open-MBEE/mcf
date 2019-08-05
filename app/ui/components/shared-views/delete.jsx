/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.shared-views.delete
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the delete page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';
import { Form, FormGroup, Label, Input, Button, UncontrolledAlert } from 'reactstrap';

/* eslint-enable no-unused-vars */

class Delete extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      org: null,
      id: null,
      projectOpt: null,
      error: null
    };

    // Bind component functions
    this.handleOrgChange = this.handleOrgChange.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  // Define handle org change function
  handleOrgChange(event) {
    // Set the state of the changed orgs in the form
    this.setState({ [event.target.name]: event.target.value });

    if (this.props.projects) {
      // Get all the project-views from that org
      $.ajax({
        method: 'GET',
        url: `/api/orgs/${event.target.value}/projects?fields=id,name&minified=true`,
        statusCode: {
          200: (projects) => {
            // Loop through project-views and create proj options
            const projectOptions = projects.map(
              (project) => (<option value={project.id}>{project.name}</option>)
            );

            // Set the new project options
            this.setState({ projectOpt: projectOptions });
          },
          401: (err) => {
            // Set the project options to empty if none found
            this.setState({ projectOpt: [] });
            // Throw error and set state
            this.setState({ error: err.responseText });

            // Refresh when session expires
            window.location.reload();
          },
          404: (err) => {
            // Set the project options to empty if none found
            this.setState({ projectOpt: [] });
            this.setState({ error: err.responseText });
          }
        }
      });
    }
  }

  // Define handle change function
  handleChange(event) {
    // Set the state of the changed states in the form
    this.setState({ [event.target.name]: event.target.value });
  }

  // Define the on submit function
  onSubmit() {
    // Initialize variables
    let url;

    // Verify if project-views provided
    if (this.props.element) {
      const orgid = this.props.element.org;
      const projid = this.props.element.project;
      const branchid = this.props.element.branch;
      const elemid = this.props.element.id;

      // Set url to state options
      url = `/api/orgs/${orgid}/projects/${projid}/branches/${branchid}/elements/${elemid}`;
    }
    else if (this.props.branch) {
      const orgid = this.props.branch.org;
      const projid = this.props.branch.project;
      const branchid = this.props.branch.id;

      // Set url to state options
      url = `/api/orgs/${orgid}/projects/${projid}/branches/${branchid}`;
    }
    else if (this.props.projects) {
      // Set url to state options
      url = `/api/orgs/${this.state.org}/projects/${this.state.id}`;
    }
    else if (this.props.project) {
      // Set url to project provided
      url = `/api/orgs/${this.props.project.org}/projects/${this.props.project.id}`;
    }
    else if (this.props.orgs) {
      // Use the set state
      url = `/api/orgs/${this.state.org}`;
    }
    else {
      // Use the org provided
      url = `/api/orgs/${this.props.org.id}`;
    }

    // Delete the project selected
    $.ajax({
      method: 'DELETE',
      url: `${url}?minified=true`,
      contentType: 'application/json',
      statusCode: {
        200: () => {
          if (this.props.element) {
            this.props.closeSidePanel(null, [this.props.element.parent]);
            this.props.toggle();
          }
          else {
            // On success, return to the project-views page
            window.location.reload();
          }
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

  render() {
    // Initialize variables
    let title;
    let orgOptions;
    let name;

    if (this.props.project || this.props.projects) {
      title = 'Project';
    }
    else if (this.props.element) {
      title = 'Element';
    }
    else if (this.props.branch) {
      title = 'Branch';
    }
    else {
      title = 'Organization';
    }

    // Verify if orgs provided
    if (this.props.orgs) {
      // Loop through orgs
      orgOptions = this.props.orgs.map((org) => (<option value={org.id}>{org.name}</option>));
    }

    if (this.props.org) {
      name = this.props.org.name;
    }
    else if (this.props.project) {
      name = this.props.project.name;
    }
    else if (this.props.element) {
      name = (<span className='element-name'>
                {this.props.element.name} {' '}
          <span className={'element-id'}>({this.props.element.id})</span>
              </span>
      );
    }
    else if (this.props.branch) {
      name = this.props.branch.name ? this.props.branch.name : this.props.branch.id;
    }

    // Return the project delete form
    return (
      <div id='workspace'>
        <div id='workspace-header' className='workspace-header'>
          <h2 className='workspace-title workspace-title-padding'>
            Delete {title}
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
            {
              (!this.props.orgs)
                ? ''
                : (
                  <FormGroup>
                    <Label for="org">Organization ID</Label>
                    <Input type="select"
                           name="org"
                           id="org"
                           value={this.state.org || ''}
                           onChange={this.handleOrgChange}>
                      <option>Choose one...</option>
                      {orgOptions}
                    </Input>
                  </FormGroup>
                )
            }
            {/* Verify if project-views provided */}
            { // Create a form to choose the project
              (!this.props.projects)
                ? ''
                : (
                  <FormGroup>
                    <Label for="id">Project ID</Label>
                    <Input type="select"
                           name="id"
                           id="id"
                           value={this.state.id || ''}
                           onChange={this.handleChange}>
                      <option>Choose one...</option>
                      {this.state.projectOpt}
                    </Input>
                </FormGroup>)
            }
            {/* Verify if project provided */}
            {(this.props.org || this.props.project || this.props.branch || this.props.element)
              ? (<FormGroup>
                  <Label for="id">Do you want to delete {name}?</Label>
                 </FormGroup>)
              // Display confirmation
              : ''
            }
            {/* Button to submit and delete project */}
            <Button color='danger' onClick={this.onSubmit}> Delete </Button>{' '}
            <Button outline onClick={this.props.toggle}> Cancel </Button>
          </Form>
        </div>
      </div>
    );
  }

}

export default Delete;
