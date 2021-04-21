/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.search.search
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author James Eckstein
 *
 * @description This renders the search form.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
import {
  Button,
  Card,
  CardBody,
  Row,
  Col,
  Collapse,
  DropdownMenu,
  DropdownToggle,
  Form,
  FormGroup,
  Input,
  InputGroup,
  Label,
  UncontrolledButtonDropdown, Spinner
} from 'reactstrap';

// Import MBEE Modules
import AdvancedRow from './advanced-search/advanced-row.jsx';
import AdvancedFilter from './advanced-search/advanced-filter.jsx';
import SearchResults from './search-results.jsx';
import BranchBar from '../branches/branch-bar.jsx';

/* eslint-enable no-unused-vars */

class Search extends Component {

  constructor(props) {
    super(props);

    const rows = [];
    const params = this.props.location.search.slice(1) || null;
    const filters = {
      archivedBy: false,
      archivedOn: false,
      branch: false,
      createdBy: false,
      createdOn: false,
      custom: false,
      documentation: false,
      lastModifiedBy: false,
      name: false,
      org: false,
      parent: false,
      project: false,
      source: false,
      target: false,
      type: false,
      updatedOn: false
    };

    const options = ['Parent', 'Source', 'Target', 'Type', 'Created By', 'Archived By', 'Last Modified By'];
    let basicQuery = '';

    // Parse URL parameters
    if (params) {
      params.split('&').forEach(pair => {
        const [param, value] = pair.split('=');
        const decodedVal = decodeURIComponent(value);
        // Update element filter checkbox values for specified fields
        if (param === 'fields') {
          // Decode commas in fields
          const fields = decodedVal.split(',');
          fields.forEach(field => { filters[field] = true; });
        }
        else if (param !== 'q' && param !== 'query') {
          // Add the parameter to rows to be rendered.
          rows.push({
            // eslint-disable-next-line no-undef
            criteria: convertCase(param, 'proper'),
            value: decodedVal
          });
        }
        else if (param === 'q' || param === 'query') {
          basicQuery = decodedVal;
        }
      });
    }

    this.state = {
      rows: (rows.length === 0) ? [{ criteria: options[0], value: '' }] : rows,
      query: params || '',
      basicQuery: basicQuery || '',
      results: null,
      collapse: (rows.length > 0),
      currentFilters: filters,
      page: 1,
      apiUrl: '',
      message: '',
      options: options
    };

    this.toggle = this.toggle.bind(this);
    this.addRow = this.addRow.bind(this);
    this.removeRow = this.removeRow.bind(this);
    this.onChange = this.onChange.bind(this);
    this.doSearch = this.doSearch.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleOnEnterKey = this.handleOnEnterKey.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.filterSelected = this.filterSelected.bind(this);
  }

  toggle() {
    this.setState((prevState) => ({ collapse: !prevState.collapse }));
  }

  addRow() {
    this.setState((prevState) => ({
      rows: [...prevState.rows, { criteria: this.state.options[0], value: '' }]
    }));
  }

  removeRow(i) {
    const rows = this.state.rows;
    rows.splice(i, 1);
    this.setState({ rows: rows });
  }

  onChange(event) {
    this.setState({ [event.target.name]: event.target.value });
  }

  handleChange(i, event) {
    const { name, value } = event.target;
    const rows = this.state.rows;
    rows[i][name] = value;
    this.setState({ rows: rows });
  }

  // Handle when enter key pressed to begin search.
  handleOnEnterKey(event) {
    if (event.key === 'Enter') {
      this.doSearch();
    }
  }

  // Handle filter checkbox changes
  filterSelected(i, event) {
    const filter = event.target.name;
    const currentFilters = this.state.currentFilters;
    currentFilters[filter] = !this.state.currentFilters[filter];
    this.setState({ currentFilters: currentFilters });
  }

  // Handles prev/next button changes for Search Results
  handlePageChange(results, page) {
    this.setState({ results: results, page: page });
  }

