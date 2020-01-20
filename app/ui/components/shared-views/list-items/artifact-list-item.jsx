/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.shared-views.list-items.artifact-list-item
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author James Eckstein
 *
 * @description This renders the artifact list items.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React from 'react';

function ArtifactListItem(props) {
  const { archived, description, filename, location, size } = props.artifact;
  const archivedClass = (archived) ? 'grayed-out' : '';
  const bytes = (typeof size === 'number') ? size : 0;
  let classNames = 'list-header';
  let displaySize = '-';

  // Format file size
  if (bytes > 0) {
    const sizeLabels = ['Bytes', 'KB', 'MB', 'GB'];
    const label = Math.floor(Math.log(bytes) / Math.log(1000));
    displaySize = `${parseFloat((bytes / (1000 ** label)).toFixed(2))} ${sizeLabels[label]}`;
  }

  if (props.label) {
    classNames = 'template-item minimize';
    displaySize = 'Size';
  }

  // Render artifact data
  return (
    <div key={props._key}>
      <div id='artifact-list-items' className={classNames}>
        <div className={archivedClass} style={{ overflow: 'hidden' }}>{filename}</div>
        <div className={archivedClass}>{description}</div>
        <div className={archivedClass} style={{ textAlign: 'center' }}>{displaySize}</div>
        <div className={archivedClass} style={{ overflow: 'hidden' }}>{location}</div>
      </div>
    </div>
  );
}

export default ArtifactListItem;
