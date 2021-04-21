/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.element
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the element information side panel.
 * Displaying the information on an element selected from the tree.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// MBEE modules
import {
  Modal,
  ModalBody,
  UncontrolledTooltip,
  Badge
} from 'reactstrap';
import Delete from '../../shared-views/delete.jsx';
import CustomData from '../../general/custom-data/custom-data.jsx';
import { useElementContext } from '../../context/ElementProvider.js';
import { useApiClient } from '../../context/ApiClientProvider';

/* eslint-enable no-unused-vars */

/**
 * @description The Element component.
 *
 * @param {object} props - React props.
 * @returns {Function} - Returns JSX.
 */
export default function Element(props) {
  const { elementService } = useApiClient();
  const [element, setElement] = useState(null);
  const [modalDelete, setModalDelete] = useState(null);
  const [error, setError] = useState(null);

  const { elementID, providedElement } = useElementContext();

  const orgID = props.orgID;
  const projID = props.projectID;
  const branchID = props.branchID;

  // eslint-disable-next-line arrow-body-style
  const handleCrossRefs = (_element) => {
    return new Promise(async (resolve, reject) => {
      // Match/find all cross references
      const allCrossRefs = _element.documentation.match(/\[cf:[a-zA-Z0-9\-_]*\]/g);

      // If no cross refs, resolve the element with no changes
      if (!allCrossRefs || allCrossRefs.length === 0) {
        return resolve(_element);
      }

      // Make into an object for a uniqueness
      const uniqCrossRefs = {};
      allCrossRefs.forEach(xr => {
        const ref = xr.replace('cf:', '').slice(1, -1);
        uniqCrossRefs[xr] = { id: ref };
      });

      // Get a list of IDs from the cross-references
      const uniqCrossRefsValues = Object.values(uniqCrossRefs);
      const ids = uniqCrossRefsValues.map(xr => xr.id);

      // Make call to get names of cross-references elements ....
      const options = {
        ids: ids,
        format: 'jmi2',
        fields: 'id,name,org,project,branch'
      };

      const [err, elements] = await elementService.get(orgID, projID, branchID, options);

      if (err === 'No elements found.') {
        resolve(_element);
      }
      else if (err) {
        reject(err);
      }
      else if (elements) {
        // Keep track of documentation fields
        // and cross reference text
        let doc = _element.documentation;
        const refs = Object.keys(uniqCrossRefs);

        // Loop over cross refs list and replace each occurrence of that
        // cross-ref in the documentation fields
        for (let i = 0; i < refs.length; i++) {
          // Get the ref, replacing special characters for use in regex
          const ref = refs[i]
          .replace('[', '\\[')
          .replace(']', '\\]')
          .replace('-', '\\-');
          // Create the regex for replacement
          const re = new RegExp(ref, 'g'); // eslint-disable-line security/detect-non-literal-regexp

          // Capture the element ID and link
          const id = uniqCrossRefs[refs[i]].id;
          if (!elements.hasOwnProperty(id)) {
            doc = doc.replace(re, `<Link class='cross-ref-broken' to='#'>${refs[i]}</Link>`);
            continue;
          }
          const oid = elements[id].org;
          const pid = elements[id].project;
          const bid = elements[id].branch;
          const link = `/orgs/${oid}/projects/${pid}/branches/${bid}/elements#${id}`;
          doc = doc.replace(re, `<Link class='cross-ref' to='${link}' target='_blank'>${elements[id].name}</Link>`);
        }

        // Resolve the element
        const elem = _element;
        elem.documentation = doc;
        return resolve(elem);
      }
    });
  };

  const getElement = async () => {
    const options = {
      ids: elementID,
      includeArchived: true
    };

    // Get element data
    const [err, elements] = await elementService.get(orgID, projID, branchID, options);

    // Set the state
    if (err) {
      setError(err);
    }
    else if (elements) {
      // Get cross references if they exist
      handleCrossRefs(elements[0])
      .then(elementChanged => {
        setElement(elementChanged);
      })
      .catch(xrefErr => {
        setError(xrefErr);
      });
    }
  };

  const useProvidedElement = () => {
    handleCrossRefs(providedElement)
    .then((e) => setElement(e))
    .catch(xrefErr => setError(xrefErr));
  };

  // Define toggle function
  const handleDeleteToggle = () => {
    // Set the delete modal state
    setModalDelete((currentState) => !currentState);
  };

  // Run on mount and whenever the element of interest changes
  useEffect(() => {
    if (elementID) getElement();
    else if (providedElement) useProvidedElement();
  }, [elementID, providedElement]);


  let orgid;
  let projid;
  let name;
  let custom;
  let target;
  let source;

  if (element) {
    orgid = element.org;
    projid = element.project;
    custom = element.custom;
    name = element.name;

    if (element.name !== null) {
      name = element.name;
    }
    else {
      name = element.id;
    }

    if (element.targetNamespace) {
      const nameSpace = element.targetNamespace;
      target = (
        <Link to={`/orgs/${nameSpace.org}/projects/${nameSpace.project}/branches/${nameSpace.branch}/elements#${element.target}`}>
          <UncontrolledTooltip placement='top' target='target-elem'>
            {`${nameSpace.org} > ${nameSpace.project} > ${nameSpace.branch}`}
          </UncontrolledTooltip>
          <span id='target-elem'>
            {element.target}
          </span>
        </Link>);
    }
    else {
      target = (<span>{element.target}</span>);
    }

    if (element.sourceNamespace) {
      const nameSpace = element.sourceNamespace;
      source = (
        <Link to={`/orgs/${nameSpace.org}/projects/${nameSpace.project}/branches/${nameSpace.branch}/elements#${element.source}`}>
          <UncontrolledTooltip placement='top' target='source-elem'>
            {`${nameSpace.org} > ${nameSpace.project} > ${nameSpace.branch}`}
          </UncontrolledTooltip>
          <span id='source-elem'>
            {element.source}
          </span>
        </Link>);
    }
    else {
      source = (<span>{element.source}</span>);
    }
  }

  // Render the sidebar with the links above
  return (
    <div className='element-panel-display'>
      {/* Modal for deleting an element */}
      <Modal isOpen={modalDelete} toggle={handleDeleteToggle}>
        <ModalBody>
          <Delete element={element}
                  closeSidePanel={props.closeSidePanel}
                  toggle={handleDeleteToggle}/>
        </ModalBody>
      </Modal>
      {(element)
        ? <div className='element-data'>
          <div className='element-header'>
            <h2>
              Element Information
              {(element.archived)
                ? (<Badge style={{ marginLeft: '15px' }} color='secondary'>
                  Archived
                </Badge>)
                : ''
              }
            </h2>
            <div className='side-icons'>
              {((props.permissions === 'write') || props.permissions === 'admin')
                ? (<React.Fragment>
                  <UncontrolledTooltip placement='left' target='deleteBtn'>
                    Delete
                  </UncontrolledTooltip>
                  <i id='deleteBtn' className='fas fa-trash-alt delete-btn' onClick={handleDeleteToggle}/>
                  <i id='editBtn' className='fas fa-edit edit-btn' onClick={props.toggle}/>
                  <UncontrolledTooltip placement='left' target='editBtn'>
                    Edit
                  </UncontrolledTooltip>
                </React.Fragment>)
                : ''
              }
              <UncontrolledTooltip placement='left' target='exitBtn'>
                Exit
              </UncontrolledTooltip>
              <i id='exitBtn' className='fas fa-times exit-btn' onClick={props.closeSidePanel}/>
            </div>
          </div>
          <table className='table-width'>
            <tbody>
            <tr>
              <th>Name:</th>
              <td>{name}</td>
            </tr>
            <tr>
              <th>ID:</th>
              <td>{element.id}</td>
            </tr>
            <tr>
              <th>Parent:</th>
              <td>{element.parent}</td>
            </tr>
            <tr>
              <th>Type:</th>
              <td>{element.type}</td>
            </tr>
            {(!element.target || !element.source)
              ? <tr/>
              : (<React.Fragment>
                  <tr>
                    <th>Target:</th>
                    <td>{target}</td>
                  </tr>
                  <tr>
                    <th>Source:</th>
                    <td>{source}</td>
                  </tr>
                </React.Fragment>
              )
            }
            <tr>
              <th>Documentation:</th>
              <td>
                <div dangerouslySetInnerHTML={{ __html: element.documentation }}>
                </div>
              </td>
            </tr>
            <tr>
              <th>Org ID:</th>
              <td><Link to={`/orgs/${orgid}`}>{orgid}</Link></td>
            </tr>
            <tr>
              <th>Project ID:</th>
              <td><Link to={`/orgs/${orgid}/projects/${projid}/branches/master/elements`}>{projid}</Link></td>
            </tr>
            <tr>
              <th>Last Modified By:</th>
              <td>{element.lastModifiedBy}</td>
            </tr>
            <tr>
              <th>Updated On:</th>
              <td>{element.updatedOn}</td>
            </tr>
            </tbody>
          </table>
          <CustomData data={custom}/>
        </div>
        : <div className="loading"> {error || 'Loading your element...'} </div>
      }
    </div>
  );
}
