/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.admin-console-views.organization-list
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 * @author Jake Ursetta
 *
 * @description This renders the orgs list for the admin console.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect, useRef } from 'react';
import { Button, Modal, ModalBody } from 'reactstrap';

// MBEE modules
import List from '../general/list/list.jsx';
import OrgListItem from '../shared-views/list-items/org-list-item.jsx';
import Create from '../shared-views/create.jsx';
import Delete from '../shared-views/delete.jsx';
import { useApiClient } from '../context/ApiClientProvider';

/* eslint-enable no-unused-vars */

// Define component
function OrganizationList(props) {
  const { orgService } = useApiClient();
  const [width, setWidth] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [modalCreate, setModalCreate] = useState(false);
  const [modalDelete, setModalDelete] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState(null);

  const ref = useRef();

  const handleCreateToggle = () => {
    setModalCreate((prevState) => !prevState);
  };

  const handleDeleteToggle = () => {
    setModalDelete((prevState) => !prevState);
  };

  const handleResize = () => {
    // Set state to width of window
    setWidth(ref.current.clientWidth);
  };

  const refresh = () => {
    // eslint-disable-next-line no-undef
    mbeeWhoAmI(async (err, data) => {
      // Verify if error returned
      if (err) {
        // Set error state
        setError(err.responseText);
      }
      else {
        // Get org data
        const options = {
          populate: 'projects',
          includeArchived: true
        };
        const [err2, orgData] = await orgService.get(options);

        // Set state
        if (err2) setError(err2);
        else if (orgData) setOrgs(orgData);
      }
    });
  };

  // on mount
  useEffect(() => {
    // Create event listener for window resizing
    window.addEventListener('resize', handleResize);
    // Handle initial size of window
    handleResize();

    // Set initial state
    refresh();

    // clean up the event listener
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // Loop through all orgs
  const orgList = orgs.map(org => <OrgListItem className='hover-darken' key={`org-key-${org.id}`} org={org} link={`/orgs/${org.id}`}/>);

  // Return org list
  return (
    <React.Fragment>
      {/* Modal for creating an org */}
      <Modal isOpen={modalCreate} toggle={handleCreateToggle}>
        <ModalBody>
          <Create toggle={handleCreateToggle}/>
        </ModalBody>
      </Modal>
      {/* Modal for deleting an org */}
      <Modal isOpen={modalDelete} toggle={handleDeleteToggle}>
        <ModalBody>
          <Delete orgs={orgs}
                  toggle={handleDeleteToggle}
                  refresh={refresh}/>
        </ModalBody>
      </Modal>
      {/* Display the list of orgs */}
      <div id='workspace' ref={ref}>
        <div className='workspace-header header-box-depth'>
          <h2 className='workspace-title workspace-title-padding'>
            Organizations
          </h2>
            <div className='workspace-header-button'>
              <Button className='btn'
                      outline color="primary"
                      onClick={handleCreateToggle}>
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
        </div>
        {/* Verify there are orgs */}
        <div id='workspace-body' className='extra-padding'>
          {(orgs.length === 0)
            ? (<div className='main-workspace list-item'>
                <h3> No organizations. </h3>
               </div>)
            : (<List className='main-workspace'>
                {orgList}
               </List>)
          }
        </div>
      </div>
    </React.Fragment>
  );
}

// Export component
export default OrganizationList;
