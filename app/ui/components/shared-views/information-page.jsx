/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.shared-views.information-page
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders an organization or project home page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';
import { Button, Modal, ModalBody } from 'reactstrap';

// MBEE Modules
import EditPage from './edit-page.jsx';
import CustomData from '../general/custom-data/custom-data.jsx';

/* eslint-enable no-unused-vars */

class InformationPage extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      modal: false
    };

    // Bind component functions
    this.handleToggle = this.handleToggle.bind(this);
  }

  // Define toggle function
  handleToggle() {
    // Open or close modal
    this.setState({ modal: !this.state.modal });
  }

  render() {
    // Initialize variables
    let name;
    let id;
    let orgid = null;
    let custom;
    let isButtonDisplayed = false;
    let titleClass = 'workspace-title workspace-title-padding';

    // Check admin/write permissions
    if (this.props.permissions === 'admin') {
      isButtonDisplayed = true;
      titleClass = 'workspace-title';
    }


    if (this.props.org) {
      name = this.props.org.name;
      id = this.props.org.id;
      custom = this.props.org.custom;
    }
    else {
      name = this.props.project.name;
      id = this.props.project.id;
      orgid = this.props.project.org;
      custom = this.props.project.custom;
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
          <div id='workspace-header' className='workspace-header'>
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
                <tr>
                  <th>ID:</th>
                  <td>{id}</td>
                </tr>
                {(orgid === null)
                  ? <tr/>
                  : (<tr>
                    <th>Org ID:</th>
                    <td><a href={`/${orgid}`}>{orgid}</a></td>
                  </tr>)
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
