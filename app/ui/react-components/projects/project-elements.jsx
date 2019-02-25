/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.projects
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders a project's element page.
 */
import React, { Component } from "react";
import List from '../general-components/list/list.jsx';
import ListItem from '../general-components/list/list-item.jsx';
import ElementList from '../elements/element-list.jsx';

class ProjectElements extends Component {
    constructor(props) {
        super(props);

        this.toggle = this.toggle.bind(this);

        this.state = {
            isExpanded: false
        };
    }

    toggle() {
        this.setState({isExpanded: !this.state.isExpanded});
    }

    componentDidMount() {

    }

    render() {

        return (
            <div id='view' className='project-elements'>
                <h2>Elements</h2>
                <hr/>
                <List>
                    <ListItem element={this.props.element} />
                    <ElementList element={this.props.element} url={this.props.url}/>
                </List>
            </div>
        )
    }
}

export default ProjectElements
