/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.artifacts.project-artifacts
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author James Eckstein
 *
 * @description This renders a project's artifacts page.
 */


/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
import { Button, Modal, ModalBody, UncontrolledAlert, UncontrolledTooltip } from 'reactstrap';

// MBEE modules
import BoxList from '../../general/box-list.jsx';
import ArtifactListItem from '../../shared-views/list-items/artifact-list-item.jsx';
import List from '../../general/list/list.jsx';
import ArtifactForm from './artifact-form.jsx';
import BranchBar from '../branches/branch-bar.jsx';

/* eslint-enable no-unused-vars */

class ProjectArtifacts extends Component {

  constructor(props) {
    super(props);

    this.state = {
      artifacts: [],
      error: null,
      selectedArtifactId: null,
      modalOpen: false
    };

    this.toggleModal = this.toggleModal.bind(this);
    this.download = this.download.bind(this);
    this.delete = this.delete.bind(this);
  }

  // Toggle Create Modal
  toggleModal(artifactId) {
    const id = (typeof artifactId !== 'string') ? null : artifactId;

    this.setState((prevState) => ({
      modalOpen: !prevState.modalOpen,
      selectedArtifactId: id
    }));
  }

  // Download artifact blob
  download(artifact) {
    // Reset error state
    if (this.state.error) {
      this.setState({ error: null });
    }

    // URL input variables
    const { location, filename } = artifact;
    const { org, id } = this.props.project;

    // Base request variables
    const base = `/api/orgs/${org}/projects/${id}/artifacts/blob`;
    const url = `${base}?filename=${filename}&location=${location}`;

    // NOTE: Using XMLHttpRequest in lieu of jQuery AJAX as jQuery does
    // not allow updating response type when headers are received
    const xhr = new XMLHttpRequest();

    // Get artifact blob
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        // Download success
        if (xhr.status === 200) {
          // Download blob, user will be prompted to save.
          const link = document.createElement('a');
          const dataUrl = window.URL.createObjectURL(new Blob([xhr.response]));
          link.href = dataUrl;
          link.setAttribute('download', filename);
          // Append anchor to body.
          document.body.append(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(dataUrl);
        }
        else {
          // Display error response from server
          this.setState({ error: `[${filename}] ${xhr.responseText}` });
        }
      }
      else if (xhr.readyState === 2) {
        // readyState of '2' indicates headers have been received and response status is available.
        // Update response type based on status
        if (xhr.status === 200) {
          // File exists
          xhr.responseType = 'blob';
        }
        else {
          // No file found. Error response will be 'text'.
          xhr.responseType = 'text';
        }
      }
    };

