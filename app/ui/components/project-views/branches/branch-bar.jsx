/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.branches.branch-bar
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders a branch drop down bar including
 * the options for the tree filtering display.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect } from 'react';
import { Redirect } from 'react-router-dom';
import {
  Input,
  InputGroup,
  Badge,
  DropdownToggle,
  UncontrolledButtonDropdown,
  DropdownMenu,
  Label
} from 'reactstrap';

// MBEE modules
import { useApiClient } from '../../context/ApiClientProvider';

/* eslint-enable no-unused-vars */

// Define function
function BranchBar(props) {
  const { branchService } = useApiClient();
  const [branches, setBranches] = useState(null);
  const [currentBranch, setCurrentBranch] = useState(null);
  const [redirect, setRedirect] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    if (e.target.value !== null) {
      const { org, id } = props.project;
      let newUrl = `/orgs/${org}/projects/${id}/branches/${e.target.value}`;

      // Update URL endpoint to the page of the corresponding component: search, elements, artifacts
      newUrl = `${newUrl}${props.endpoint}`;

      // Reload the page with new branch
      setRedirect(newUrl);
    }
  };

  const handleCheck = (e) => {
    props.handleCheck(e);
  };

  // on mount
  useEffect(() => {
    // Get all branches
    const options = {
      includeArchived: true
    };
    branchService.get(props.project.org, props.project.id, options)
    .then(([err, data]) => {
      if (err) {
        setError(err);
      }
      else if (data) {
        // Store the branches in state
        setBranches(data);

        // Grab the current branch
        data.forEach((branch) => {
          if (branch.id === props.branchid) {
            setCurrentBranch(branch);
          }
        });
      }
    });
  }, []);


  if (redirect && redirect !== window.location.pathname) {
    return <Redirect to={redirect}/>;
  }

  // Initialize variables
  let tag = false;
  let archived = false;
  const branchOptions = [];
  const tagOptions = [];
  // Only display options on the project elements page.
  const displayOptions = (props.endpoint !== '/elements');

  // Verify branches were grabbed
  if (branches) {
    // Loop through branches
    branches.forEach((branch) => {
      // Verify branch or tag
      if (!branch.tag) {
        // Push to branch options
        branchOptions.push(
          <option className='branch-opts'
                  key={`opt-${branch.id}`}
                  value={branch.id}>
            {/* Verify branch has a name */}
            {(branch.name.length > 0)
              // Display name and id
              ? `${branch.name} [${branch.id}]`
              // Display id
              : branch.id
            }
          </option>
        );
      }
      else {
        // Push to tag options
        tagOptions.push(
          <option className='branch-opts'
                  key={`opt-${branch.id}`}
                  value={branch.id}>
            {/* Verify tag has a name */}
            {(branch.name.length > 0)
              // Display name and id
              ? `${branch.name} [${branch.id}]`
              // Display id
              : branch.id}
          </option>
        );
      }
    });
  }

  // Verify current branch is grabbed
  if (currentBranch) {
    // Set the tag and archive badges
    tag = currentBranch.tag;
    archived = currentBranch.archived;
  }

  return (
    <React.Fragment>
      <div className='branch-bar'>
        <div className='branches-dropdown'>
          <InputGroup size='sm'>
            <span className='branch-label'>Branch/Tag:</span>
            <Input type='select'
                   name='branch'
                   id='branch'
                   className='branch-input'
                   value={props.branchid}
                   onChange={handleChange}>
                    <option key='opt-branch'
                            disabled={true}>Branches</option>
                    {branchOptions}
                    <option key='opt-tag'
                            disabled={true}>Tags</option>
                    {tagOptions}
            </Input>
          </InputGroup>
        </div>
        <div className='branch-tag'>
          <div>
            {(!tag)
              ? ''
              : (<Badge color='primary'>Tag</Badge>)
            }
            {(!archived)
              ? ''
              : (<Badge color='secondary'>Archived</Badge>)
            }
          </div>
          { /* Hide Options on Search Form */ }
          {(displayOptions)
            ? ''
            : <div className='options-btn'>
              <UncontrolledButtonDropdown>
                <DropdownToggle close
                                id='toggler'
                                aria-label='Filter'
                                className='model-dropdown-btn'
                                size='sm'>
                <span>
                  <i className='fas fa-ellipsis-v' style={{ fontSize: '15px' }}/>
                </span>
                </DropdownToggle>
                <DropdownMenu className='options-card' style={{ minWidth: '11rem' }}>
                  <div>
                    <Label check className='minimize'>
                      <Input type='checkbox'
                             name='archived'
                             id='archived'
                             checked={props.archived}
                             value={archived}
                             onChange={handleCheck}/>
                      <div style={{ paddingTop: '3px' }}>
                        Include archived
                      </div>
                    </Label>
                  </div>
                  <div>
                    <Label check className='minimize'>
                      <Input type='checkbox'
                             name='displayIds'
                             id='displayIds'
                             checked={props.displayIds}
                             value={props.displayIds}
                             onChange={handleCheck}/>
                      <div style={{ paddingTop: '3px' }}>
                        Toggle IDs
                      </div>
                    </Label>
                  </div>
                  <div>
                    <Label check className='minimize'>
                      <Input type='checkbox'
                             name='expand'
                             id='expand'
                             checked={props.expand}
                             value={props.expand}
                             onChange={handleCheck}/>
                      <div style={{ paddingTop: '3px' }}>
                        Expand All
                      </div>
                    </Label>
                  </div>
                  <div>
                    <Label check className='minimize'>
                      <Input type='checkbox'
                             name='collapse'
                             id='collapse'
                             checked={props.collapse}
                             value={props.collapse}
                             onChange={handleCheck}/>
                      <div style={{ paddingTop: '3px' }}>
                        Collapse All
                      </div>
                    </Label>
                  </div>
                </DropdownMenu>
              </UncontrolledButtonDropdown>
            </div>
          }
        </div>
      </div>
    </React.Fragment>
  );
}

// Export function
export default BranchBar;
