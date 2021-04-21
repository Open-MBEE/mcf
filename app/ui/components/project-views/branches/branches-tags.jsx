/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.branches.branches-tags
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders a branches and tags page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalBody, UncontrolledTooltip } from 'reactstrap';
// MBEE modules
import BoxList from '../../general/box-list.jsx';
import CreateBranch from './branch-new.jsx';
import BranchListItem from '../../shared-views/list-items/branch-list-item.jsx';
import List from '../../general/list/list.jsx';
import Edit from '../../shared-views/edit-page.jsx';
import Delete from '../../shared-views/delete.jsx';
import { useApiClient } from '../../context/ApiClientProvider';

/* eslint-enable no-unused-vars */

// Define function
function BranchesTags(props) {
  const { branchService } = useApiClient();
  const [branches, setBranches] = useState([]);
  const [branchSelected, setBranchSelected] = useState(null);
  const [tags, setTags] = useState([]);
  const [modalCreate, setModalCreate] = useState(false);
  const [modalDelete, setModalDelete] = useState(false);
  const [modalEdit, setModalEdit] = useState(false);
  const [pages, setPages] = useState({ branch: 1, tag: 1 });
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState(null);

  const toggleCreateModal = () => {
    setModalCreate((prevState) => !prevState);
  };

  const toggleDeleteModal = (id) => {
    if (id) setBranchSelected(id);
    setModalDelete((prevState) => !prevState);
  };

  const toggleEditModal = (id) => {
    setBranchSelected(id);
    setModalEdit((prevState) => !prevState);
  };

  const getBranches = async (retrieving, differentPage) => {
    // Initialize variables
    const page = Number(differentPage) || Number(pages.branch);
    const options = {
      includeArchived: true,
      tag: false,
      limit: 6
    };

    // Set skip option if appropriate
    if ((retrieving === 'next') || differentPage) {
      options.skip = (page * 6) - 1;
    }
    else if ((retrieving === 'back') && (page !== 2)) {
      options.skip = ((page - 1) * 6) - 6;
    }

    // Request branch data
    const [err, data] = await branchService.get(props.project.org, props.project.id, options);

    // This happens if the last branch on a page is deleted
    if (differentPage && err === 'No branches found.') {
      // Reset to previous page because there's nothing to show on the current page
      setPages((prevState) => ({
        ...prevState,
        branch: prevState.branch - 1
      }));
      getBranches(null, differentPage - 1);
    }
    else if (err) {
      setError(err);
    }
    else if (data) {
      // Set the branches state
      setBranches(data);

      // Verify if going next or back
      if (retrieving === 'next') {
        // Set the update page number
        setPages((prevState) => ({
          branch: Number(prevState.branch) + 1,
          tag: prevState.tag
        }));
      }
      else if (retrieving === 'back') {
        // Set the update page number
        setPages((prevState) => ({
          branch: Number(prevState.branch) - 1,
          tag: prevState.tag
        }));
      }
    }
  };

  const getTags = async (retrieving, differentPage) => {
    // Initialize variables
    const page = Number(differentPage) || Number(pages.tag);
    const options = {
      includeArchived: true,
      tag: true,
      limit: 6
    };
    // Verify needed get request options
    if ((retrieving === 'next') || differentPage) {
      options.skip = (page * 6) - 1;
    }
    else if ((retrieving === 'back') && (page !== 2)) {
      options.skip = ((page - 1) * 6) - 6;
    }

    // Request tag data
    const [err, data] = await branchService.get(props.project.org, props.project.id, options);

    // This happens if the last branch on a page is deleted
    if (differentPage && err === 'No branches found.') {
      // Reset to previous page because there's nothing to show on the current page
      setPages((prevState) => ({
        ...prevState,
        branch: prevState.branch - 1
      }));
      getTags(null, differentPage - 1);
    }
    else if (err) {
      setError(err);
    }
    else if (data) {
      // Set the tags state
      setTags(data);

      // Verify if going next or back
      if (retrieving === 'next') {
        // Set the update page number
        setPages((prevState) => ({
          branch: prevState.branch,
          tag: Number(prevState.tag) + 1
        }));
      }
      else if (retrieving === 'back') {
        // Set the update page number
        setPages((prevState) => ({
          branch: prevState.branch,
          tag: Number(prevState.tag) - 1
        }));
      }
    }
  };

  const refresh = () => {
    // Verify search params
    if (props && props.location.search) {
      // Grab the search parameters and set new page state
      const searchParams = props.location.search.replace('?', '').split('&');

      const newPages = {};
      searchParams.forEach((param) => {
        newPages[param.split('=')[0]] = param.split('=')[1];
      });

      setPages(newPages);

      // Verify which search is occurring
      if (Number(newPages.branch) > 1) {
        // Get branches
        getBranches(null, newPages.branch - 1);
      }
      else {
        // Get branches
        getBranches();
      }

      if (Number(newPages.tag) > 1) {
        // Get tags
        getTags(null, newPages.tag - 1);
      }
      else {
        // Get tags
        getTags();
      }
    }
    else {
      // Get branches and tags
      getBranches();
      getTags();
    }
  };

  // on mount
  useEffect(() => {
    refresh();
  }, []);


  // Initialize variables
  let btnDisClassName = 'workspace-title workspace-title-padding';
  let displayBtns = false;
  let branchList;
  let tagList;
  const footerBranchesBtn = {
    btn: {
      back: {
        for: 'branch',
        icon: 'fas fa-arrow-left',
        onClick: getBranches,
        varForClick: 'back',
        pages: pages
      }
    }
  };
  const footerTagsBtn = {
    btn: {
      back: {
        for: 'tag',
        icon: 'fas fa-arrow-left',
        onClick: getTags,
        varForClick: 'back',
        pages: pages
      }
    }
  };

  // Verify there is a next page
  if (branches.length === 6) {
    footerBranchesBtn.btn.next = {
      for: 'branch',
      icon: 'fas fa-arrow-right',
      onClick: getBranches,
      varForClick: 'next',
      pages: pages
    };
  }

  // Verify there is a next page
  if (tags.length === 6) {
    footerTagsBtn.btn.next = {
      for: 'tag',
      icon: 'fas fa-arrow-right',
      onClick: getTags,
      varForClick: 'next',
      pages: pages
    };
  }

  // Check admin/write permissions
  if (props.permissions === 'admin' || props.permissions === 'write') {
    displayBtns = true;
    btnDisClassName = 'workspace-title';
  }

  // Verify the state was set
  if (branches) {
    // Grab the first 5 branches
    const displayBranches = branches.slice(0, 5);
    // Loop through and create branch list items
    branchList = displayBranches.map((branch) => (
      <div className='user-info' key={`branch-info-${branch.id}`}>
        <BranchListItem className='branch'
                        link={`/orgs/${branch.org}/projects/${branch.project}/branches/${branch.id}`}
                        branch={branch}
                        _key={`branch-${branch.id}`}/>
        <div className='controls-container'>
          <UncontrolledTooltip placement='top' target={`edit-${branch.id}`}>
            Edit
          </UncontrolledTooltip>
          <i id={`edit-${branch.id}`}
             onClick={() => toggleEditModal(branch)}
             className='fas fa-edit add-btn'/>
          <UncontrolledTooltip placement='top' target={`delete-${branch.id}`}>
            Delete
          </UncontrolledTooltip>
          <i id={`delete-${branch.id}`}
             className='fas fa-trash-alt delete-btn'
             onClick={() => toggleDeleteModal(branch)}/>
        </div>
      </div>));
  }

  // Verify state was set
  if (tags) {
    // Grab the first 5 tags
    const displayTags = tags.slice(0, 5);
    // Loop through and create tag list items
    tagList = displayTags.map((tag) => (
      <div className='user-info' key={`tag-info-${tag.id}`}>
        <BranchListItem className='branch'
                        link={`/orgs/${tag.org}/projects/${tag.project}/branches/${tag.id}`}
                        branch={tag}
                        _key={`branch-${tag.id}`}/>
        <div className='controls-container'>
          <UncontrolledTooltip placement='top' target={`edit-tag-${tag.id}`}>
            Edit
          </UncontrolledTooltip>
          <i id={`edit-tag-${tag.id}`}
             onClick={() => toggleEditModal(tag)}
             className='fas fa-edit add-btn'/>
          <UncontrolledTooltip placement='top' target={`delete-${tag.id}`}>
            Delete
          </UncontrolledTooltip>
          <i id={`delete-${tag.id}`}
             className='fas fa-trash-alt delete-btn'
             onClick={() => toggleDeleteModal(tag)}/>
        </div>
      </div>));
  }

  return (
    <div id='workspace'>
      <Modal isOpen={modalCreate} toggle={toggleCreateModal}>
        <ModalBody>
          <CreateBranch toggle={toggleCreateModal}
                        project={props.project}
                        refresh={refresh}/>
        </ModalBody>
      </Modal>
      <Modal isOpen={modalDelete} toggle={toggleDeleteModal}>
        <ModalBody>
          <Delete toggle={toggleDeleteModal}
                  branch={branchSelected}
                  refresh={refresh}/>
        </ModalBody>
      </Modal>
      <Modal isOpen={modalEdit} toggle={toggleEditModal}>
        <ModalBody>
          <Edit toggle={toggleEditModal}
                branch={branchSelected}
                refresh={refresh}/>
        </ModalBody>
      </Modal>
      <div className='workspace-header header-box-depth'>
        <h2 className={btnDisClassName}>Branches / Tags</h2>
        { /* Verify user is an admin or write permissions */}
        {(!displayBtns)
          ? ''
          // Display edit button
          : (
            <div className='workspace-header-button'>
              <Button className='btn'
                      outline color='primary'
                      onClick={toggleCreateModal}>
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
              {branchList}
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
              {tagList}
            </List>
          </BoxList>
        </div>
      </div>
    </div>
  );
}

// Export function
export default BranchesTags;
