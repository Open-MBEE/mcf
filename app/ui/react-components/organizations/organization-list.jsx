/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.organizations
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the organizations list.
 */
import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import List from '../general-components/list/list.jsx';
import OrgListItem from '../general-components/list/org-list-item.jsx';

import { getRequest } from '../helper-functions/getRequest';


class OrganizationList extends Component {
    constructor(props) {
        super(props);
        this.ref = React.createRef();

        this.handleResize = this.handleResize.bind(this);


        this.state = {
            width: null,
            orgs: []
        };
    }

    componentDidMount() {
        getRequest('/api/orgs?populate=projects')
        .then(orgs => {
            this.setState({ orgs: orgs });
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

        const orgs = this.state.orgs.map(org =>
            <Link to={`/${org.id}`}>
                <OrgListItem org={org}/>
            </Link>
        );

        return (
            <div id='view' className='org-list' ref={this.ref}>
                <h2>Your Organizations</h2>
                <hr/>
                {(this.state.orgs.length === 0)
                    ? (<div className='list-item'>
                        <h3> No organizations. </h3>
                    </div>)
                    : (<List>
                        {orgs}
                    </List>)
                }
            </div>
        )
    }
}


export default OrganizationList
