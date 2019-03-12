/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.projects
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders a project.
 */
import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import Sidebar from '../general-components/sidebar/sidebar.jsx'
import SidebarLink from '../general-components/sidebar/sidebar-link.jsx'
import ProjectHome from './project-home.jsx'
import ProjectUsers from './project-users.jsx'
import ProjectElements from './project-elements.jsx'
import ProjectEdit from './project-edit.jsx'

import { getRequest } from '../helper-functions/getRequest.js';

class Project extends Component {
    constructor(props) {
        super(props);

        this.state = {
            project: null,
            orgid: null,
            element: null,
            url: null,
            error: null,
            admin: false
        };
    }

    componentDidMount() {
        const orgId = this.props.match.params.orgid;
        this.setState({orgid: orgId});
        const projId = this.props.match.params.projectid;

        const url = `/api/orgs/${orgId}/projects/${projId}`;
        this.setState({url: url});

        getRequest(`${url}`)
        .then(project => {
            getRequest(`${url}/branches/master/elements/model`)
            .then(element => {
                const username = this.props.user.username;
                const perm = project.permissions[username];
                const admin = this.props.user.admin;

                if ((admin) || (perm === 'admin')){
                    this.setState({admin: true});
                }

                this.setState({ project: project });
                this.setState({ element: element });
            })
            .catch(err => {
                    console.log(err);
                    this.setState({error: 'Failed to load project.'});
            });
        })
        .catch(err => {
            console.log(err);
            this.setState({error: 'Failed to load project.'});
        });
    }

    render() {
        return (
            <Router>
                <React.Fragment>
                    <Sidebar>
                        <SidebarLink title='Home' icon='fas fa-home' routerLink={`${this.props.match.url}`} />
                        <SidebarLink title='Users' icon='fas fa-users' routerLink={`${this.props.match.url}/users`} />
                        <SidebarLink title='Elements' icon='fas fa-sitemap' routerLink={`${this.props.match.url}/elements`} />
                        <hr />
                        {(this.state.admin)
                            ?(<SidebarLink title='Edit' icon='fas fa-cog' routerLink={`${this.props.match.url}/edit`} />)
                            : ''
                        }
                    </Sidebar>
                    {(!this.state.project && !this.state.elements)
                        ? <div className="loading"> {this.state.error || 'Loading your project...'} </div>
                        : (<Switch>
                                <Route exact path={`${this.props.match.url}/`}
                                       render={ (props) => <ProjectHome {...props} project={this.state.project} /> } />
                                <Route path={`${this.props.match.url}/users`}
                                       render={ (props) => <ProjectUsers {...props} project={this.state.project} /> } />
                                <Route path={`${this.props.match.url}/elements`}
                                   render={ (props) => <ProjectElements {...props} project={this.state.project} element={this.state.element} url={this.state.url}/> } />
                                {(this.state.admin)
                                    ? (<Route path={`${this.props.match.url}/edit`}
                                              render={(props) => <ProjectEdit {...props} project={this.state.project} url={this.state.url} orgid={this.state.orgid}/>}/>)
                                    : ''
                                }
                            </Switch>)
                    }
                </React.Fragment>
            </Router>
        );
    }
}

export default Project
