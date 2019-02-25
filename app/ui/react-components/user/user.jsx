/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.user
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders a user's page.
 */
import React, { Component } from 'react';
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import Sidebar from '../general-components/sidebar/sidebar.jsx'
import SidebarLink from '../general-components/sidebar/sidebar-link.jsx'
import UserHome from './user-home.jsx';
import UserEdit from './user-edit.jsx';

import { getRequest } from '../helper-functions/getRequest.js';

class User extends Component {

    constructor(props) {
        super(props);

        this.state = {
            user: null
        };
    }

    componentDidMount() {
        getRequest('/api/users/whoami')
        .then(user => {
            this.setState({ user: user});
        })
        .catch(err => console.log(err));
    }

    render() {
        return (
            <Router>
                <React.Fragment>
                    <Sidebar>
                        <SidebarLink title='Home' icon='fas fa-home' exact path="/whoami" />
                        <SidebarLink title='Organizations' icon='fas fa-boxes' href={`/organizations`} />
                        <SidebarLink title='Projects' icon='fas fa-box' href={`/projects`} />
                        <hr />
                        <SidebarLink title='Edit' icon='fas fa-cog' routerLink={'/whoami/edit'} />
                    </Sidebar>
                    {(!this.state.user)
                        ? <div
                            className="loading"> {this.state.error || 'Loading your information...'} </div>
                        : (<Switch>
                                <Route exact path="/whoami"
                                       render={ (props) => <UserHome {...props} user={this.state.user} /> } />
                                <Route exact path={'/whoami/edit'}
                                       render={ (props) => <UserEdit {...props} user={this.state.user} /> } />
                            </Switch>)
                    }
                </React.Fragment>
            </Router>
        );
    }
}

ReactDOM.render(<User />, document.getElementById('main'));
