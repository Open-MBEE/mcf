/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.general.custom-data.custom-edit
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author James Eckstein
 *
 * @description This renders the custom data edit view.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
import {
  Row,
  Col,
  Nav,
  NavItem,
  NavLink,
  Input,
  Button,
  Card,
  CardBody,
  TabPane,
  TabContent, Label, FormFeedback, FormGroup, Form
} from 'reactstrap';
import classnames from 'classnames';

// MBEE modules
import CustomEditRow from './custom-edit-row.jsx';
/* eslint-enable no-unused-vars */

class CustomEdit extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Parse custom data object into rows
    const custom = JSON.parse(props.data);
    const rows = Object.keys(custom).map(key => ({ key: key, value: custom[key] }));

    // Initialize state props
    this.state = {
      rows: (rows.length === 0) ? [{ key: '', value: '' }] : rows,
      error: '',
      activeTab: '1'
    };

    // Bind Component Functions
    this.toggle = this.toggle.bind(this);
    this.addRow = this.addRow.bind(this);
    this.removeRow = this.removeRow.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.updateParent = this.updateParent.bind(this);
    this.listDuplicates = this.listDuplicates.bind(this);
  }

  // Handle changing tabs
  toggle(tab) {
    if (this.state.activeTab !== tab) {
      this.setState({ activeTab: tab });
    }
  }

  // Handle adding Row for Key/Value pair input
  addRow() {
    const rows = this.state.rows;
    rows.push({ key: '', value: '' });
    this.updateParent(rows);
  }

  // Remove key/value pair from custom data object
  removeRow(idx) {
    const rows = this.state.rows;
    rows.splice(idx, 1);
    this.updateParent(rows);
  }

  // Handle updates to Key/Value input fields.
  handleChange(idx, event) {
        const { name, value } = event.target;
    const rows = this.state.rows;
    rows[idx][name] = value;
    this.updateParent(rows);
  }

  // Returns array of duplicate keys in custom data
  // eslint-disable-next-line class-methods-use-this
  listDuplicates(rows) {
    // Extract keys from custom data rows
    const keys = rows.map(row => row.key);
    const count = keys.reduce((acc, key) => ({ ...acc, [key]: (acc[key] || 0) + 1 }), {});
    return Object.keys(count).filter((elem) => count[elem] > 1);
  }

  // Pass custom data rows to parent form
  updateParent(rows) {
    // Check if valid JSON custom data
    const error = (this.listDuplicates(rows).length > 0) ? 'Invalid: Duplicate keys in JSON' : '';
    this.props.customChange(rows, error);
    this.setState({ rows: rows, error: error });
  }

  // Returns row for each key/value pair to be rendered
  createRows(duplicates) {
    return this.state.rows.map((row, index) => (
      <CustomEditRow idx={index} key={`key-${index}`}
                     keyName={row.key}
                     keyValue={row.value}
                     invalid={!!(duplicates.includes(row.key))}
                     handleChange={this.handleChange}
                     deleteRow={this.removeRow}>
      </CustomEditRow>
    ));
  }

  // Handle custom data props updates
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevState.activeTab !== this.state.activeTab) {
      // Parse custom data object into rows
      try {
        const custom = JSON.parse(this.props.data);
        const rows = Object.keys(custom).map(key => ({
          key: key,
          value: (typeof custom[key] === 'string') ? custom[key] : JSON.stringify(custom[key])
        }));
        this.setState({
          rows: (rows.length === 0) ? [{ key: '', value: '' }] : rows,
          error: ''
        });
      }
      catch (err) {
        this.setState({ error: 'Invalid: Custom data must be valid JSON' });
      }
    }
  }

  render() {
    // const custom = {};
    const rows = this.state.rows;
    const duplicates = (rows.length > 0) ? this.listDuplicates(rows) : '';
    let message = this.state.error;
    const invalidWarn = (message.length > 0)
      ? <div style={{ display: 'block' }} className="invalid-feedback">{ message }</div>
      : '';
    let customInvalid = false;

    // Verify if custom data is correct JSON format
    if (duplicates.length > 0 || invalidWarn) {
      // Set invalid fields
      customInvalid = true;
      message = 'Invalid: Custom data must be valid JSON';
    }

    // Parse objects for raw view
    if (this.state.activeTab === '2') {
      // Resize custom data field
      $('textarea[name="custom"]').autoResize();

      // Parse custom data input values
            try {
        JSON.parse(this.props.data);
      }
      catch (err) {
        customInvalid = true;
        message = 'Invalid: Custom data must be valid JSON';
      }
    }

    return (
      <div>
        <Label>Custom Data</Label>
        <Nav id={'custom-input-nav'} tabs>
          <NavItem>
            <NavLink className={classnames({ active: this.state.activeTab === '1' })}
                     disabled={customInvalid}
                     onClick={() => { this.toggle('1'); }}>
              Form
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink className={classnames({ active: this.state.activeTab === '2' })}
                     disabled={customInvalid}
                     onClick={() => { this.toggle('2'); }}>
              Raw
            </NavLink>
          </NavItem>
        </Nav>
        <TabContent activeTab={this.state.activeTab}>
          <TabPane tabId='1'>
            {/* Section for key/value rows of custom data */}
            <Row>
              <Col sm='12'>
                <div id={'custom-form'}>
                  { this.createRows(duplicates) }
                  { invalidWarn }
                  <Button id='btn-add-kv-pair'
                          type='button'
                          outline color='primary'
                          disabled={false}
                          onClick={this.addRow.bind(this)}>
                    + Add Key/Value Pair
                  </Button>
                </div>
              </Col>
            </Row>
          </TabPane>
          <TabPane tabId='2'>
            {/* Section for raw custom data */}
            <FormGroup>
              <Input type="textarea"
                     name="custom"
                     id="custom"
                     placeholder="Custom Data"
                     /* eslint-disable-next-line no-undef */
                     value={this.props.data}
                     invalid={customInvalid}
                     onChange={this.props.handleChange}/>
              {/* Verify fields are valid, or display feedback */}
              <FormFeedback>
                { message }
              </FormFeedback>
            </FormGroup>
          </TabPane>
        </TabContent>
      </div>
    );
  }

}

export default CustomEdit;
