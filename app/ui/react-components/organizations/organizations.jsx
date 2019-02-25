/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.organizations
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the routes of the organization pages.
 */
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

import OrganizationList from './organization-list.jsx';
import Organization from './organization.jsx';
import { getRequest } from '../helper-functions/getRequest.js';

class Organizations extends Component {
    constructor(props) {
        super(props);
    }

    render () {

        return (
            <Router>
                <Switch>
                    <Route exact path="/organizations" component={OrganizationList} />
                    <Route path="/:orgid" component={Organization} />
                </Switch>
            </Router>
        );
    }

}

ReactDOM.render(<Organizations />, document.getElementById('main'));
