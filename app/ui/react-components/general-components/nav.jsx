/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.general-components
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the nav bar.
 */
import React, { Component } from 'react';
import ReactDom from 'react-dom';
import {
    Collapse,
    Navbar,
    NavbarToggler,
    NavbarBrand,
    Nav,
    NavItem,
    NavLink,
    UncontrolledDropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem } from 'reactstrap';

import { getRequest } from '../helper-functions/getRequest.js';

class MbeeNav extends Component {
    constructor(props) {
        super(props);

        this.toggle = this.toggle.bind(this);
        this.setComponentSize = this.setComponentSize.bind(this);

        this.state = {
            isOpen: false,
            user: null,
            width: 0,
            height: 0
        };
    }

    componentDidMount() {
        window.addEventListener('resize', this.setComponentSize);

        const url = '/api/users/whoami';

        getRequest(`${url}`)
        .then(user => {
            this.setState({user: user});
        })
        .catch(err => {

        });

        this.setComponentSize();
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.setComponentSize);
    }

    setComponentSize() {
        this.setState(
            {
                width: this.refs.navbar.clientWidth,
                height: this.refs.navbar.clientHeight
            })
    }

    toggle() {
        this.setState({
            isOpen: !this.state.isOpen
        });
    }
    render() {
        return (
            <div ref="navbar" style={{width: '100%'}}>
                <Navbar color="light" light expand="md">
                    <NavbarBrand href="/">
                        <img src="/img/logo-alt.png" />
                        {(this.state.width > 900) ? 'Model Based Engineering Environment' : 'MBEE'}
                    </NavbarBrand>
                    <NavbarToggler onClick={this.toggle} />
                    <Collapse isOpen={this.state.isOpen} navbar>
                        <Nav className="ml-auto" navbar>

                            <UncontrolledDropdown nav inNavbar>
                                <DropdownToggle nav caret>
                                    Documentation
                                </DropdownToggle>

                                <DropdownMenu right>
                                    <DropdownItem href="/doc/flight-manual">
                                        Flight Manual
                                    </DropdownItem>
                                    <DropdownItem divider />
                                    <DropdownItem href="/doc/developers">
                                        JSDoc Documentation
                                    </DropdownItem>
                                    <DropdownItem href="/doc/api">
                                        API Documentation
                                    </DropdownItem>

                                </DropdownMenu>
                            </UncontrolledDropdown>
                            <NavItem>
                                <NavLink href="/about">About</NavLink>
                            </NavItem>

                            <NavItem>
                                {(this.state.user === null)
                                    ? <NavLink href="/login">Login</NavLink>
                                    : <NavLink href="/logout">Logout</NavLink>
                                }
                            </NavItem>

                        </Nav>
                    </Collapse>
                </Navbar>
            </div>
        );
    }
}

ReactDom.render(<MbeeNav />, document.getElementById('nav'));
