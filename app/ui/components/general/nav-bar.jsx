/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.general.nav-bar
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 * @author Jake Ursetta
 *
 * @description This renders the nav bar.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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

// MBEE modules
import { useAuth } from '../context/AuthProvider.js';
import { useApiClient } from '../context/ApiClientProvider.js';

// Define component
function MbeeNavbar(props) {
  const { auth } = useAuth();
  const { authService } = useApiClient();
  const navRef = useRef();
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [error, setError] = useState(null);

  const toggle = () => {
    setIsOpen((prev) => !prev);
  };

  // Define initialization of component size function
  const setComponentSize = () => {
    setWidth(navRef.current.clientWidth);
    setHeight(navRef.current.clientHeight);
  };

  const sessionDestroy = async () => {
    await authService.logout();
  };

  // Set the window resize listener
  useEffect(() => {
    window.addEventListener('resize', setComponentSize);
    setComponentSize();
    return () => window.removeEventListener('resize', setComponentSize);
  }, []);

  // Respond to change in auth status
  useEffect(() => {
    // eslint-disable-next-line no-undef
    mbeeWhoAmI((err, data) => {
      if (err) setError(err);
      else if (data) setUser(data);
    });
  }, [auth]);


  let setNavbarSize;

  if (width > 776) {
    setNavbarSize = 'mbee-navbar';
  }
  else {
    setNavbarSize = 'small-screen-navbar';
  }

  return (
    <div ref={navRef} style={{ width: '100%' }}>
      <Navbar className={setNavbarSize} dark expand='md'>
        { /* Create the MBEE Logo on navbar */ }
        <NavbarBrand href="/">
          <img src='/img/logo.svg' />
          { /* Change title based on width of window */ }
          {(width > 900) ? 'Core' : 'MCF'}
        </NavbarBrand>
        <NavbarToggler onClick={toggle} />
        <Collapse isOpen={isOpen} navbar>
          <Nav className='ml-auto' navbar>
            { /* Create links in navbar for documentation drop down */ }
            <UncontrolledDropdown nav inNavbar>
              <DropdownToggle nav caret>
                Docs
              </DropdownToggle>
              <DropdownMenu right>
                <DropdownItem href='/doc/flight-manual'>
                  Flight Manual
                </DropdownItem>
                <DropdownItem divider />
                <DropdownItem href='/doc/index.html'>
                  JSDoc Documentation
                </DropdownItem>
                <DropdownItem href='/doc/api'>
                  API Documentation
                </DropdownItem>
              </DropdownMenu>
            </UncontrolledDropdown>
            { // Create link to login or logout
              (auth && user)
                ? (
                  <UncontrolledDropdown nav inNavbar>
                    <DropdownToggle nav caret>
                      <i className='fas fa-user-circle'/>
                    </DropdownToggle>
                    <DropdownMenu right>
                      <Link to='/'>
                        <DropdownItem>Home</DropdownItem>
                      </Link>
                      <Link to='/profile'>
                        <DropdownItem>Profile</DropdownItem>
                      </Link>
                      <Link to='/about'>
                        <DropdownItem>About</DropdownItem>
                      </Link>
                      <DropdownItem divider />
                      {(!user.admin)
                        ? ''
                        : (<React.Fragment>
                          <Link to='/admin'><DropdownItem>Admin Console</DropdownItem></Link>
                          <DropdownItem divider />
                        </React.Fragment>)
                      }
                      <DropdownItem onClick={sessionDestroy}>Log Out</DropdownItem>
                    </DropdownMenu>
                  </UncontrolledDropdown>)
                : <NavLink href='/login'>Login</NavLink>
            }
            <NavItem>
            </NavItem>
          </Nav>
        </Collapse>
      </Navbar>
    </div>
  );
}

export default MbeeNavbar;
