/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.project-views.search.search-results
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the search page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

import React, { Component } from 'react';
import SearchResult from './search-result.jsx';

/* eslint-enable no-unused-vars */

class SearchResults extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    this.state = {
      results: props.results
    };
  }

  render() {
    // If no results yet, render empty div
    if (!this.props.results) {
      return (<div/>);
    }

    // If empty search results
    if (Array.isArray(this.props.results) && this.props.results.length === 0) {
      return (<div className='no-results'>No search results found.</div>);
    }

    const results = this.props.results.map(
      result => (<SearchResult key={result.id} data={result}/>)
    );

    return (
            <div className={'search-results'}>
                {results}
            </div>
    );
  }

}

// Export component
export default SearchResults;
