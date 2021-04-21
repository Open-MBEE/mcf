/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.general.Banner
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This renders a banner at the top and bottom of the page if a banner is specified
 * in the config.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

import React from 'react';

// Dynamically load banner message
import uiConfig from '../../../../build/json/uiConfig.json';
const banner = uiConfig.banner;

export default function Banner(props) {
  let content = props.children;

  if (banner.on) {
    const headerStyle = {
      width: '100%',
      position: 'fixed',
      top: '0',
      textAlign: 'center',
      fontSize: '14px',
      color: banner.color || '#333',
      background: banner.background || '#fff',
      fontWeight: banner.bold ? 'bold' : 'normal',
      borderBottom: banner.border || 'none',
      zIndex: '1000'
    };

    const footerStyle = {
      width: '100%',
      position: 'fixed',
      bottom: 0,
      textAlign: 'center',
      fontSize: '14px',
      color: banner.color || '#333',
      background: banner.background || '#fff',
      fontWeight: banner.bold ? 'bold' : 'normal',
      borderTop: banner.border || 'none',
      zIndex: '1000'
    };

    content = (
      <>
        <div id='header' className='header' style={headerStyle}>{banner.message}</div>
        <div style={{ marginBottom: '21px' }}/>
        {props.children}
        <div id='footer' className='footer' style={footerStyle}>{banner.message}</div>
      </>
    );
  }

  return content;
}
