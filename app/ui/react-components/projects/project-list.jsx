/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.projects
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the project list page.
 */
import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import List from '../general-components/list/list.jsx';
import ProjectListItem from '../general-components/list/project-list-item.jsx';

import { getRequest } from '../helper-functions/getRequest';

class ProjectList extends Component {
    constructor(props) {
        super(props);
        this.ref = React.createRef();

        this.handleResize = this.handleResize.bind(this);


        this.state = {
            width: null,
            projects: []
        };
    }

    componentDidMount() {
        getRequest('/api/projects')
        .then(projects => {
            this.setState({ projects: projects});
        })
        .catch(err => console.log(err));

        window.addEventListener('resize', this.handleResize);
        this.handleResize();
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.handleResize);
    }

    handleResize() {
        this.setState({ width: this.ref.current.clientWidth })
    }

    render() {

        const projects = this.state.projects.map(project => {

            const orgId = project.org;

            return (
                <Link to={`/${orgId}/${project.id}`}>
                    <ProjectListItem project={project}/>
                </Link>
            )
        });

        return (
            <div id='view' className='project-list' ref={this.ref}>
                <h2>Your Projects</h2>
                <hr/>
                {(this.state.projects.length === 0)
                    ? (<div className='list-item'>
                        <h3> No projects. </h3>
                       </div>)
                    : (<List>
                        {projects}
                       </List>)
                }
            </div>
        )
    }
}


export default ProjectList
