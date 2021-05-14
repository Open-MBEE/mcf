/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.app.LoginPage
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This renders the login page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';

// MBEE modules
import { useApiClient } from '../context/ApiClientProvider.js';

// Dynamically load Login Modal Message
import uiConfig from '../../../../build/json/uiConfig.json';
const loginModal = uiConfig.loginModal;


export default function LoginPage(props) {
  const { authService } = useApiClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { next } = props;
  const [modalOpen, setModalOpen] = useState(false);

  const toggleModal = () => {
    setModalOpen((prevState) => !prevState);
  };

  const handleUserChange = (e) => {
    setUsername(e.target.value);
  };

  const handlePassChange = (e) => {
    setPassword(e.target.value);
  };

  const doLogin = async () => {
    // Remove any left over sessions
    window.sessionStorage.removeItem('mbee-user');

    // Create object to send for authentication
    const form = {
      username: username,
      password: password,
      next: next
    };

    const [err] = await authService.login(form);
    if (err) setError(err);
  };

  // Open the modal if enabled; otherwise login
  const triggerModal = () => {
    if (loginModal.on) {
      if (window.sessionStorage.getItem('mbee-accept-until') !== 'null') {
        const then = window.sessionStorage.getItem('mbee-accept-until');

        const now = new Date();
        if (then < now) {
          // Clear the accept timer
          window.sessionStorage.removeItem('mbee-accept-until');
          // Trigger Modal
          toggleModal();
        }
      }
    }
    else {
      toggleModal();
    }
  };

  const createAccept = () => {
    const regexp = /([0-9]*)([hms])/;
    if (loginModal.hideFor === undefined) {
      loginModal.hideFor = '4h';
    }
    const result = loginModal.hideFor.match(regexp);
    const hideTime = parseInt(result[1], 10);
    let hideDivisor = 0;
    if (result.length < 2) {
      hideDivisor = 60;
    }
    else if (result[2] === 'h') {
      hideDivisor = 60;
    }
    else if (result[2] === 's') {
      hideDivisor = 3600;
    }
    else {
      hideDivisor = 60;
    }
    window.sessionStorage.removeItem('mbee-accept-until');
    const acceptUntil = new Date();
    acceptUntil.setHours(acceptUntil.getHours() + hideTime / hideDivisor);
    window.sessionStorage.setItem('mbee-accept-until', acceptUntil);
  };

  const handleLogin = (e) => {
    if (e.target.id === 'loginBtn' || e.key === 'Enter') {
      doLogin();
    }
  };

  const handleModal = (e) => {
    if (e.target.id === 'acceptBtn' || e.key === 'Enter') {
      createAccept();
      toggleModal();
    }
  };


  // Overwrites componentDidLoad to trigger the modal on initial render
  useEffect(() => {
    triggerModal();
  }, []);

  return (
    <div id="main">
      <div id="view" className="view">
        <div className="container" style={{ maxWidth: '450px' }}>
          { error
            ? (<div className="alert alert-danger alert-dismissible fade show" role="alert"
                   style={{ position: 'fixed', top: '100px', left: '50%', transform: 'translateX(-50%)' }}>
                {error}
                <button type="button" className="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
              </div>)
            : '' }
          <div id="login-form">
            <div className="form-group" >
              <label htmlFor="username">Username</label>
              <input id="username" name="username" type="text" className="form-control"
                     aria-describedby="usernameHelp" placeholder="Enter your username ..."
                     value={username} onChange={handleUserChange} onKeyPress={handleLogin}/>
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" className="form-control" placeholder="Enter your password ..."
                     value={password} onChange={handlePassChange} onKeyPress={handleLogin}/>
            </div>
            <button id="loginBtn" type="submit" className="btn btn-primary" onClick={handleLogin}>
              Login
            </button>
          </div>
        </div>
        <Modal isOpen={modalOpen}>
          <ModalHeader>
            <h5 className="modal-title">NOTICE</h5>
          </ModalHeader>
          <ModalBody>
            <p style={{ color: '#333' }}>{loginModal.message}</p>
          </ModalBody>
          <ModalFooter>
            <input type="hidden" onKeyPress={handleModal}/>
            <Button id="acceptBtn" color="primary" onClick={handleModal} className="text-center">Accept</Button>
          </ModalFooter>
        </Modal>
      </div>
    </div>
  );
}
