/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.element-tree
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 * @author Josh Kaplan
 * @author James Eckstein
 *
 * @description This the element tree wrapper, grabbing the
 * root model element and then pushing to the subtree to
 * create the elements.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect, useRef } from 'react';

// MBEE modules
import ElementSubtree from './element-subtree.jsx';
import { useApiClient } from '../../context/ApiClientProvider';

/* eslint-enable no-unused-vars */

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

/**
 * @description The Element Tree component.
 *
 * @param {object} props - React props.
 * @returns {Function} - Returns JSX.
 */
export default function ElementTree(props) {
  const { elementService } = useApiClient();
  const [treeRoot, setTreeRoot] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState(null);

  const prevProject = usePrevious(props.project);
  const prevBranchID = usePrevious(props.branchID);

  const orgID = props.project.org;
  const projID = props.project.id;
  const branchID = props.branchID;

  /**
   * @description This is also considered the refresh function for root
   * element. When an element is deleted or created the
   * elements will be updated.
   */
  const getElement = async () => {
    const options = {
      ids: 'model',
      fields: 'id,name,contains,type,archived',
      includeArchived: true
    };

    const [err, elements] = await elementService.get(orgID, projID, branchID, options);

    if (err) setError(err);
    else if (elements) setTreeRoot(elements[0]);
  };

  // Run on mount and if the project is changed
  useEffect(() => {
    if (props.project !== prevProject || props.branchID !== prevBranchID) {
      getElement();
    }
  }, [props.project, props.branchID]);


  let tree = null;

  if (treeRoot !== null) {
    tree = <ElementSubtree id='model'
                           data={treeRoot}
                           project={props.project}
                           branchID={props.branchID}
                           parent={null}
                           archived={props.archived}
                           setRefreshFunctions={props.setRefreshFunctions}
                           displayIds={props.displayIds}
                           expand={props.expand}
                           collapse={props.collapse}
                           linkElements={props.linkElements}
                           parentRefresh={getElement}
                           unsetCheckbox={props.unsetCheckbox}
                           handleCheck={props.handleCheck}
                           clickHandler={props.clickHandler}/>;
  }

  // Return element list
  return (
    <div id='element-tree-container'>
      {tree}
    </div>
  );
}
