/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.project-elements
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders a project's element page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';
import { Button } from 'reactstrap';

// MBEE Modules
import ElementTree from './element-tree.jsx';
import Element from './element.jsx';
import ElementEdit from './element-edit.jsx';
import ElementNew from './element-new.jsx';
import SidePanel from '../../general/side-panel.jsx';

/* eslint-enable no-unused-vars */

// Define component
class ProjectElements extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    this.state = {
      sidePanel: false,
      id: null,
      refreshFunction: null,
      treeRoot: null,
      error: null
    };

    this.openElementInfo = this.openElementInfo.bind(this);
    this.closeSidePanel = this.closeSidePanel.bind(this);
    this.editElementInfo = this.editElementInfo.bind(this);
    this.createNewElement = this.createNewElement.bind(this);
    this.getElement = this.getElement.bind(this);
  }

  createNewElement() {
    this.setState({
      sidePanel: 'addElement'
    });

    // Get the sidebar html element and toggle it
    document.getElementById('side-panel').classList.add('side-panel-expanded');
  }

  // Define the open and close of the element side panel function
  openElementInfo(id, refreshFunction) {
    // The currently selected element
    this.setState({ id: id, refreshFunction: refreshFunction });

    // Select the clicked element
    $('.element-tree').removeClass('tree-selected');
    $(`#tree-${id}`).addClass('tree-selected');

    if (this.state.sidePanel === 'addElement') {
      // do nothing
    }
    else {
      // Toggle the element side panel
      this.setState({ sidePanel: 'elementInfo' });
    }

    // Get the sidebar html element and toggle it
    document.getElementById('side-panel').classList.add('side-panel-expanded');
  }

  closeSidePanel(event, refresh, isDelete) {
    // Get the sidebar html element and toggle it
    document.getElementById('side-panel').classList.remove('side-panel-expanded');

    this.setState({ sidePanel: null });

    if (refresh) {
      this.state.refreshFunction(isDelete);
    }
  }

  editElementInfo() {
    this.setState({
      sidePanel: 'elementEdit'
    });

    // Get the sidebar html element and toggle it
    document.getElementById('side-panel').classList.add('side-panel-expanded');
  }

  getElement() {
    const orgId = this.props.project.org;
    const projId = this.props.project.id;
    const base = `/api/orgs/${orgId}/projects/${projId}/branches/master`;
    const url = `${base}/elements/model?fields=id,name,contains,type&minified=true`;

    $.ajax({
      method: 'GET',
      url: url,
      statusCode: {
        200: (data) => { this.setState({ treeRoot: data }); },
        401: () => {
          this.setState({ treeRoot: null });

          // Refresh when session expires
          window.location.reload();
        },
        403: (err) => {
          this.setState({ error: err.responseJSON.description });
        },
        404: (err) => {
          this.setState({ error: err.responseJSON.description });
        }
      }
    });
  }

  componentDidMount() {
    this.getElement();
  }

  render() {
    let isButtonDisplayed = false;
    let btnDisClassName = 'workspace-title workspace-title-padding';

    // Check admin/write permissions
    if (this.props.permissions === 'admin' || this.props.permissions === 'write') {
      isButtonDisplayed = true;
      btnDisClassName = 'workspace-title';
    }

    let sidePanelView = <Element id={this.state.id}
                                 project={this.props.project}
                                 url={this.props.url}
                                 permissions={this.props.permissions}
                                 editElementInfo={this.editElementInfo}
                                 closeSidePanel={this.closeSidePanel}/>;

    if (this.state.sidePanel === 'elementEdit') {
      sidePanelView = <ElementEdit id={this.state.id}
                                   url={this.props.url}
                                   closeSidePanel={this.closeSidePanel}
                                   selected={this.state.selected}/>;
    }

    else if (this.state.sidePanel === 'addElement') {
      sidePanelView = (<ElementNew id={'new-element'}
                                   parent={this.state.id}
                                   project={this.props.project}
                                   closeSidePanel={this.closeSidePanel}
                                   url={this.props.url}/>);
    }

    let tree = null;
    if (this.state.treeRoot !== null) {
      tree = <ElementTree id='model'
                          data={this.state.treeRoot}
                          project={this.props.project}
                          parent={null}
                          isOpen={true}
                          parentRefresh={this.getElement}
                          clickHandler={this.openElementInfo}/>;
    }

    // Return element list
    return (
      <div id='workspace'>
        <div id='workspace-header' className='workspace-header'>
          <h2 className={btnDisClassName}>{this.props.project.name} Model</h2>
          {(!isButtonDisplayed)
            ? ''
            : (<div id='workspace-header-btn' className='workspace-header-button ws-button-group'>
              <Button className='btn btn-sm'
                      outline color='primary'
                      onClick={this.createNewElement}>
                <i className='fas fa-plus'/>
                {' Add Element'}
              </Button>
            </div>)}
        </div>
        <div id='workspace-body'>
          <div id='element-tree-container' className='main-workspace'>
            {tree}
          </div>
          <SidePanel>
            { sidePanelView }
          </SidePanel>
        </div>
      </div>
    );
  }

}

// Export component
export default ProjectElements;
