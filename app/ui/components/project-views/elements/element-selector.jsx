/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.element-selector
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
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

// React modules
import React from 'react';
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

/* eslint-enable no-unused-vars */

class ElementSelector extends React.Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      modal: false,
      projects: [],
      project: props.project.id,
      selectedElement: '',
      selectedElementPreview: '',
      error: null
    };

    // Verify currentSelection is in props
    if (props.currentSelection) {
      // Set selectedElementPreview to the currentSelection
      this.state.selectedElementPreview = props.currentSelection;
    }

    // Bind the functions
    this.toggle = this.toggle.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.selectElementHandler = this.selectElementHandler.bind(this);
    this.select = this.select.bind(this);
    this.clear = this.clear.bind(this);
  }

  componentDidUpdate(prevProps) {
    // Verify if currentSelection prop updated
    if (prevProps.currentSelection !== this.props.currentSelection) {
      // Update selectedElementPreview state
      this.setState({ selectedElementPreview: this.props.currentSelection });
    }

    if ((prevProps.differentProject !== this.props.differentProject)
      && (this.props.differentProject)) {
      this.setState({ project: this.props.differentProject.project });
    }
  }

  /**
   * @description Toggle the state of the modal.
   */
  toggle() {
    this.setState(prevState => ({
      modal: !prevState.modal
    }));
  }

  /**
   * @description This is the click handler used to select an element.
   *
   * @param {string} id - The id of the selected element.
   */
  selectElementHandler(id) {
    // Verify id is not self
    if (id === this.props.self) {
      // Display error
      this.setState({
        selectedElementPreview: null,
        selectDisabled: true,
        error: 'Element cannot select self.'
      });
      return;
    }
    // Otherwise, reset error to null and set selected state
    this.setState({
      selectedElementPreview: id,
      error: null,
      selectDisabled: false
    });
  }

  /**
   * @description Confirms and finalizes the element selection. Then closes the modal.
   */
  select() {
    this.setState({ selectedElement: this.state.selectedElementPreview });
    this.toggle();

    // Using preview here because it appears setState is async.
    // When using this.state.selectedElement here is is not yet set when it
    // is passed into the selectedHandler
    // Verify if the element is being referenced in a different project
    if (this.state.project !== this.props.project.id) {
      // Grab the project that it is referencing and pass it back to parent
      // to update namespace field.
      this.state.projects.forEach((project) => {
        if (project.id === this.state.project) {
          this.props.selectedHandler(this.state.selectedElementPreview, project);
        }
      });
    }
    else {
      this.props.selectedHandler(this.state.selectedElementPreview);
    }
  }

  /**
   * @description Resets the selectedElementPreview state.
   */
  clear() {
    this.setState({
      selectedElementPreview: null
    });
  }

  /**
   * @description Changes the project.
   *
   * @param {object} event - The event trigger.
   */
  handleChange(event) {
    this.setState({ project: event.target.value });
  }

  componentDidMount() {
    // Initialize variables
    const orgid = this.props.project.org;
    const url = `/api/orgs?ids=${orgid},default&populate=projects&fields=projects&minified=true`;

    // Get projects from current org and default org
    $.ajax({
      method: 'GET',
      url: url,
      statusCode: {
        200: (orgs) => {
          // Initialize array
          let projects = [];

          // For each org push projects to array
          orgs.forEach((org) => {
            // Concatenate the arrays
            projects = projects.concat(org.projects);
          });

          // Set the projects state
          this.setState({ projects: projects });
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

  render() {
    // Initialize Variables
    let error = '';
    const defaultOrgOpts = [];
    const currentOrgOpts = [];
    let projObj = this.props.project;

    // Verify error
    if (this.state.error) {
      // Display error
      error = <span className={'text-danger'}>{this.state.error}</span>;
    }

    // Verify there are projects
    if (this.state.projects.length > 0) {
      // Loop through all projects
      this.state.projects.forEach((project) => {
        // Verify project has internal visibility or is the current project
        if (project.visibility === 'internal' || (project.id === this.props.project.id)) {
          // Verify if project is current project
          if (project.id === this.state.project) {
            // Set new project object
            projObj = project;
          }

          // Create an option element
          const projOpt = (<option value={project.id} key={`proj-${project.id}`}> {project.name} </option>);
          // If org is default
          if (project.org === 'default') {
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
        <i className='fas fa-caret-square-down' onClick={this.toggle}/>
        <Modal size="lg"
               isOpen={this.state.modal}
               toggle={this.toggle}
               className='element-selector-modal element-tree-container'>
          <ModalHeader toggle={this.toggle}>Select an element</ModalHeader>
          <ModalBody>
            {/* Verify if element selector is for the parent */}
            {(this.props.parent)
              ? ''
              : (<div className='element-selector-project'>
                  <InputGroup size='sm'>
                    <span className='project-label'>Projects:</span>
                    <Input type='select'
                           name='project'
                           id='project'
                           className='project-input'
                           value={this.state.project}
                           onChange={this.handleChange}>
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
                         branch={this.props.branch}
                         clickHandler={this.selectElementHandler}/>
          </ModalBody>
          <ModalFooter style={{ overflow: 'hidden' }}>
            <p style={{ overflow: 'scroll' }}>
              Selected: {this.state.selectedElementPreview}
              {(this.state.selectedElementPreview)
                ? <i className='fas fa-times-circle clear-btn' onClick={this.clear}/>
                : 'null'
              }
            </p>
              {error}
            <Button color="primary"
                    disabled={this.state.selectDisabled}
                    onClick={this.select}>Select</Button>
            <Button color="secondary" onClick={this.toggle}>Cancel</Button>
          </ModalFooter>
        </Modal>
      </div>
    );
  }

}

// Export component
export default ElementSelector;
