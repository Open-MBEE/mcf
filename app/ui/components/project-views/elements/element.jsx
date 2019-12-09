/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.element
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
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
import React, { Component } from 'react';

// MBEE modules
import {
  Modal,
  ModalBody,
  UncontrolledTooltip,
  Badge,
  Tooltip
} from 'reactstrap';
import Delete from '../../shared-views/delete.jsx';
import CustomData from '../../general/custom-data/custom-data.jsx';

/* eslint-enable no-unused-vars */

// Define component
class Element extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Set mounted variable
    this.mounted = false;

    // Initialize state props
    this.state = {
      element: null,
      modalDelete: false,
      isTooltipOpen: false,
      error: null
    };

    // Bind component functions
    this.getElement = this.getElement.bind(this);
    this.handleDeleteToggle = this.handleDeleteToggle.bind(this);
    this.handleTooltipToggle = this.handleTooltipToggle.bind(this);
    this.handleCrossRefs = this.handleCrossRefs.bind(this);
  }

  getElement() {
    // Initialize variables
    const elementId = this.props.id;

    if (elementId) {
      // Initalize variables
      const url = `${this.props.url}/elements/${elementId}?minified=true&includeArchived=true`;
      // Get project data
      $.ajax({
        method: 'GET',
        url: url,
        statusCode: {
          200: (element) => {
            this.handleCrossRefs(element)
            .then(elementChanged => {
              this.setState({ element: elementChanged });
            })
            .catch(err => {
              this.setState({ error: err });
            });
          },
          401: (err) => {
            // Throw error and set state
            this.setState({ error: err.responseText });

            // Refresh when session expires
            window.location.reload();
          },
          404: (err) => {
            this.setState({ error: err.responseText });
          }
        }
      });
    }
  }

  // Define toggle function
  handleDeleteToggle() {
    // Set the delete modal state
    this.setState({ modalDelete: !this.state.modalDelete });
  }

  componentDidMount() {
    // Set the mounted variable
    this.mounted = true;

    // Get element information
    this.getElement();
  }

  handleCrossRefs(_element) {
    return new Promise((resolve, reject) => {
      // Match/find all cross references
      const allCrossRefs = _element.documentation.match(/\[cf:[a-zA-Z0-9\-_]{0,}\]/g);

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

      // Make AJAX call to get names of cross-references elements ....
      const opts = [
        `ids=${ids}`,
        'format=jmi2',
        'fields=id,name,org,project,branch',
        'minified=true'
      ].join('&');
      $.ajax({
        method: 'GET',
        url: `${this.props.url}/elements/?${opts}`,
        statusCode: {
          200: (elements) => {
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
              const re = new RegExp(ref, 'g');

              // Capture the element ID and link
              const id = uniqCrossRefs[refs[i]].id;
              if (!elements.hasOwnProperty(id)) {
                doc = doc.replace(re, ` <a class="cross-ref-broken" href="#">${refs[i]}</a> `);
                continue;
              }
              const oid = elements[id].org;
              const pid = elements[id].project;
              const bid = elements[id].branch;
              const link = `/api/orgs/${oid}/projects/${pid}/branches/${bid}/elements/${id}`;
              doc = doc.replace(re, ` <a class="cross-ref" href="${link}">${elements[id].name}</a> `);
            }

            // Resolve the element
            const element = _element;
            element.documentation = doc;
            return resolve(element);
          },
          401: (err) => {
            reject(err.responseText);
            // Refresh when session expires
            window.location.reload();
          },
          404: (err) => reject(err.responseText)
        }
      });
    });
  }

  // Toggles the tooltip
  handleTooltipToggle() {
    const isTooltipOpen = this.state.isTooltipOpen;

    // Verify component is not unmounted
    if (!this.mounted) {
      return;
    }

    return this.setState({ isTooltipOpen: !isTooltipOpen });
  }

  componentDidUpdate(prevProps) {
    // Typical usage (don't forget to compare props):
    if (this.props.id !== prevProps.id) {
      this.getElement();
    }
  }

  componentWillUnmount() {
    // Set mounted variable
    this.mounted = false;
  }

  render() {
    let element;
    let orgid;
    let projid;
    let name;
    let custom;
    let target;
    let source;

    if (this.state.element) {
      element = this.state.element;
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
          <a href={`/orgs/${nameSpace.org}/projects/${nameSpace.project}/branches/${nameSpace.branch}/elements#${element.target}`}>
            <UncontrolledTooltip placement='top' target='target-elem'>
              {`${nameSpace.org} > ${nameSpace.project} > ${nameSpace.branch}`}
            </UncontrolledTooltip>
            <span id='target-elem'>
              {element.target}
            </span>
          </a>);
      }
      else {
        target = (<span>{element.target}</span>);
      }

      if (element.sourceNamespace) {
        const nameSpace = element.sourceNamespace;
        source = (
          <a href={`/orgs/${nameSpace.org}/projects/${nameSpace.project}/branches/${nameSpace.branch}/elements#${element.source}`}>
            <UncontrolledTooltip placement='top' target='source-elem'>
              {`${nameSpace.org} > ${nameSpace.project} > ${nameSpace.branch}`}
            </UncontrolledTooltip>
            <span id='source-elem'>
              {element.source}
            </span>
          </a>);
      }
      else {
        source = (<span>{element.source}</span>);
      }
    }

    // Render the sidebar with the links above
    return (
      <div className='element-panel-display'>
        {/* Modal for deleting an org */}
        <Modal isOpen={this.state.modalDelete} toggle={this.handleDeleteToggle}>
          <ModalBody>
            <Delete element={this.state.element}
                    closeSidePanel={this.props.closeSidePanel}
                    toggle={this.handleDeleteToggle}/>
          </ModalBody>
        </Modal>
        {(!this.state.element)
          ? <div className="loading"> {this.state.error || 'Loading your element...'} </div>
          : (<React.Fragment>
              <div className='element-data'>
                <div className='element-header'>
                  <h2>
                    Element Information
                    {(this.state.element.archived)
                      ? (<Badge style={{ marginLeft: '15px' }} color='secondary'>
                          Archived
                         </Badge>)
                      : ''
                    }
                  </h2>
                  <div className='side-icons'>
                    {((this.props.permissions === 'write') || this.props.permissions === 'admin')
                      ? (<React.Fragment>
                          <UncontrolledTooltip placement='left' target='deleteBtn'>
                            Delete
                          </UncontrolledTooltip>
                          <i id='deleteBtn' className='fas fa-trash-alt delete-btn' onClick={this.handleDeleteToggle}/>
                          <i id='editBtn' className='fas fa-edit edit-btn' onClick={this.props.editElementInfo}/>
                          <Tooltip
                            placement='left'
                            isOpen={this.state.isTooltipOpen}
                            target='editBtn'
                            toggle={this.handleTooltipToggle}>
                            Edit
                          </Tooltip>
                         </React.Fragment>)
                      : ''
                    }
                    <UncontrolledTooltip placement='left' target='exitBtn'>
                      Exit
                    </UncontrolledTooltip>
                    <i id='exitBtn' className='fas fa-times exit-btn' onClick={this.props.closeSidePanel}/>
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
                    <td><a href={`/orgs/${orgid}`}>{orgid}</a></td>
                  </tr>
                  <tr>
                    <th>Project ID:</th>
                    <td><a href={`/orgs/${orgid}/projects/${projid}/branches/master/elements`}>{projid}</a></td>
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
            </React.Fragment>
          )
        }
      </div>

    );
  }

}

// Export component
export default Element;
