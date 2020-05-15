/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.search.search-result
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author James Eckstein
 *
 * @description This renders the search result columns for the results table.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React from 'react';

/* eslint-enable no-unused-vars */

function SearchResult(props) {
  const cols = [];
  const { org, project, branch, id } = props.data;
  const href = `/orgs/${org}/projects/${project}/branches/${branch}/elements#${id}`;

  props.keys.forEach((key, index) => {
    // Check if element has value defined for respective key
    const currentValue = (typeof props.data[key] === 'undefined' || !props.data[key]) ? '' : props.data[key].toString();
    // Convert Custom data to string
    const displayValue = (key === 'custom') ? JSON.stringify(props.data[key]) : currentValue;
    const col = (key === 'id')
      ? <td className={`search-col-${index}`} key={`col-${index}`}>
          <a href={href}>
            {displayValue}
          </a>
        </td>
      : <td className={`search-col-${index}`} key={`col-${index}`}>{displayValue}</td>;
    cols.push(col);
  });

  return cols;
}


// Export component
export default SearchResult;
