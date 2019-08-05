/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.project-views.search.advanced-search.advanced-search
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the advanced search form.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';
import { Button, Card, CardBody, Col, Collapse, Form, InputGroup } from 'reactstrap';

// Import MBEE Modules
import AdvancedRow from './advanced-row.jsx';

/* eslint-enable no-unused-vars */

class AdvancedSearch extends Component {

  constructor(props) {
    super(props);

    // Parse the get parameters
    const rows = [];
    const getParamsRaw = this.props.location.search.slice(1);
    if (getParamsRaw.length > 0) {
      getParamsRaw.split('&').forEach(keyValuePair => {
        const [param, value] = keyValuePair.split('=');
        if (param !== 'q' && param !== 'query') {
          // Convert API params to option values
          let criteria = param.split(/(?=[A-Z])/).join(' ');
          criteria = criteria.charAt(0).toUpperCase() + criteria.slice(1);
          rows.push({
            criteria: criteria,
            value: decodeURIComponent(value)
          });
        }
      });
    }

    this.state = {
      rows: (rows.length === 0) ? [{ criteria: this.props.options[0], value: '' }] : rows,
      query: getParamsRaw || '',
      results: null,
      message: '',
      collapse: (rows.length > 0) || false
    };

    this.toggle = this.toggle.bind(this);
    this.addRow = this.addRow.bind(this);
    this.removeRow = this.removeRow.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  toggle() {
    this.setState((prevState) => ({ collapse: !prevState.collapse }));
    // Unhide/hide Search button if toggled
    this.props.toggleSearchBtn();
  }

  addRow() {
    this.setState((prevState) => ({
      rows: [...prevState.rows, { criteria: this.props.options[0], value: '' }]
    }));
  }

  removeRow(i) {
    const rows = this.state.rows;
    rows.splice(i, 1);
    this.setState({ rows: rows });
  }

  handleChange(i, event) {
    const { name, value } = event.target;
    const rows = this.state.rows;
    rows[i][name] = value;
    this.setState({ rows: rows });
  }

  // Build query string
  doAdvSearch(e) {
    // Pre-search state resets
    this.props.getAdvResults([], 'Searching...');

    // Disable form submit
    if (e) {
      e.preventDefault();
    }

    const duplicateCriteria = [];
    const params = {};
    const rows = this.state.rows;

    // Place Advanced Search Input into Param object
    rows.forEach(function(row) {
      // Remove spaces and ensure first letter is lowercase
      const criteriaInput = (row.criteria).replace(/\s/g, '');
      const criteria = criteriaInput.charAt(0).toLowerCase() + criteriaInput.slice(1);
      // Get first string from input field
      const val = (row.value).trim().split(' ')[0];

      // Check if duplicate criteria entered
      if (!(duplicateCriteria.includes(criteria)) && (val.length > 0)) {
        duplicateCriteria.push(criteria);

        // Add to params object
        params[criteria] = encodeURIComponent(val);
      }
    });

    // Get project information
    const oid = this.props.project.org;
    const pid = this.props.project.id;
    const bid = this.props.match.params.branchid;
    // Check for Basic Search input
    const basicQuery = ((this.props.query).trim().length > 0) ? this.props.query : null;
    // Check for Advanced Search input
    let queryStr = (Object.entries(params).length > 0)
      ? Object.keys(params).map(key => key.concat('=', params[key])).join('&') : null;
    // Build URL
    const url = (basicQuery)
      ? `/api/orgs/${oid}/projects/${pid}/branches/${bid}/elements/search`
      : `/api/orgs/${oid}/projects/${pid}/branches/${bid}/elements`;

    // Cases for Search input:
    //  1 - Basic and Advanced search criteria entered
    //  2 - Advanced search criteria entered
    //  3 - Basic search criteria entered
    //  4 - No input (Do Nothing)
    if ((basicQuery) && (queryStr)) {
      queryStr = `?q=${this.props.query}&${queryStr}`;
    }
    else if (queryStr) {
      queryStr = `?${queryStr}`;
    }
    else if (basicQuery) {
      queryStr = `?q=${this.props.query}`;
    }
    else {
      this.setState({ results: [] });
      this.props.getAdvResults([], '');
      return;
    }

    // Append search to URL
    this.props.history.push({
      pathname: this.props.location.pathname,
      search: queryStr
    });

    // Setup request to API endpoint with query
    this.setState({
      query: queryStr
    }, () => {
      // Do ajax request
      const start = new Date();
      $.ajax({
        method: 'GET',
        url: `${url}${this.state.query}&limit=100&minified=true`,
        statusCode: {
          401: () => {
            // Refresh when session expires
            window.location.reload();
          }
        }
      })
      .done(data => {
        const end = new Date();
        const elapsed = (end - start) / 1000;

        this.setState({
          results: data,
          message: `Got ${data.length} results in ${elapsed} seconds.`
        }, () => {
          // Re-render page with search results
          this.props.getAdvResults(this.state.results, this.state.message);
        });
      })
      .fail(res => {
        if (res.status === 404) {
          this.setState({ results: [] });
          // Re-render page to display no results found
          this.props.getAdvResults([], '');
        }
      });
    });
  }

  // Generate JSX for advanced rows
  createRowUI() {
    const opt = this.props.options;
    const options = opt.map((option, i) => <option key={i} value={option}> {option} </option>);
    return this.state.rows.map((row, id) => (
      <AdvancedRow idx={id} key={id}
              criteria={row.criteria || opt[0]}
              val={row.value}
              options={ options }
              handleChange={this.handleChange}
              deleteRow={this.removeRow}/>
    ));
  }

  componentDidMount() {
    // Hide Search button if Advanced Search is toggled
    if (this.state.collapse) {
      this.props.toggleSearchBtn();
    }
    // Perform API call if user has entered search terms into the URL
    if (this.state.query) {
      this.doAdvSearch();
    }
  }

  render() {
    // Limit adding rows to number of options.
    const btnAddRow = (this.state.rows.length < this.props.options.length)
      ? <Button id='btn-add-adv-row' type='button' onClick={this.addRow.bind(this)}>+ Add Row</Button>
      : null;
    return (
      <div className='adv-search'>
        <Button id='btn-adv-search-toggle'
                onClick={this.toggle}>
                Advanced
        </Button>
        <Collapse isOpen={this.state.collapse}>
          <Col className='adv-col' md={10}>
            <Card id='adv-card'>
              <CardBody id='adv-card-body'>
                <h5 id='frm-adv-label'>Advanced Search</h5>
                <hr id='adv-separator' />
                <Form id='adv-search-form'>
                  { this.createRowUI() }
                  <InputGroup id='adv-btns-grp' className='adv-search-row'>
                    <Col className='adv-col' md={3}>
                      { btnAddRow }
                    </Col>
                    <Button id='btn-adv-search'
                            outline color='primary'
                            type='submit'
                            onClick={this.doAdvSearch.bind(this)}>
                            Advanced Search
                    </Button>
                  </InputGroup>
                </Form>
              </CardBody>
            </Card>
          </Col>
        </Collapse>
      </div>
    );
  }

}

export default AdvancedSearch;
