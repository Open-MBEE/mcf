/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.project-elements
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 * @author Josh Kaplan
 *
 * @description This renders a project's element page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { useState, useEffect } from 'react';
import { Button, Modal, ModalBody } from 'reactstrap';

// MBEE modules
import ElementTree from './element-tree.jsx';
import Element from './element.jsx';
import ElementNew from './element-new.jsx';
import SidePanel from '../../general/side-panel.jsx';
import BranchBar from '../branches/branch-bar.jsx';
import ElementEditForm from './element-edit-form.jsx';
import { useElementContext } from '../../context/ElementProvider.js';

/* eslint-enable no-unused-vars */

/**
 * @description The Project Elements component.
 *
 * @param {object} props - React props.
 * @returns {Function} - Returns JSX.
 */
export default function ProjectElements(props) {
  const [state, setState] = useState({
    archived: false,
    displayIds: true,
    expand: false,
    collapse: false
  });
  const [refreshFunctions, setRefreshFunction] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [sidePanel, setSidePanel] = useState(false);

  const { elementID, setElementID } = useElementContext();

  const setRefreshFunctions = (id, refreshFunction) => {
    setRefreshFunction((prevState) => ({
      ...prevState,
      [id]: refreshFunction
    }));
  };

  const createNewElement = () => {
    setSidePanel('addElement');

    // Get the sidebar html element and toggle it
    document.getElementById('side-panel').classList.add('side-panel-expanded');
  };

  // Define the open and close of the element side panel function
  const openElementInfo = (id) => {
    // Select the clicked element
    $('.element-tree').removeClass('tree-selected');
    $(`#tree-${id}`).addClass('tree-selected');

    // Toggle the element side panel
    setElementID(id);
    setSidePanel('elementInfo');

    // Get the sidebar html element and toggle it
    document.getElementById('side-panel').classList.add('side-panel-expanded');
  };

  const closeSidePanel = (event, refreshIDs) => {
    // Get the sidebar html element and toggle it
    document.getElementById('side-panel').classList.remove('side-panel-expanded');

    setSidePanel(null);

    if (refreshIDs) {
      refreshIDs.forEach((id) => {
        if (refreshFunctions.hasOwnProperty(id)) {
          refreshFunctions[id]();
        }
      });
    }
  };

  const editElementInfo = () => {
    setSidePanel('elementEdit');

    // Get the sidebar html element and toggle it
    document.getElementById('side-panel').classList.add('side-panel-expanded');
  };

  const handleCheck = (event) => {
    const checkbox = event.target.name;

    setState((prevState) => {
      const newState = {
        ...prevState
      };
      // Set new state to opposite of previous value
      newState[checkbox] = !prevState[checkbox];

      // Set collapse to false if expand is checked and vice versa
      if (checkbox === 'expand') {
        newState.collapse = false;
      }
      else if (checkbox === 'collapse') {
        newState.expand = false;
      }
      return newState;
    });
  };

  const unsetCheckbox = () => {
    setState((currentState) => {
      currentState.collapse = false;
      currentState.expand = false;
      return currentState;
    });
  };

  const toggleModal = () => {
    setModalOpen((prevState) => !prevState);
  };

  useEffect(() => {
    if (props.location.hash) {
      const elementid = props.location.hash.replace('#', '');
      openElementInfo(elementid);
    }
  }, []);


  let isButtonDisplayed = false;
  let btnDisClassName = 'workspace-title workspace-title-padding';
  const orgID = props.project.org;
  const projID = props.project.id;
  const branchID = props.match.params.branchid;

  // Check admin/write permissions
  if (props.permissions === 'admin' || props.permissions === 'write') {
    isButtonDisplayed = true;
    btnDisClassName = 'workspace-title';
  }

  let sidePanelView = <Element orgID={orgID}
                               projectID={projID}
                               branchID={branchID}
                               permissions={props.permissions}
                               editElementInfo={editElementInfo}
                               closeSidePanel={closeSidePanel}
                               toggle={toggleModal}/>;

  if (sidePanel === 'addElement') {
    sidePanelView = (<ElementNew id={'new-element'}
                                 parent={elementID}
                                 orgID={orgID}
                                 projectID={projID}
                                 branchID={branchID}
                                 project={props.project}
                                 closeSidePanel={closeSidePanel}/>);
  }

  // Return element list
  return (
    <div id='workspace'>
      <Modal isOpen={modalOpen}>
        <ModalBody>
          <ElementEditForm toggle={toggleModal}
                           modal={modalOpen}
                           customData={props.project.custom}
                           archived={props.project.archived}
                           project={props.project}
                           branchID={branchID}
                           closeSidePanel={closeSidePanel}
                           refreshFunctions={refreshFunctions}>
          </ElementEditForm>
        </ModalBody>
      </Modal>
      <div className='workspace-header header-box-depth'>
        <h2 className={btnDisClassName}>{props.project.name} Model</h2>
        {(!isButtonDisplayed)
          ? ''
          : (<div className='workspace-header-button'>
            <Button className='btn'
                    outline color='primary'
                    onClick={createNewElement}>
              Add Element
            </Button>
          </div>)}
      </div>
      <div id='workspace-body'>
        <div className='main-workspace'>
          <BranchBar project={props.project}
                     branchid={branchID}
                     archived={state.archived}
                     endpoint='/elements'
                     permissions={props.permissions}
                     displayIds={state.displayIds}
                     expand={state.expand}
                     collapse={state.collapse}
                     handleCheck={handleCheck}/>
          <ElementTree project={props.project}
                       branchID={branchID}
                       linkElements={true}
                       archived={state.archived}
                       displayIds={state.displayIds}
                       expand={state.expand}
                       collapse={state.collapse}
                       unsetCheckbox={unsetCheckbox}
                       handleCheck={handleCheck}
                       setRefreshFunctions={setRefreshFunctions}
                       clickHandler={openElementInfo}/>
        </div>
        <SidePanel>
          { sidePanelView }
        </SidePanel>
      </div>
    </div>
  );
}
