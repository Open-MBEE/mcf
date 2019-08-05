/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.profile-views.profile-home
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders a branches and tags page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';
import { Button, Modal, ModalBody, UncontrolledTooltip } from 'reactstrap';

// MBEE Modules
import BoxList from '../../general/box-list.jsx';
import CreateBranch from './branch-new.jsx';
import BranchListItem from '../../shared-views/list-items/branch-list-item.jsx';
import List from '../../general/list/list.jsx';
import Edit from '../../shared-views/edit-page.jsx';
import Delete from '../../shared-views/delete.jsx';

/* eslint-enable no-unused-vars */

// Define function
class BranchesTags extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      branches: [],
      branchSelected: null,
      tags: [],
      modalCreate: false,
      modalDelete: false,
      modalEdit: false,
      pages: { branch: 1, tag: 1 }
    };

    this.toggleCreateModal = this.toggleCreateModal.bind(this);
    this.toggleDeleteModal = this.toggleDeleteModal.bind(this);
    this.toggleEditModal = this.toggleEditModal.bind(this);
    this.getBranches = this.getBranches.bind(this);
    this.getTags = this.getTags.bind(this);
  }

  componentDidMount() {
    // Verify search params
    if (this.props.location.search) {
      // Grab the search parameters and set new page state
      const searchParams = this.props.location.search.replace('?', '').split('&');

      const newPages = {};
      searchParams.forEach((param) => {
        newPages[param.split('=')[0]] = param.split('=')[1];
      });

      this.setState({ pages: newPages });

      // Verify which search is occurring
      if (Number(newPages.branch) > 1) {
        // Get branches
        this.getBranches(null, newPages.branch - 1);
      }
      else {
        // Get branches
        this.getBranches();
      }

      if (Number(newPages.tag) > 1) {
        // Get tags
        this.getTags(null, newPages.tag - 1);
      }
      else {
        // Get tags
        this.getTags();
      }
    }
    else {
      // Get branches and tags
      this.getBranches();
      this.getTags();
    }
  }

  getBranches(retrieving, differentPage) {
    // Initialize variables
    const orgId = this.props.project.org;
    const projId = this.props.project.id;
    const page = Number(differentPage) || Number(this.state.pages.branch);
    let opts = 'archived=true&tag=false&minified=true&limit=6';
    const base = `/api/orgs/${orgId}/projects/${projId}/branches`;
    // Verify needed get request options
    if ((retrieving === 'next') || differentPage) {
      const skipNum = (page * 6) - 1;
      opts = `archived=true&tag=false&minified=true&limit=6&skip=${skipNum}`;
    }
    else if ((retrieving === 'back') && (page !== 2)) {
      const skipNum = ((page - 1) * 6) - 6;
      opts = `archived=true&tag=false&minified=true&limit=6&skip=${skipNum}`;
    }

    const url = `${base}?${opts}`;

    // Get the branches
    $.ajax({
      method: 'GET',
      url: url,
      statusCode: {
        200: (data) => {
          // Set the branches state
          this.setState({ branches: data });

          // Verify if going next or back
          if (retrieving === 'next') {
            // Set the update page number
            this.setState((prevState) => ({
              pages: { branch: Number(prevState.pages.branch) + 1, tag: prevState.pages.tag }
            }));
          }
          else if (retrieving === 'back') {
            // Set the update page number
            this.setState((prevState) => ({
              pages: { branch: Number(prevState.pages.branch) - 1, tag: prevState.pages.tag }
            }));
          }
        },
        401: () => {
          this.setState({ branches: null });

          // Refresh when session expires
          window.location.reload();
        },
        403: (err) => {
          this.setState({ error: err.responseText });
        },
        404: (err) => {
          this.setState({ error: err.responseText });
        }
      }
    });
  }

  getTags(retrieving, differentPage) {
    // Initialize variables
    const orgId = this.props.project.org;
    const projId = this.props.project.id;
    const page = Number(differentPage) || Number(this.state.pages.tag);
    let opts = 'archived=true&tag=true&minified=true&limit=6';
    const base = `/api/orgs/${orgId}/projects/${projId}/branches`;
    // Verify needed get request options
    if ((retrieving === 'next') || differentPage) {
      const skipNum = (page * 6) - 1;
      opts = `archived=true&tag=true&minified=true&limit=6&skip=${skipNum}`;
    }
    else if ((retrieving === 'back') && (page !== 2)) {
      const skipNum = ((page - 1) * 6) - 6;
      opts = `archived=true&tag=true&minified=true&limit=6&skip=${skipNum}`;
    }

    const url = `${base}?${opts}`;

    // Get the tags
    $.ajax({
      method: 'GET',
      url: url,
      statusCode: {
        200: (data) => {
          // Set the tags state
          this.setState({ tags: data });

          // Verify if going next or back
          if (retrieving === 'next') {
            // Set the update page number
            this.setState((prevState) => ({
              pages: { branch: prevState.pages.branch, tag: Number(prevState.pages.tag) + 1 }
            }));
          }
          else if (retrieving === 'back') {
            // Set the update page number
            this.setState((prevState) => ({
              pages: { branch: prevState.pages.branch, tag: Number(prevState.pages.tag) - 1 }
            }));
          }
        },
        401: () => {
          this.setState({ tags: null });

          // Refresh when session expires
          window.location.reload();
        },
        403: (err) => {
          this.setState({ error: err.responseText });
        },
        404: (err) => {
          this.setState({ error: err.responseText });
        }
      }
    });
  }

  // Define toggle function
  toggleCreateModal() {
    // Set the delete modal state
    this.setState((prevState) => ({ modalCreate: !prevState.modalCreate }));
  }

  // Define toggle function
  toggleEditModal(id) {
    this.setState((prevState) => (
      {
        branchSelected: id,
        modalEdit: !prevState.modalEdit
      }));
  }

  // Define toggle function
  toggleDeleteModal(id) {
    if (id) {
      this.setState((prevState) => (
        {
          branchSelected: id,
          modalDelete: !prevState.modalDelete
        }));
    }
    else {
      // Set the delete modal state
      this.setState((prevState) => ({ modalDelete: !prevState.modalDelete }));
    }
  }

  render() {
    // Initialize variables
    let btnDisClassName = 'workspace-title workspace-title-padding';
    let displayBtns = false;
    let branches;
    let tags;
    const footerBranchesBtn = {
      btn: {
        back: {
          for: 'branch',
          icon: 'fas fa-arrow-left',
          onClick: this.getBranches,
          varForClick: 'back',
          pages: this.state.pages
        }
      }
    };
    const footerTagsBtn = {
      btn: {
        back: {
          for: 'tag',
          icon: 'fas fa-arrow-left',
          onClick: this.getTags,
          varForClick: 'back',
          pages: this.state.pages
        }
      }
    };

    // Verify there is a next page
    if (this.state.branches.length === 6) {
      footerBranchesBtn.btn.next = {
        for: 'branch',
        icon: 'fas fa-arrow-right',
        onClick: this.getBranches,
        varForClick: 'next',
        pages: this.state.pages
      };
    }

    // Verify there is a next page
    if (this.state.tags.length === 6) {
      footerTagsBtn.btn.next = {
        for: 'tag',
        icon: 'fas fa-arrow-right',
        onClick: this.getTags,
        varForClick: 'next',
        pages: this.state.pages
      };
    }

    // Check admin/write permissions
    if (this.props.permissions === 'admin' || this.props.permissions === 'write') {
      displayBtns = true;
      btnDisClassName = 'workspace-title';
    }

    // Verify the state was set
    if (this.state.branches) {
      // Grab the first 5 branches
      const displayBranches = this.state.branches.slice(0, 5);
      // Loop through and create branch list items
      branches = displayBranches.map((branch) => (
        <div className='user-info' key={`branch-info-${branch.id}`}>
          <BranchListItem className='branch'
                          href={`/orgs/${branch.org}/projects/${branch.project}/branches/${branch.id}`}
                          branch={branch}
                          _key={`branch-${branch.id}`}/>
          <div className='controls-container'>
            <UncontrolledTooltip placement='top' target={`edit-${branch.id}`}>
              Edit
            </UncontrolledTooltip>
            <i id={`edit-${branch.id}`}
               onClick={() => this.toggleEditModal(branch)}
               className='fas fa-edit add-btn'/>
            <UncontrolledTooltip placement='top' target={`delete-${branch.id}`}>
              Delete
            </UncontrolledTooltip>
            <i id={`delete-${branch.id}`}
               className='fas fa-trash-alt delete-btn'
               onClick={() => this.toggleDeleteModal(branch)}/>
          </div>
        </div>));
    }

    // Verify state was set
    if (this.state.tags) {
      // Grab the first 5 tags
      const displayTags = this.state.tags.slice(0, 5);
      // Loop through and create tag list items
      tags = displayTags.map((tag) => (
        <div className='user-info' key={`tag-info-${tag.id}`}>
          <BranchListItem className='branch'
                          href={`/orgs/${tag.org}/projects/${tag.project}/branches/${tag.id}`}
                          branch={tag}
                          _key={`branch-${tag.id}`}/>
          <div className='controls-container'>
            <UncontrolledTooltip placement='top' target={`edit-tag-${tag.id}`}>
              Edit
            </UncontrolledTooltip>
            <i id={`edit-tag-${tag.id}`}
               onClick={() => this.toggleEditModal(tag)}
               className='fas fa-edit add-btn'/>
            <UncontrolledTooltip placement='top' target={`delete-${tag.id}`}>
              Delete
            </UncontrolledTooltip>
            <i id={`delete-${tag.id}`}
               className='fas fa-trash-alt delete-btn'
               onClick={() => this.toggleDeleteModal(tag)}/>
          </div>
        </div>));
    }

    return (
      <div id='workspace'>
        <Modal isOpen={this.state.modalCreate} toggle={this.toggleCreateModal}>
          <ModalBody>
            <CreateBranch toggle={this.toggleCreateModal}
                          project={this.props.project}/>
          </ModalBody>
        </Modal>
        <Modal isOpen={this.state.modalDelete} toggle={this.toggleDeleteModal}>
          <ModalBody>
            <Delete toggle={this.toggleDeleteModal}
                    branch={this.state.branchSelected}/>
          </ModalBody>
        </Modal>
        <Modal isOpen={this.state.modalEdit} toggle={this.toggleEditModal}>
          <ModalBody>
            <Edit toggle={this.toggleEditModal}
                  branch={this.state.branchSelected}/>
          </ModalBody>
        </Modal>
        <div id='workspace-header' className='workspace-header header-box-depth'>
          <h2 className={btnDisClassName}>Branches / Tags</h2>
          { /* Verify user is an admin or write permissions */}
          {(!displayBtns)
            ? ''
            // Display edit button
            : (
              <div className='workspace-header-button'>
                <Button className='btn'
                        outline color='primary'
                        onClick={this.toggleCreateModal}>
                  Create
                </Button>
              </div>
            )
          }
        </div>
        <div id='workspace-body'>
          <div className='main-workspace'>
            <BoxList header='Branches' footer={footerBranchesBtn}>
              <List key='list-branches'>
                <div className='template-header' key='user-info-template'>
                  <BranchListItem className='head-info'
                                  label={true}
                                  branch={{ name: 'Name',
                                    id: 'ID',
                                    source: 'Source Branch',
                                    createdOn: 'Created On' }}
                                  adminLabel={true}
                                  _key='branch-template'/>
                </div>
                {branches}
              </List>
            </BoxList>
            <BoxList header='Tags' footer={footerTagsBtn}>
              <List key='list-tags'>
                <div className='template-header' key='user-info-template'>
                  <BranchListItem className='head-info'
                                  label={true}
                                  branch={{ name: 'Name',
                                    id: 'ID',
                                    source: 'Source Branch',
                                    createdOn: 'Created On' }}
                                  adminLabel={true}
                                  _key='branch-template'/>
                </div>
                {tags}
              </List>
            </BoxList>
          </div>
        </div>
      </div>
    );
  }

}

// Export function
export default BranchesTags;
