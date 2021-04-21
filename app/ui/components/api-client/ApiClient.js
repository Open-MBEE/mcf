/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.api-client.ApiClient
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description Defines the api client class.
 */


export default class ApiClient {

  constructor(authContext, url) {
    this.authContext = authContext;
    this.url = url;

    this.makeRequest = this.makeRequest.bind(this);
  }

  async get(options = {}, url = this.url) {
    options.method = 'GET';
    return this.makeRequest(null, options, url);
  }

  async post(data, options = {}, url = this.url) {
    options.method = 'POST';
    return this.makeRequest(data, options, url);
  }

  async patch(data, options = {}, url = this.url) {
    options.method = 'PATCH';
    return this.makeRequest(data, options, url);
  }

  async put(data, options = {}, url = this.url) {
    options.method = 'PUT';
    return this.makeRequest(data, options, url);
  }

  async delete(data, options = {}, url = this.url) {
    options.method = 'DELETE';
    return this.makeRequest(data, options, url);
  }

  async search(query, options = {}, url = this.url) {
    options.method = 'GET';
    options.q = query;
    return this.makeRequest(null, options, url);
  }

  async makeRequest(data, options, baseUrl) {
    const url = ApiClient.buildUrl(baseUrl, options);

    // Initialize options for the request
    const fetchOpts = {
      method: options.method,
      headers: new Headers({ 'Content-Type': 'application/json' })
    };
    if (data) fetchOpts.body = JSON.stringify(data);

    // Make the request
    const response = await fetch(url, fetchOpts);

    // Check for errors in response status code
    const error = await this.checkError(response);

    // Return either the error or the data
    if (error) {
      return [error, null];
    }
    else {
      let result;
      const text = await response.text();
      try {
        result = JSON.parse(text);
      }
      catch (e) {
        result = text;
      }
      return [null, result];
    }
  }

  static buildUrl(base, options) {
    if (options) {
      let opts = '';

      // Set minified to true by default
      if (options.minified !== false) opts += 'minified=true&';

      Object.keys(options).forEach((opt) => {
        // Ignore the following options
        if (opt === 'orgid'
          || opt === 'projectid'
          || opt === 'branchid'
          || opt === 'elementid'
          || opt === 'artifactid'
          || opt === 'webhookid'
          || opt === 'method'
          || opt === 'whoami') return;
        // Add the option to the query
        opts += `${opt}=${options[opt]}&`;
      });

      if (opts.length === 0) {
        // No options; return original url
        return base;
      }
      else {
        // Get rid of the trailing '&'
        opts = opts.slice(0, -1);
        // Return the url with options
        return `${base}?${opts}`;
      }
    }
    else {
      return base;
    }
  }

  checkError(response) {
    if (response.status >= 200 && response.status < 300) {
      return;
    }
    else if (response.status === 401) {
      // break the auth state
      window.sessionStorage.removeItem('mbee-user');
      this.authContext.setAuth(false);
    }
    return response.text();
  }

}
