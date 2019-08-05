/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.profile-views.profile-home
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders a user's home page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';
import {
  Input,
  InputGroup,
  Badge,
  DropdownToggle,
  UncontrolledButtonDropdown,
  DropdownMenu,
  Label
} from 'reactstrap';

/* eslint-enable no-unused-vars */

// Define function
class BranchBar extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      branches: null,
      currentBranch: null
    };

    this.handleChange = this.handleChange.bind(this);
  }

  // Handles branch change
  handleChange(event) {
    if (event.target.value !== null) {
      const orgId = this.props.project.org;
      const projId = this.props.project.id;
      const newUrl = `/orgs/${orgId}/projects/${projId}/branches/${event.target.value}/elements`;
      // Reload the place with new branch
      window.location.replace(newUrl);
    }
  }

  componentDidMount() {
    // Initialize variables
    const orgId = this.props.project.org;
    const projId = this.props.project.id;
    const base = `/api/orgs/${orgId}/projects/${projId}/branches`;
    const url = `${base}?archived=true&minified=true`;

    // Grab all branches
    $.ajax({
      method: 'GET',
      url: url,
      statusCode: {
        200: (data) => {
          // Set branch state
          this.setState({ branches: data });

          // Grab the current branch data
          data.forEach((branch) => {
            if (branch.id === this.props.branchid) {
              this.setState({ currentBranch: branch });
            }
          });
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

  render() {
    // Initialize variables
    let tag = false;
    let archived = false;
    const branchOptions = [];
    const tagOptions = [];

    // Verify branches were grabbed
    if (this.state.branches) {
      // Loop through branches
      this.state.branches.forEach((branch) => {
        // Verify branch or tag
        if (!branch.tag) {
          // Push to branch options
          branchOptions.push(
            <option className='branch-opts'
                    key={`opt-${branch.id}`}
                    value={branch.id}>
              {(branch.name.length > 0) ? branch.name : branch.id}
            </option>
          );
        }
        else {
          // Push to tag options
          tagOptions.push(
            <option className='branch-opts'
                    key={`opt-${branch.id}`}
                    value={branch.id}>
              {(branch.name.length > 0) ? branch.name : branch.id}
            </option>
          );
        }
      });
    }

    // Verify current branch is grabbed
    if (this.state.currentBranch) {
      // Set the tag and archive badges
      tag = this.state.currentBranch.tag;
      archived = this.state.currentBranch.archived;
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
                     value={this.props.branchid}
                     onChange={this.handleChange}>
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
            <div className='options-btn'>
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
                <DropdownMenu className='options-card'>
                  <div>
                    <Label check className='minimize'>
                      <Input type='checkbox'
                             name='archived'
                             id='archived'
                             checked={this.props.archived}
                             value={this.state.archived}
                             onChange={this.props.displayArchElems} />
                      <div style={{ paddingTop: '3px' }}>
                        Include archived
                      </div>
                    </Label>
                  </div>
                  <div>
                    <Label check className='minimize'>
                      <Input type='checkbox'
                             name='archived'
                             id='archived'
                             checked={this.props.displayIds}
                             value={this.props.displayIds}
                             onChange={this.props.toggleIds} />
                      <div style={{ paddingTop: '3px' }}>
                        Toggle IDs
                      </div>
                    </Label>
                  </div>
                </DropdownMenu>
              </UncontrolledButtonDropdown>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }

}

// Export function
export default BranchBar;