    xhr.open('GET', url, true);
    xhr.send();
  }

  // Delete Artifact document.
  delete(artifactId) {
    // Reset error state
    if (this.state.error) {
      this.setState({ error: null });
    }

    // URL input variables
    const { org, id } = this.props.project;
    const { branchid } = this.props.match.params;

    // Base request variables
    const url = `/api/orgs/${org}/projects/${id}/branches/${branchid}/artifacts/${artifactId}`;

    // Delete Artifact Document
    $.ajax({
      method: 'DELETE',
      url: url
    })
    .done(() => {
      window.location.reload();
    })
    .fail(res => {
      this.setState({ error: res.responseText });
    });
  }

  // Retrieve Artifact documents for respective project branch.
  componentDidMount() {
    // Base request variables
    const { org, id } = this.props.project;
    const branchId = this.props.match.params.branchid;
    const base = `/api/orgs/${org}/projects/${id}/branches/${branchId}/artifacts`;
    const opts = 'includeArchived=true&minified=true';

    // Get artifacts
    $.ajax({
      method: 'GET',
      url: `${base}?${opts}`
    })
    .done(data => {
      this.setState({ artifacts: data });
    })
    .fail(res => {
      if (res.status === 404) {
        this.setState({ artifacts: [] });
      }
      else {
        this.setState({ error: res.responseText });
      }
    });
  }

  // Render artifacts list items
  renderArtifacts(artifacts) {
    const btnEdit = (this.props.permissions !== 'read');

    return (
      artifacts.map((artifact, idx) => (
        <div className='user-info' key={`artifact-info-${idx}`}>
          <ArtifactListItem className='branch'
                            artifact={artifact}
                            _key={`artifact-${artifact.id}`}/>
          <div className='controls-container'>
            {/* Display button if user has write or admin permissions */}
            {(btnEdit)
              ? <>
                <UncontrolledTooltip placement='top' target={`edit-${artifact.id}`}>
                  Edit
                </UncontrolledTooltip>
                <i id={`edit-${artifact.id}`}
                   className='fas fa-edit add-btn'
                   onClick={() => this.toggleModal(artifact.id)}/></>
              : ''
            }
            <UncontrolledTooltip placement='top' target={`download-${artifact.id}`}>
              Download
            </UncontrolledTooltip>
            <i id={`download-${artifact.id}`}
               className='fas fa-file-download download-btn'
               onClick={() => this.download(artifact)}/>
            {/* Display button if user has write or admin permissions */}
            {(btnEdit)
              ? <>
                <UncontrolledTooltip placement='top' target={`delete-${artifact.id}`}>
                  Delete
                </UncontrolledTooltip>
                <i id={`delete-${artifact.id}`}
                   className='fas fa-trash-alt delete-btn'
                   onClick={() => {
                     // eslint-disable-next-line no-alert
                     if (window.confirm('Are you sure you wish to delete this item?')) this.delete(artifact.id);
                   }}/></>
              : ''
            }
          </div>
        </div>
      ))
    );
  }

  render() {
    // Display first 30 artifacts
    const artifactsList = this.state.artifacts.slice(0, 30);
    const artifacts = (artifactsList.length > 0) ? this.renderArtifacts(artifactsList) : '';
    const titleClass = 'workspace-title workspace-title-padding';
    const btnCreate = (this.props.permissions !== 'read')
      ? (<div className='workspace-header-button'>
           <Button className='btn' outline color="primary" onClick={this.toggleModal}>Create</Button>
         </div>)
      : '';

    // Error alert
    const error = (this.state.error)
      ? (<div style={{ margin: 'auto', textAlign: 'center' }}>
           <UncontrolledAlert color="danger" style={{ display: 'inline', float: 'none' }}>
             {this.state.error}
           </UncontrolledAlert>
         </div>)
      : '';

    return (
      <div id='workspace'>
        <Modal isOpen={this.state.modalOpen}>
          <ModalBody>
            <ArtifactForm project={this.props.project}
                          branchId={this.props.match.params.branchid}
                          artifactId={this.state.selectedArtifactId}
                          toggle={this.toggleModal}/>
          </ModalBody>
        </Modal>
        <div className='workspace-header header-box-depth'>
          <h2 className={titleClass}>Artifacts</h2>
          { /* Display create button for privileged users */}
          {btnCreate}
        </div>
        <div id='workspace-body'>
          <div className='main-workspace'>
            <>
              { /* Branch selector */ }
              <div id='artifact-branch-bar'>
                <BranchBar project={this.props.project}
                           branchid={this.props.match.params.branchid}
                           endpoint='/artifacts'/>
              </div>
              <BoxList header='Artifacts' footer={{}}>
                <List key='list-artifacts'>
                  <div className='template-header' key='user-info-template'>
                    <ArtifactListItem className='head-info'
                                      label={true}
                                      artifact={{
                                        filename: 'Filename',
                                        location: 'Location',
                                        description: 'Description' }}
                                      _key='artifacts-template'/>
                  </div>
                  {/* Render Artifacts List Items */}
                  {artifacts}
                </List>
              </BoxList>
              {error}
            </>
          </div>
        </div>
      </div>
    );
  }

}

export default ProjectArtifacts;