  // Generate query string and make API call
  doSearch(e) {
    // Pre-search state resets
    this.setState({
      message: '',
      results: 'Searching ...',
      page: 1
    });

    // Disable form submit
    if (e) {
      e.preventDefault();
    }

    const oid = this.props.project.org;
    const pid = this.props.project.id;
    const bid = this.props.match.params.branchid;
    const duplicates = [];
    const params = {};
    const rows = this.state.rows;
    const basicQuery = ((this.state.basicQuery).trim().length > 0) ? this.state.basicQuery : null;
    const url = (basicQuery)
      ? `/api/orgs/${oid}/projects/${pid}/branches/${bid}/elements/search`
      : `/api/orgs/${oid}/projects/${pid}/branches/${bid}/elements`;

    // Parse (Advanced) Rows of k/v pairs into params object
    rows.forEach(function(row) {
      // Convert search criteria to corresponding API format
      // eslint-disable-next-line no-undef
      const criteria = convertCase(row.criteria, 'api');
      const val = (row.value).trim().split(' ')[0];

      // Check if duplicate criteria entered
      if (!(duplicates.includes(criteria)) && (val.length > 0)) {
        duplicates.push(criteria);
        params[criteria] = encodeURIComponent(val);
      }
    });

    // Build query string for Advanced Search input
    let query = (Object.entries(params).length > 0)
      ? Object.keys(params).map(key => key.concat('=', params[key])).join('&') : null;

    // Cases for Search input:
    //  1 - Basic and Advanced search criteria entered
    //  2 - Advanced search criteria entered
    //  3 - Basic search criteria entered
    if ((basicQuery) && (query)) {
      query = `?q=${basicQuery}&${query}`;
    }
    else if (query) {
      query = `?${query}`;
    }
    else if (basicQuery) {
      query = `?q=${basicQuery}`;
    }

    // Append search to URL
    this.props.history.push({
      pathname: this.props.location.pathname,
      search: query
    });

    // Setup request to API endpoint with query
    this.setState({
      query: query
    }, () => {
      $.ajax({
        method: 'GET',
        // Limit to 11 results per page
        url: `${url}${this.state.query}&limit=11&minified=true`,
        statusCode: {
          401: () => {
            // Refresh when session expires
            window.location.reload();
          }
        }
      })
      .done(data => {
        this.setState({
          results: data,
          apiUrl: `${url}${this.state.query}&limit=11&minified=true`
        });
      })
      .fail(res => {
        if (res.status === 404) {
          this.setState({ results: [], message: 'No results found.' });
        }
      });
    });
  }

  // Generate JSX for advanced rows
  createRowUI() {
    const opts = this.state.options;
    const options = opts.map((option, i) => <option key={i} value={option}> {option} </option>);
    return this.state.rows.map((row, id) => (
      <AdvancedRow idx={id} key={id}
                   criteria={row.criteria || opts[0]}
                   val={row.value}
                   options={options}
                   handleChange={this.handleChange}
                   onKeyDown={this.handleOnEnterKey}
                   deleteRow={this.removeRow}/>
    ));
  }

  // Generate JSX for element filter options
  createFilters() {
    const currentFilters = this.state.currentFilters;
    const filters = [];
    // Build component with filter input
    Object.keys(currentFilters).forEach((filter, id) => {
      // Build filter checkbox component
      filters.push(
        <AdvancedFilter key={`adv-option-key-${id}`}
                        idx={id}
                        filter={filter}
                        /* eslint-disable-next-line no-undef */
                        display={convertCase(filter, 'proper')}
                        checked={currentFilters[filter]}
                        filterSelected={this.filterSelected}/>
      );
    });

    return filters;
  }

  componentDidMount() {
    // Perform API call if user has entered search terms into the URL
    if (this.state.query) {
      this.doSearch();
    }
  }

