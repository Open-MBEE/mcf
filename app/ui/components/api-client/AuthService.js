/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.api-client.AuthService
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description Defines the auth service.
 */

// MBEE modules
import ApiClient from './ApiClient.js';

class AuthService extends ApiClient {

  constructor(authContext) {
    super(authContext, null);
  }

  async login(form) {
    const [err, result] = await super.post(form, {}, '/api/login');
    if (result) this.authContext.setAuth(true);
    return [err, result];
  }

  async logout() {
    const [err, result] = await super.post(null, {}, '/api/logout');
    if (result) {
      window.sessionStorage.removeItem('mbee-user');
      this.authContext.setAuth(false);
    }
    return [err, result];
  }

}

export default AuthService;
