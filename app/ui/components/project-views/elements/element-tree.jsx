/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.element-tree
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the element tree in the project's page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';

/* eslint-enable no-unused-vars */

// Define component
class ElementTree extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    this.state = {
      id: props.id,
      isOpen: props.isOpen,
      data: props.data,
      children: null,
      modalEdit: false,
      elementWindow: false,
      isSelected: true,
      error: null
    };

    this.toggleCollapse = this.toggleCollapse.bind(this);
    this.handleElementToggle = this.handleElementToggle.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.refresh = this.refresh.bind(this);
  }

  handleElementToggle() {
    this.setState({ elementWindow: !this.state.elementWindow });
  }

  componentDidMount() {
    // Build URL to get element data
    const orgId = this.props.project.org;
    const projId = this.props.project.id;
    const contains = this.state.data.contains;
    const parent = this.state.data.id;
    if (contains === null || contains.length === 0) {
      return;
    }

    const elements = contains.join(',');

    const base = `/api/orgs/${orgId}/projects/${projId}/branches/master`;
    let url = `${base}/elements?ids=${elements}&fields=id,name,contains,type&minified=true`;
    if (url.length > 2047) {
      url = `${base}/elements?parent=${parent}&fields=id,name,contains,type&minified=true`;
    }

    $.ajax({
      method: 'GET',
      url: url,
      statusCode: {
        200: (data) => {
          const result = data.sort((a, b) => {
            if (!a.name) {
              return 1;
            }
            else if (!b.name) {
              return -1;
            }
            else {
              const first = a.name.toLowerCase();
              const second = b.name.toLowerCase();

              if (first === '__mbee__') {
                return -1;
              }
              else if ((second === '__mbee__') || (first > second)) {
                return 1;
              }
              else {
                return -1;
              }
            }
          });
          this.setState({ children: result });
        },
        401: (err) => {
          this.setState({ children: null });
          this.setState({ error: err.responseJSON.description });

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

  toggleCollapse() {
    this.setState({ isOpen: !this.state.isOpen });
  }


  componentDidUpdate(prevProps, prevStates) {
    // Verify if component needs to re-render
    if (this.state.data !== prevStates.data) {
      this.componentDidMount();
    }
  }

  /**
   * When an element is delete or created, the component
   * will update.
   */
  refresh(isDelete) {
    // Element is being deleted
    if (isDelete) {
      // Call parent refresh
      this.props.parentRefresh();
    }
    else {
      // Build URL to get element data
      const orgId = this.props.project.org;
      const projId = this.props.project.id;
      const base = `/api/orgs/${orgId}/projects/${projId}/branches/master`;
      const url = `${base}/elements/${this.state.id}?minified=true`;

      // Get project data
      $.ajax({
        method: 'GET',
        url: url,
        statusCode: {
          200: (data) => {
            this.setState({ data: data });
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

  /**
   * When an element is clicked, parses the ID and calls the passed in
   * click handler function.
   */
  handleClick() {
    const elementId = this.props.id.replace('tree-', '');
    this.props.clickHandler(elementId, this.refresh);
  }

  // Create the element tree list
  render() {
    // Initialize variables
    let elementIcon = (
      <i className={'fas fa-cube'}
         style={{ color: '#333' }}/>
    );
    let expandIcon = 'fa-caret-right transparent';
    const subtree = [];

    // If the element contains other elements, handle the subtree
    if (this.state.data !== null
            && Array.isArray(this.state.data.contains)
            && this.state.data.contains.length >= 1) {
      // Icon should be chevron to show subtree is collapsible
      expandIcon = (this.state.isOpen) ? 'fa-caret-down' : 'fa-caret-right';

      // Create Subtrees
      if (this.state.children !== null) {
        for (let i = 0; i < this.state.children.length; i++) {
          subtree.push(
            <ElementTree key={`tree-${this.state.children[i].id}`}
                         id={`${this.state.children[i].id}`}
                         data={this.state.children[i]}
                         project={this.props.project}
                         parent={this.state}
                         parentRefresh={this.refresh}
                         clickHandler={this.props.clickHandler}
                         isOpen={false}/>
          );
        }
      }
    }

    // Build the rendered element item
    let element = '';
    if (this.state.data !== null) {
      // Element should be rendered as the ID initially
      element = (
        <span className={'element-id'}>
           {this.state.data.id} : {this.state.data.type}
        </span>
      );
      // If the name is not blank, render the name
      if (this.state.data.name !== '') {
        element = (
          <span>
            {this.state.data.name}
            <span className={'element-id'}>({this.state.data.id} : {this.state.data.type})</span>
          </span>
        );
      }
    }

    const iconMappings = {
      Package: {
        icon: (this.state.isOpen) ? 'folder-open' : 'folder',
        color: 'lightblue'
      },
      package: {
        icon: (this.state.isOpen) ? 'folder-open' : 'folder',
        color: 'lightblue'
      },
      'uml:Package': {
        icon: (this.state.isOpen) ? 'folder-open' : 'folder',
        color: 'lightblue'
      },
      Diagram: {
        icon: 'sitemap',
        color: 'lightgreen'
      },
      diagram: {
        icon: 'sitemap',
        color: 'lightgreen'
      },
      'uml:Diagram': {
        icon: 'sitemap',
        color: 'lightgreen'
      },
      'uml:Association': {
        icon: 'arrows-alt-h',
        color: '#333333'
      },
      'uml:Slot': {
        icon: 'circle',
        color: 'MediumPurple'
      },
      'uml:Property': {
        icon: 'circle',
        color: 'Gold'
      }
    };
    if (this.state.data !== null
      && iconMappings.hasOwnProperty(this.state.data.type)) {
      const icon = iconMappings[this.state.data.type].icon;
      const color = iconMappings[this.state.data.type].color;
      elementIcon = (
        <i className={`fas fa-${icon}`}
           style={{ color: color }}/>
      );
    }

    return (
      <div id={`tree-${this.props.id}`}
           className={(this.props.parent) ? 'element-tree' : 'element-tree element-tree-root'}>
        <i className={`fas ${expandIcon}`}
           onClick={this.toggleCollapse}>
        </i>
        <span className='element-name' onClick={this.handleClick}>
          {elementIcon}
          {element}
        </span>
        {(this.state.isOpen) ? (<div>{subtree}</div>) : ''}
      </div>
    );
  }

}

// Export component
export default ElementTree;