  render() {
    // Limit adding rows to number of options.
    const btnAddRow = (Object.keys(this.state.rows).length < this.state.options.length)
      ? <Button id='btn-add-adv-row' type='button' onClick={this.addRow.bind(this)}>+ Add Row</Button>
      : null;

    // Default to ID, Name, Parent, Type results headers if no filters are selected.
    const filters = this.state.currentFilters;
    const selectedFilters = Object.keys(filters).filter(filter => filters[filter]);
    const headers = (selectedFilters.length > 0)
      ? ['id'].concat(selectedFilters)
      : ['id', 'name', 'parent', 'type'];

    // Set search results or loading icon...
    const searchResults = (this.state.results === 'Searching ...')
      ? (<div style={{ width: '100%', textAlign: 'center' }}>
           <Spinner type="grow" color="primary" />
           <span style={{ paddingLeft: '20px' }}>Searching ...</span>
         </div>)
      : (<SearchResults results={this.state.results}
                        page={this.state.page}
                        apiUrl={this.state.apiUrl}
                        headers={headers}
                        handlePageChange={this.handlePageChange}
                        {...this.props}/>);

    // Create array of Advanced Filter components
    const filterCols = this.createFilters();

    return (
      <div id='view'>
        <div id={'search'}>
          { /* Branch selector */ }
          <div id='search-branch-bar'>
            <BranchBar project={this.props.project}
                       branchid={this.props.match.params.branchid}
                       endpoint='/search'/>
          </div>
          { /* Search Form */ }
          <Form id={'search-form'} className={'search-form'} inline>
            <Row form>
              <Col md={10} sm={8} xs={6}>
                { /* Search Query Input */ }
                <div id={'search-input-box'}>
                  <Button id='btn-adv-search-toggle' onClick={this.toggle}>
                    <span>
                      <i className='fas fa-bars' style={{ fontSize: '15px' }}/>
                    </span>
                  </Button>
                  <Input type="text"
                         name="basicQuery"
                         id="search-query-input"
                         placeholder="Search"
                         value={this.state.basicQuery || ''}
                         onChange={this.onChange}
                         onKeyDown={this.handleOnEnterKey}
                  />
                  <Button id='btn-search' onClick={this.doSearch}>
                    <span>
                      <i className='fas fa-search' style={{ fontSize: '15px' }}/>
                    </span>
                  </Button>
                </div>
                { /* Advanced Search Original Component */ }
                <Collapse isOpen={this.state.collapse}>
                  <Card id='adv-card'>
                    <CardBody id='adv-card-body'>
                      { /* Advanced Search Header Label and Element Filter */ }
                      <FormGroup row id='adv-search-header' >
                        <h5 id='frm-adv-label'>Advanced Search</h5>
                        <div id='adv-filter-btn'>
                          <UncontrolledButtonDropdown>
                            <DropdownToggle close
                                            id='adv-filter-toggle'
                                            aria-label='Filter Results'
                                            size='sm'>
                              <span>
                                <i className='fas fa-ellipsis-v' style={{ fontSize: '15px' }}/>
                              </span>
                            </DropdownToggle>
                            <DropdownMenu right className='multi-column' id='filter-menu' sm={12}>
                              { /* Create checkbox options for element filters */ }
                              { /* Divide elements into columns of '6, 5, 6' filters */ }
                              <Row>
                                <Label id='adv-filter-label' style={{ fontSize: '14px' }}>
                                  Element Filters
                                </Label>
                              </Row>
                              <hr id='adv-filter-separator' />
                              <Row id='adv-filter-frm'>
                                <Col sm={4} className='adv-filter-col'>
                                  { filterCols.slice(0, 6) }
                                </Col>
                                <Col sm={4} className='adv-filter-col'>
                                  { filterCols.slice(6, 11) }
                                </Col>
                                <Col sm={4} className='adv-filter-col'>
                                  { filterCols.slice(11, 16) }
                                </Col>
                              </Row>
                            </DropdownMenu>
                          </UncontrolledButtonDropdown>
                        </div>
                      </FormGroup>
                      <hr id='adv-separator' />
                      { /* Input Rows for Search Criteria */ }
                      <React.Fragment>
                        { this.createRowUI() }
                        <InputGroup id='adv-btns-grp' className='adv-search-row'>
                          <Col className='adv-col' md={3}>
                            { btnAddRow }
                          </Col>
                          <Button id='btn-adv-search'
                                  outline color='primary'
                                  type='submit'
                                  onClick={this.doSearch.bind(this)}>
                            Search
                          </Button>
                        </InputGroup>
                      </React.Fragment>
                    </CardBody>
                  </Card>
                </Collapse>
                { searchResults }
              </Col>
             </Row>
          </Form>
        </div>
      </div>
    );
  }

}

export default Search;
