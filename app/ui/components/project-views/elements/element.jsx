/**
* Classification: UNCLASSIFIED
*
* @module ui.components.project-views.elements.element
*
* @copyright Copyright (C) 2018, Lockheed Martin Corporation
*
* @license MIT
*
* @description This renders the sidebar.
*/

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';

// MBEE Modules
import { Modal, ModalBody, UncontrolledTooltip } from 'reactstrap';
import Delete from '../../shared-views/delete.jsx';
import CustomData from '../../general/custom-data/custom-data.jsx';

/* eslint-enable no-unused-vars */

// Define component
class Element extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      element: null,
      modalDelete: false,
      error: null
    };

    // Bind component functions
    this.getElement = this.getElement.bind(this);
    this.handleDeleteToggle = this.handleDeleteToggle.bind(this);
  }

  getElement() {
    // Initialize variables
    const elementId = this.props.id;

    if (elementId) {
      // Initalize variables
      const url = `${this.props.url}/branches/master/elements/${elementId}?minified=true`;
      // Get project data
      $.ajax({
        method: 'GET',
        url: url,
        statusCode: {
          200: (element) => {
            this.setState({ element: element });
          },
          401: (err) => {
            // Throw error and set state
            this.setState({ error: err.responseJSON.description });

            // Refresh when session expires
            window.location.reload();
          },
          404: (err) => {
            this.setState({ error: err.responseJSON.description });
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
    this.getElement();
  }

  componentDidUpdate(prevProps) {
    // Typical usage (don't forget to compare props):
    if (this.props.id !== prevProps.id) {
      this.getElement();
    }
  }

  render() {
    let element;
    let orgid;
    let projid;
    let name;
    let custom;

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
                  </h2>
                  <div className='side-icons'>
                    {((this.props.permissions === 'write') || this.props.permissions === 'admin')
                      ? (<React.Fragment>
                          <UncontrolledTooltip placement='left' target='deleteBtn'>
                            Delete
                          </UncontrolledTooltip>
                          <i id='deleteBtn' className='fas fa-trash-alt delete-btn' onClick={this.handleDeleteToggle}/>
                          <UncontrolledTooltip placement='left' target='editBtn'>
                            Edit
                          </UncontrolledTooltip>
                          <i id='editBtn' className='fas fa-edit edit-btn' onClick={this.props.editElementInfo}/>
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
                          <td>{element.target}</td>
                        </tr>
                        <tr>
                          <th>Source:</th>
                          <td>{element.target}</td>
                        </tr>
                      </React.Fragment>
                    )
                  }
                  <tr>
                    <th>Documentation:</th>
                    <td>{element.documentation}</td>
                  </tr>
                  <tr>
                    <th>Org ID:</th>
                    <td><a href={`/${orgid}`}>{orgid}</a></td>
                  </tr>
                  <tr>
                    <th>Project ID:</th>
                    <td><a href={`/${orgid}/${projid}`}>{projid}</a></td>
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
