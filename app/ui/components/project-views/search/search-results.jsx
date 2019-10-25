/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.search.search-results
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author James Eckstein
 *
 * @description This renders the search results table elements.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
import { Table, Row, Button } from 'reactstrap';

// MBEE modules
import SearchResult from './search-result.jsx';

/* eslint-enable no-unused-vars */
// Limit the number of columns to display in results table
const headerLimit = 5;
// Limit the search results to 10 records per page
const pageLimit = 10;

class SearchResults extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    this.getHeaders = this.getHeaders.bind(this);
    this.getRowsData = this.getRowsData.bind(this);
    this.onPageChange = this.onPageChange.bind(this);
    this.displayPageButtons = this.displayPageButtons.bind(this);
  }

  // Creates the Headers for the results table
  getHeaders() {
    const keys = this.props.headers.slice(0, headerLimit);
    const headerRows = [];

    // Build header rows
    keys.forEach((key) => {
      /* eslint-disable-next-line no-undef */
      const headerName = (key === 'id') ? key.toUpperCase() : convertCase(key, 'proper');
      headerRows.push(
        <th key={key}>{headerName}</th>
      );
    });

    return headerRows;
  }

  // Generates the rows of element results
  getRowsData() {
    const keys = this.props.headers.slice(0, headerLimit);
    const results = this.props.results;
    const rows = [];

    // Check if the results count is less than page limit - Use lower result to render rows.
    const numRows = (results.length < pageLimit) ? results.length : pageLimit;

    // Build result rows
    for (let index = 0; index < numRows; index++) {
      // Add element row to table
      rows.push(
        <tr key={index}
            data-toggle='collapse'
            data-target={ `#result-${index}` }
            className='result-row clickable'>
          <SearchResult key={index} data={results[index]} keys={keys}/>
        </tr>
      );

      // Create element information as list
      const result = results[index];
      const created = result.createdOn.split(' ').splice(0, 4).join(' ');
      const updated = result.updatedOn.split(' ').splice(0, 4).join(' ');

      // Build rows for expanded element information
      const elemInfo = (
        <table id='tbl-elem-info' className='table-width'>
          <tbody>
            <tr>
              <th>Name:</th>
              <td>{result.name}</td>
              <th>Type:</th>
              <td>{result.type}</td>
              <th>Archived:</th>
              <td>{ `${result.archived}` }</td>
            </tr>
            <tr>
              <th>Branch:</th>
              <td>{result.branch}</td>
              <th>Created By:</th>
              <td>{result.createdBy}</td>
              <th>Documentation:</th>
              <td>{result.documentation}</td>
            </tr>
            <tr>
              <th>Project:</th>
              <td>{result.project}</td>
              <th>Created On:</th>
              <td>{created}</td>
              <th>Source:</th>
              <td>{result.source}</td>
            </tr>
            <tr>
              <th>Org:</th>
              <td>{result.org}</td>
              <th>Last Modified By:</th>
              <td>{result.lastModifiedBy}</td>
              <th>Target:</th>
              <td>{result.target}</td>
            </tr>
            <tr>
              <th>Parent:</th>
              <td>{result.parent}</td>
              <th>Updated On:</th>
              <td>{updated}</td>
            </tr>
          </tbody>
        </table>
      );

      // Add element information accordion style row (hidden)
      rows.push(
        <tr key={`${index}-data`}>
          <td colSpan={keys.length} style={{ padding: '0' }}>
            <Row id={ `result-${index}` } className='collapse' style={{ margin: 0 }}>
              <div className='results-border'>
                { elemInfo }
              </div>
            </Row>
          </td>
        </tr>
      );
    }

    return rows;
  }

  // Handle page changes for paginated results
  onPageChange(event) {
    let page = this.props.page;
    let skip;

    if (event === 'next') {
      skip = (pageLimit * page);
      page += 1;
    }
    else if (event === 'back') {
      skip = (page > 1) ? ((page - 1) * pageLimit) - pageLimit : 0;
      page -= 1;
    }

    // Build query URL
    const url = `${this.props.apiUrl}&skip=${skip}`;

    // Do ajax request
    $.ajax({
      method: 'GET',
      url: url,
      statusCode: {
        401: () => {
          // Refresh when session expires
          window.location.reload();
        }
      }
    })
    .done(data => {
      this.props.handlePageChange(data, page);
    })
    .fail(res => {
      if (res.status === 404) {
        this.props.handlePageChange([], page);
      }
    });
  }

  // Displays prev/next buttons based on record count and current page
  displayPageButtons() {
    const currentPage = this.props.page;
    const results = this.props.results;

    const btnPrev = (currentPage > 1)
      ? <Button id='btn-back'
                name='back'
                onClick={() => this.onPageChange('back')}>
          <i className='fas fa-arrow-left'/>
          <span style={{ paddingLeft: '4px' }}>back</span>
        </Button>
      : '';

    const btnNext = (results.length > pageLimit)
      ? <Button id='btn-next'
                name='next'
                onClick={() => this.onPageChange('next')}>
          <span style={{ paddingRight: '4px' }}>next</span>
          <i className='fas fa-arrow-right'/>
        </Button>
      : '';

    return (
      <div id='btn-pagination-grp'>
        { btnPrev }
        { btnNext }
      </div>
    );
  }

  render() {
    // If no results yet, render empty div
    const results = this.props.results;

    if (!results) {
      return (<div/>);
    }

    // If empty search results
    if (Array.isArray(results) && results.length === 0) {
      return (<div className='no-results'>No search results found.</div>);
    }

    return (
      <React.Fragment>
        <div id='search-results'>
          <Table id='tbl-results' striped style={{ margin: '0px' }}>
            <thead className='template-item'>
              <tr>
                { this.getHeaders() }
              </tr>
            </thead>
            <tbody className='search-body'>
              { this.getRowsData() }
            </tbody>
          </Table>
          { this.displayPageButtons() }
        </div>
      </React.Fragment>
    );
  }

}

// Export component
export default SearchResults;
