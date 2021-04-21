/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.shared-views.information-page
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
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
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal, ModalBody, Badge } from 'reactstrap';

// MBEE modules
import EditPage from './edit-page.jsx';
import CustomData from '../general/custom-data/custom-data.jsx';
import { useApiClient } from '../context/ApiClientProvider';

/* eslint-enable no-unused-vars */

function InformationPage(props) {
  const { branchService } = useApiClient();
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState(null);

  const handleToggle = () => {
    setModal((prevState) => !prevState);
  };

  const refreshBranch = async () => {
    // Get branch data
    const options = {
      ids: props.match.params.branchid
    };
    const [err, branches] = await branchService.get(props.orgID, props.projectID, options);

    // Set state
    if (err) setError(err);
    else if (branches) setData(branches[0]);
  };

  // on mount and whenever a new branch is passed in
  useEffect(() => {
    if (props.branch) {
      refreshBranch();
    }
  }, [props.branch, props.match.params.branchid]);


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
  if (props.permissions === 'admin') {
    isButtonDisplayed = true;
    titleClass = 'workspace-title';
  }

  // Populate relevant fields
  if (props.org) {
    id = props.org.id;
    custom = props.org.custom;
    const archived = (<Badge color='secondary' style={{ marginLeft: '10px' }}>Archived</Badge>);
    // Verify if archived org, then place badge on information page next to name
    name = (props.org.archived)
      ? (<div> {props.org.name} {archived} </div>)
      : (<div> {props.org.name} </div>);
  }
  else if (props.project) {
    const archived = (<Badge color='secondary' style={{ marginLeft: '10px' }}>Archived</Badge>);
    // Verify if archived project, then place badge on information page next to name
    name = (props.project.archived)
      ? (<div> {props.project.name} {' '} {archived} </div>)
      : (<div> {props.project.name} </div>);
    id = props.project.id;
    orgid = props.project.org;
    visibility = props.project.visibility;
    custom = props.project.custom;
  }
  else if (data) {
    const branch = data;
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
      <Modal isOpen={modal} toggle={handleToggle}>
        <ModalBody>
          {(props.project && !props.org)
            ? (<EditPage project={props.project}
                         orgid={props.project.org}
                         toggle={handleToggle}
                         refresh={props.refresh}/>)
            : (<EditPage org={props.org}
                         toggle={handleToggle}
                         refresh={props.refresh}/>)
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
                        onClick={handleToggle}>
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
                {(!props.branch)
                  ? <tr/>
                  : (<tr>
                      <th style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <Button close
                               aria-label='Filter'
                               size='sm' onClick={props.history.goBack}>
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
              {(props.project || props.branch)
                ? (<tr>
                    <th>Org ID:</th>
                    <td><Link to={`/orgs/${orgid}`}>{orgid}</Link></td>
                   </tr>)
                : <tr/>
              }
              {(!props.project)
                ? <tr/>
                : (<React.Fragment>
                    <tr>
                      <th>Visibility:</th>
                      <td>{visibility}</td>
                    </tr>
                  </React.Fragment>
                )
              }
              {(!props.branch)
                ? <tr/>
                : (<React.Fragment>
                    <tr>
                      <th>Project ID:</th>
                      <td>
                        <Link to={`/orgs/${orgid}/projects/${projid}/branches/master/elements`}>
                          {projid}
                        </Link>
                      </td>
                    </tr>
                    <tr>
                      <th>Name:</th>
                      <td>{branchName}</td>
                    </tr>
                    <tr>
                      <th>Source Branch:</th>
                      <td>
                        <Link to={`/orgs/${orgid}/projects/${projid}/branches/${sourceid}`}>
                          {sourceid}
                        </Link>
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

export default InformationPage;
