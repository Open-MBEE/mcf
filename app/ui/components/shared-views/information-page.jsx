/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.shared-views.information-page
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders an organization or project
 * information page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
import { Button, Modal, ModalBody, Badge } from 'reactstrap';

// MBEE modules
import EditPage from './edit-page.jsx';
import CustomData from '../general/custom-data/custom-data.jsx';

/* eslint-enable no-unused-vars */

class InformationPage extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      data: null,
      modal: false
    };

    // Bind component functions
    this.handleToggle = this.handleToggle.bind(this);
  }

  // Define toggle function
  handleToggle() {
    // Open or close modal
    this.setState((prevState) => ({ modal: !prevState.modal }));
  }

  componentDidMount() {
    if (this.props.branch) {
      const branchId = this.props.match.params.branchid;
      const base = `${this.props.url}/branches/${branchId}`;
      const url = `${base}?minified=true&includeArchived=true`;

      $.ajax({
        method: 'GET',
        url: url,
        statusCode: {
          200: (data) => {
            this.setState({ data: data });
          },
          401: () => {
            this.setState({ data: null });

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
  }

  render() {
    // Initialize variables
    let name;
    let id;
    let visibility;
    let orgid;
    let projid;
    let sourceid;
    let branchName;
    let custom = {};
    let isButtonDisplayed = false;
    let titleClass = 'workspace-title workspace-title-padding';

    // Check admin/write permissions
    if (this.props.permissions === 'admin') {
      isButtonDisplayed = true;
      titleClass = 'workspace-title';
    }

    // Populate relevant fields
    if (this.props.org) {
      id = this.props.org.id;
      custom = this.props.org.custom;
      const archived = (<Badge color='secondary' style={{ marginLeft: '10px' }}>Archived</Badge>);
      // Verify if archived org, then place badge on information page next to name
      name = (this.props.org.archived)
        ? (<div> {this.props.org.name} {archived} </div>)
        : (<div> {this.props.org.name} </div>);
    }
    else if (this.props.project) {
      const archived = (<Badge color='secondary' style={{ marginLeft: '10px' }}>Archived</Badge>);
      // Verify if archived project, then place badge on information page next to name
      name = (this.props.project.archived)
        ? (<div> {this.props.project.name} {' '} {archived} </div>)
        : (<div> {this.props.project.name} </div>);
      id = this.props.project.id;
      orgid = this.props.project.org;
      visibility = this.props.project.visibility;
      custom = this.props.project.custom;
    }
    else if (this.state.data) {
      const branch = this.state.data;
      let tag;
      if (branch.tag) {
        tag = (<Badge color='primary'>Tag</Badge>);
      }
      name = (branch.name)
        ? (<div> {branch.name} {tag} </div>)
        : (<div> {branch.id} {tag} </div>);
      branchName = branch.name;
      id = branch.id;
      orgid = branch.org;
      projid = branch.project;
      sourceid = branch.source;
      custom = branch.custom;
    }

    return (
      <React.Fragment>
        {/* Modal for editing the information */}
        <Modal isOpen={this.state.modal} toggle={this.handleToggle}>
          <ModalBody>
            {(this.props.project && !this.props.org)
              ? (<EditPage project={this.props.project}
                           orgid={this.props.project.org}
                           toggle={this.handleToggle}/>)
              : (<EditPage org={this.props.org} toggle={this.handleToggle}/>)
            }
          </ModalBody>
        </Modal>
        <div id='workspace'>
          <div className='workspace-header header-box-depth'>
            <h2 className={titleClass}>{name}</h2>
            { /* Verify user is an admin */}
            {(!isButtonDisplayed)
              ? ''
              // Display edit button
              : (
                <div className='workspace-header-button'>
                  <Button className='btn'
                          outline color="secondary"
                          onClick={this.handleToggle}>
                    Edit
                  </Button>
                </div>
              )
            }
          </div>
          <div id='workspace-body'>
            <div className='main-workspace extra-padding'>
              <table className='table-width'>
                <tbody>
                  {(!this.props.branch)
                    ? <tr/>
                    : (<tr>
                        <th style={{ display: 'flex', justifyContent: 'flex-start' }}>
                          <Button close
                                 aria-label='Filter'
                                 size='sm' onClick={this.props.history.goBack}>
                            <span>
                              <i className='fas fa-arrow-left' style={{ fontSize: '15px' }}/>
                            </span>
                          </Button>
                        </th>
                      </tr>)

                  }
                <tr>
                  <th>ID:</th>
                  <td>{id}</td>
                </tr>
                {(this.props.project || this.props.branch)
                  ? (<tr>
                      <th>Org ID:</th>
                      <td><a href={`/orgs/${orgid}`}>{orgid}</a></td>
                     </tr>)
                  : <tr/>
                }
                {(!this.props.project)
                  ? <tr/>
                  : (<React.Fragment>
                      <tr>
                        <th>Visibility:</th>
                        <td>{visibility}</td>
                      </tr>
                    </React.Fragment>
                  )
                }
                {(!this.props.branch)
                  ? <tr/>
                  : (<React.Fragment>
                      <tr>
                        <th>Project ID:</th>
                        <td>
                          <a href={`/orgs/${orgid}/projects/${projid}/branches/master/elements`}>
                            {projid}
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <th>Name:</th>
                        <td>{branchName}</td>
                      </tr>
                      <tr>
                        <th>Source Branch:</th>
                        <td>
                          <a href={`/orgs/${orgid}/projects/${projid}/branches/${sourceid}`}>
                            {sourceid}
                          </a>
                        </td>
                      </tr>
                    </React.Fragment>
                  )
                }
                </tbody>
              </table>
              <CustomData data={custom}/>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }

}

export default InformationPage;
