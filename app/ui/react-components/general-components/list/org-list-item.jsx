/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.general-components.list
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the organization list items.
 */
import React, { Component } from 'react';

import StatsList from '../stats/stats-list.jsx';
import Stat from '../stats/stat.jsx';

class OrgListItem extends Component {
    constructor(props) {
        super(props);

        this.ref = React.createRef();

        this.handleResize = this.handleResize.bind(this);

        this.state = {
            width: 0,
        };
    }

    componentDidMount() {
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
        const org = this.props.org;
        const stats = (
            <StatsList>
                <Stat title='Projects' icon='fas fa-boxes' value={org.projects.length} _key={`${org.id}-projects`} />
                <Stat title='Users' icon='fas fa-users' value={Object.keys(org.permissions).length} _key={`${org.id}-users`} />
            </StatsList>
        );

        return (
            <div className='stats-list-item' ref={this.ref}>
                <div className='list-header'>
                    <p>{org.name}</p>
                </div>

                {(this.state.width > 600) ? stats : ''}
            </div>
        )
    }
}


export default OrgListItem
