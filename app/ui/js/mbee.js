/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.element
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This are helper functions for the front end.
 */
// ESLint disabled for client-side JS for now.
/* eslint-disable */

$.fn.extend({
  autoResize: function() {
    const nlines = $(this).html().split('\n').length;
    $(this).attr('rows', nlines + 1);
  }
});

/**
 * Determines the identity of the current user. If the user is stored in session
 * storage, that is used. Otherwise, an API call is made to /api/users/whoami
 * to get the user information and store it in session storage.
 *
 * Takes a callback as input that will passed an error, and the user data.
 */
// eslint-disable-next-line no-unused-vars
function mbeeWhoAmI(callback) {
  // If user is already stored, use that.
  if (window.sessionStorage.hasOwnProperty('mbee-user')
    && window.sessionStorage['mbee-user'] !== null) {
    return callback(null, JSON.parse(window.sessionStorage['mbee-user']));
  }

  // If not found, do ajax call
  const url = '/api/users/whoami?minified=true';
  $.ajax({
    method: 'GET',
    url: url,
    statusCode: {
      401: () => {
        const path = window.location.pathname;
        if (!path.startsWith('/doc') && !path.startsWith('/login')
          && !path.startsWith('/about')) {
          // Refresh when session expires
          window.location.reload();
        }
      }
    },
    success: (_data) => {
      const data = {
        username: _data.username,
        fname: _data.fname,
        lname: _data.lname,
        preferredName: _data.preferredName,
        email: _data.email,
        custom: _data.custom,
        admin: _data.admin,
        provider: _data.provider
      };
      if (data.username) {
        window.sessionStorage.setItem('mbee-user', JSON.stringify(data));
      }
      callback(null, data);
    },
    error: (err) => {
      callback(err, null);
    }
  });
}
