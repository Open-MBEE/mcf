/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.element-subtree
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 * @author Josh Kaplan
 * @author James Eckstein
 *
 * @description This renders the elements in the element
 * tree in the project's page.
 */
/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
import { Link } from 'react-router-dom';


/* eslint-enable no-unused-vars */

// Define component
class ElementSubtree extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      id: props.id,
      isOpen: false,
      data: props.data,
      children: null,
      elementWindow: false,
      isSelected: true,
      error: null
    };

    if (props.id === 'model') {
      this.state.isOpen = true;
    }
    else if (props.expand) {
      this.state.isOpen = true;
    }
    else if (props.collapse) {
      this.state.isOpen = false;
    }

    // Bind functions
    this.toggleCollapse = this.toggleCollapse.bind(this);
    this.handleElementToggle = this.handleElementToggle.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.refresh = this.refresh.bind(this);
  }

  /**
   * @description Toggle the element sub tree.
   */
  handleElementToggle() {
    this.setState({ elementWindow: !this.state.elementWindow });
  }

  componentDidMount() {
    // Verify setRefreshFunction is not null
    if (this.props.setRefreshFunctions) {
      // Provide refresh function to top parent component
      this.props.setRefreshFunctions(this.state.id, this.refresh);
    }

    // Build URL to get element data
    const contains = this.state.data.contains;
    const parent = this.state.data.id;
    // Verify element does not have children
    if (contains === null || contains.length === 0) {
      // Skip ajax call for children
      return;
    }
    const elements = contains.join(',');
    const base = this.props.url;
    let url = `${base}/elements?ids=${elements}&fields=id,name,contains,archived,type&minified=true&includeArchived=true`;
    // Provide different url
    // If length is too long
    if (url.length > 2047) {
      url = `${base}/elements?parent=${parent}&fields=id,name,contains,archived,type&minified=true&includeArchived=true`;
    }

    // Get children
    $.ajax({
      method: 'GET',
      url: url,
      statusCode: {
        200: (data) => {
          // Sort data by name or special cases
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

          // Set the sorted data as children
          this.setState({ children: result });
        },
        401: (err) => {
          // Unset children and display error
          this.setState({ children: null });
          this.setState({ error: err.responseText });

          // Refresh when session expires
          window.location.reload();
        },
        403: (err) => {
          // Display error
          this.setState({ error: err.responseText });
        },
        404: (err) => {
          // Display error
          this.setState({ error: err.responseText });
        }
      }
    });
  }

  /**
   * @description Toggle the element to display it's children.
   */
  toggleCollapse() {
    if (this.props.unsetCheckbox) {
      this.props.unsetCheckbox();
    }
    this.setState((prevState) => ({ isOpen: !prevState.isOpen }));
  }

  componentDidUpdate(prevProps, prevStates) {
    // Verify if component needs to re-render
    // Due to the update from state props of data
    if (this.state.data !== prevStates.data) {
      this.componentDidMount();
    }
    if (this.props.data.contains.length !== prevProps.data.contains.length) {
      this.setState({ data: this.props.data });
      this.componentDidMount();
    }

    if ((this.props.expand !== prevProps.expand) && !!(this.props.expand)) {
      this.setState({ isOpen: true });
    }
    if ((this.props.collapse !== prevProps.collapse) && !!(this.props.collapse)) {
      if (this.props.id !== 'model') {
        this.setState({ isOpen: false });
      }
    }
  }

  /**
   * @description When an element is deleted, created, or updates the parent
   * the elements will be updated.
   */
  refresh() {
    // Build URL to get element data
    const base = this.props.url;
    const url = `${base}/elements/${this.state.id}?minified=true&includeArchived=true`;

    // Get element data
    $.ajax({
      method: 'GET',
      url: url,
      statusCode: {
        200: (data) => {
          // Set the element data
          this.setState({ data: data });
        },
        401: (err) => {
          // Set error
          this.setState({ error: err.responseText });

          // Refresh when session expires
          window.location.reload();
        },
        404: (err) => {
          // Set error
          this.setState({ error: err.responseText });
        }
      }
    });
  }

  /**
   * @description When an element is clicked, parses the ID and call the passed in
   * click handler function.
   */
  handleClick() {
    const elementId = this.props.id.replace('tree-', '');
    this.props.clickHandler(elementId);
  }

  render() {
    // Initialize variables
    let elementLink;
    const initColor = (this.state.data.archived) ? '#c0c0c0' : '#333';
    let elementIcon = (
      <i className={'fas fa-cube'}
         style={{ color: initColor }}/>
    );
    let expandIcon = 'fa-caret-right transparent';
    const subtree = [];

    const isOpen = this.state.isOpen;

    // If the element contains other elements, handle the subtree
    if (Array.isArray(this.state.data.contains) && this.state.data.contains.length >= 1) {
      // Icon should be caret to show subtree is collapsible
      expandIcon = (isOpen) ? 'fa-caret-down' : 'fa-caret-right';

      // Create Subtrees
      if (this.state.children !== null) {
        for (let i = 0; i < this.state.children.length; i++) {
          subtree.push(
            <ElementSubtree key={`tree-${this.state.children[i].id}`}
                            id={`${this.state.children[i].id}`}
                            data={this.state.children[i]}
                            project={this.props.project}
                            parent={this.state}
                            archived={this.props.archived}
                            displayIds={this.props.displayIds}
                            expand={this.props.expand}
                            collapse={this.props.collapse}
                            setRefreshFunctions={this.props.setRefreshFunctions}
                            parentRefresh={this.refresh}
                            linkElements={this.props.linkElements}
                            clickHandler={this.props.clickHandler}
                            unsetCheckbox={this.props.unsetCheckbox}
                            isOpen={isOpen}
                            url={this.props.url}/>
          );
        }
      }
    }

    // Build the rendered element item
    let element = '';
    // Verify data available
    if (this.state.data !== null) {
      // Verify if archived
      if (!this.state.data.archived) {
        // Element should be rendered as the ID initially
        element = (
          <span className={'element-id'}>
           {this.state.data.id}
        </span>
        );
        // If the name is not blank, render the name
        if (this.state.data.name !== '' && this.props.displayIds) {
          element = (
            <span>
            {this.state.data.name}
              <span className={'element-id'}>({this.state.data.id})</span>
          </span>
          );
        }
        // If the name is not blank and has displayId to false
        else if (this.state.data.name !== '' && !this.props.displayIds) {
          element = (
            <span>
            {this.state.data.name}
            </span>
          );
        }
      }
      // If the element is archived and archived toggle is true
      else if (this.props.archived && this.state.data.archived) {
        // Element should be rendered as the ID initially
        element = (
          <span className='element-id'>
           {this.state.data.id}
          </span>
        );
        // If the name is not blank, render the name
        if (this.state.data.name !== '' && this.props.displayIds) {
          element = (
            <span className='grayed-out'>
              {this.state.data.name}
              <span className='element-id'>({this.state.data.id})</span>
            </span>
          );
        }
        // If the name is not blank and has displayIds to false
        else if (this.state.data.name !== '' && !this.props.displayIds) {
          element = (
            <span className='grayed-out'>
            {this.state.data.name}
            </span>
          );
        }
      }
    }

    const iconMappings = {
      Package: {
        icon: (isOpen) ? 'folder-open' : 'folder',
        color: 'lightblue'
      },
      package: {
        icon: (isOpen) ? 'folder-open' : 'folder',
        color: 'lightblue'
      },
      'uml:Package': {
        icon: (isOpen) ? 'folder-open' : 'folder',
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
      association: {
        icon: 'arrows-alt-h',
        color: '#333333'
      },
      Association: {
        icon: 'arrows-alt-h',
        color: '#333333'
      },
      relationship: {
        icon: 'arrows-alt-h',
        color: '#333333'
      },
      Relationship: {
        icon: 'arrows-alt-h',
        color: '#333333'
      },
      Edge: {
        icon: 'arrows-alt-h',
        color: '#333333'
      },
      edge: {
        icon: 'arrows-alt-h',
        color: '#333333'
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
      },
      Document: {
        icon: 'file-alt',
        color: '#465faf'
      },
      View: {
        icon: 'align-center',
        color: '#b0f2c8'
      }
    };

    // Verify data available and type in mapping
    if (this.state.data !== null
      && iconMappings.hasOwnProperty(this.state.data.type)) {
      // Set the icon to a new icon and color
      const icon = iconMappings[this.state.data.type].icon;
      const color = (this.state.data.archived) ? '#c0c0c0' : iconMappings[this.state.data.type].color;
      elementIcon = (
        <i className={`fas fa-${icon}`}
           style={{ color: color }}/>
      );
    }

    // Verify if it is linked element
    if (this.props.linkElements) {
      elementLink = (
        <Link to={`#${this.props.id}`}
              onClick={this.handleClick}
              className='element-link'>
            <span className='element-name'>
              {elementIcon}
              {element}
            </span>
        </Link>);
    }
    else {
      elementLink = (
        <span onClick={this.handleClick}
             className='element-link'>
          <span className='element-name'>
              {elementIcon}
            {element}
          </span>
        </span>);
    }

    // Verify data is not archived and
    // toggle archived is false
    if (this.state.data.archived && !this.props.archived) {
      return null;
    }
    else {
      return (
        <div id={`tree-${this.props.id}`}
             className={(this.props.parent) ? 'element-tree' : 'element-tree element-tree-root'}>
          <i className={`fas ${expandIcon}`}
             onClick={this.toggleCollapse}>
          </i>
          {elementLink}
          {(isOpen) ? (<div>{subtree}</div>) : ''}
        </div>);
    }
  }

}

// Export component
export default ElementSubtree;
