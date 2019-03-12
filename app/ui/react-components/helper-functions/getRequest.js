/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.helper-functions
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This implements the jQuery to do a get request to the api
 * and return the data if passed or reject with an error.
 */
export function getRequest(url, dataType) {
  // Declare promise
  return new Promise((resolve, reject) => {
    // Execute javascript query
    jQuery.ajax({   // eslint-disable-line no-undef
      // Specify URL and data type
      url: url,
      dataType: dataType || 'json',
      // Request succeeded, resolve the data
      success: (data) => resolve(data),
      // Request failed, reject error
      error: (err) => reject(err)
    });
  });
}
