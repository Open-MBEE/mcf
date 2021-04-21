/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.home-views.home
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the homepage.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useEffect, useRef, useState } from 'react';
import { Button, InputGroup, Modal, ModalBody } from 'reactstrap';

// MBEE modules
import List from '../general/list/list.jsx';
import OrgList from '../home-views/org-list.jsx';
import Create from '../shared-views/create.jsx';
import Delete from '../shared-views/delete.jsx';
import { useApiClient } from '../context/ApiClientProvider.js';

/* eslint-enable no-unused-vars */

// Define HomePage Component
function Home(props) {
  const { orgService } = useApiClient();
  const [width, setWidth] = useState(null);
  const [modalCreate, setModalCreate] = useState(false);
  const [modalDelete, setModalDelete] = useState(false);
  const [user, setUser] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [admin, setAdmin] = useState(false);
  const [write, setWrite] = useState(false);
  const [displayOrgs, setDisplayOrgs] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState(null);
  const homeRef = useRef();

  const setMountedComponentStates = (userData, orgData) => {
    // Initialize variables
    let writePermOrgs = [];

    if (!userData.admin) {
      // Loop through orgs
      orgData.forEach((org) => {
        // Initialize variables
        const perm = org.permissions[userData.username];

        // Verify if user has write or admin permissions
        if ((perm === 'write') || (perm === 'admin')) {
          // Push the org to the org permissions
          writePermOrgs.push(org);
        }
      });
    }
    else if (userData.admin) {
      writePermOrgs = orgs;
    }

    // Verify there are orgs
    if (writePermOrgs.length > 0) {
      // Set write states
      setWrite(true);
    }

    // Verify user is admin
    if (userData.admin) {
      // Set admin state
      setAdmin(userData.admin);
    }

    const display = {};

    orgData.forEach((org) => {
      display[org.id] = true;
    });

    // Set the org state
    setOrgs(orgData);
    setDisplayOrgs(display);
  };

  const handleResize = () => {
    // Set state to width of window
    setWidth(homeRef.current.clientWidth);
  };

  const handleDeleteToggle = () => {
    setModalDelete((currentState) => !currentState);
  };

  const handleCreateToggle = () => {
    setModalCreate((currentState) => !currentState);
  };

  const onExpandChange = (orgID, value) => {
    setDisplayOrgs((currentState) => ({
      ...currentState,
      [orgID]: value
    }));
  };

  const handleExpandCollapse = (e) => {
    const name = e.target.name;
    const expanded = (name === 'expand');

    setDisplayOrgs((currentState) => {
      const newState = {
        ...currentState
      };
      Object.keys(newState).forEach((org) => {
        newState[org] = expanded;
      });
      return newState;
    });
  };

  const refresh = () => {
    // eslint-disable-next-line no-undef
    mbeeWhoAmI(async (err, data) => {
      if (err) {
        setError(err);
      }
      else {
        setUser(data);

        // Set options for org request
        const options = {
          populate: 'projects',
          includeArchived: true
        };

        // Make request for org data
        const [orgErr, orgData] = await orgService.get(options);

        // Set the state
        if (orgErr) setError(orgErr);
        else if (orgData) setMountedComponentStates(data, orgData);
      }
    });
  };

  // on mount
  useEffect(() => {
    // Add event listener for window resizing
    window.addEventListener('resize', handleResize);
    // Handle initial size of window
    handleResize();

    // Perform initial data loading
    refresh();

    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // Initialize variables
  let titleClass = 'workspace-title workspace-title-padding';
  const list = [];

  // Loop through all orgs
  if (orgs.length > 0) {
    orgs.forEach((org) => {
      const username = user.username;

      const showProj = (displayOrgs[org.id]);

      // Verify if system admin
      if (!user.admin) {
        // Verify admin permission on org
        if (org.permissions[username] === 'admin') {
          list.push(<OrgList org={org} key={`org-key-${org.id}`}
                             user={user}
                             write={write}
                             admin={admin}
                             showProjs={showProj}
                             onExpandChange={onExpandChange}
                             refresh={refresh}/>);
        }
        // Verify write permissions and not archived org
        else if (org.permissions[username] === 'write' && !org.archived) {
          list.push(<OrgList org={org} key={`org-key-${org.id}`}
                             user={user}
                             write={write}
                             admin={admin}
                             showProjs={showProj}
                             onExpandChange={onExpandChange}
                             refresh={refresh}/>);
        }
        // Verify read permissions and not archived org
        else if (org.permissions[username] === 'read' && !org.archived) {
          list.push(<OrgList org={org} key={`org-key-${org.id}`}
                             user={user}
                             admin={admin}
                             showProjs={showProj}
                             onExpandChange={onExpandChange}
                             refresh={refresh}/>);
        }
      }
      else {
        list.push(<OrgList org={org} key={`org-key-${org.id}`}
                           user={user}
                           write={write}
                           admin={admin}
                           showProjs={showProj}
                           onExpandChange={onExpandChange}
                           refresh={refresh}/>);
      }
    });
  }

  // Verify user is admin
  if (admin) {
    // Change class on title
    titleClass = 'workspace-title';
  }

  // Render the homepage
  return (
    <React.Fragment>
      { /* Modal for creating an org */ }
      <Modal isOpen={modalCreate} toggle={handleCreateToggle}>
        <ModalBody>
          <Create toggle={handleCreateToggle}/>
        </ModalBody>
      </Modal>
      { /* Modal for deleting an org */ }
      <Modal isOpen={modalDelete} toggle={handleDeleteToggle}>
        <ModalBody>
          <Delete orgs={orgs} toggle={handleDeleteToggle} refresh={refresh}/>
        </ModalBody>
      </Modal>
      { /* Display the list of projects */ }
      <div className='home-space' ref={homeRef}>
        <div className='workspace-header home-header'>
          <h2 className={titleClass}>Organizations</h2>
          { /* Verify user is an admin */ }
          {(!admin)
            ? ''
            // Display create and delete buttons
            : (
              <div className='workspace-header-button'>
                <Button className='btn'
                        outline color='secondary'
                        onClick={handleCreateToggle}>
                  {/* Verify width of window */}
                  {(width > 600)
                    ? 'Create'
                    : (<i className='fas fa-plus add-btn'/>)
                  }
                </Button>
                <Button className='btn'
                        outline color="danger"
                        onClick={handleDeleteToggle}>
                  {(width > 600)
                    ? 'Delete'
                    : (<i className='fas fa-trash-alt delete-btn'/>)
                  }
                </Button>
              </div>
            )
          }
        </div>
        { /* Expand/Collapse Projects */ }
        <InputGroup id='grp-expand-collapse'>
          <Button id='btn-expand'
                  type='button'
                  name='expand'
                  onClick={handleExpandCollapse}>
            [ Expand ]
          </Button>
          <Button id='btn-collapse'
                  type='button'
                  name='collapse'
                  onClick={handleExpandCollapse}>
            [ Collapse ]
          </Button>
        </InputGroup>
        { /* Verify there are projects */ }
        <div className='extra-padding'>
          {(orgs.length === 0)
            ? (<div className='list-item'><h3> No organizations.</h3></div>)
            : (<List>{list}</List>)
          }
        </div>
      </div>
    </React.Fragment>
  );
}

export default Home;
