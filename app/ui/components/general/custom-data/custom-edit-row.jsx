/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.general.custom-data.custom-edit-row
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author James Eckstein
 *
 * @description This renders an Input Row consisting of a key/value pair.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React from 'react';
import { Col, Input, InputGroup, Button } from 'reactstrap';

/* eslint-enable no-unused-vars */

function CustomEditRow(props) {
  // Render delete button if there is more than 1 row
  const btnDeleteRow = (props.idx !== 0)
    ? <Button close className='custom-row-del' onClick={() => props.deleteRow(props.idx)}/>
    : <Button close className='custom-row-del' disabled={true} style={{ color: 'transparent' }}/>;

  // Verify if custom data exists
  return (
    <div key={props.idx} className='custom-kv-row'>
      <InputGroup>
        <Col className='custom-key-col' sm='4'>
          <Input name='key'
                 className='custom-key-field'
                 placeholder='Key'
                 invalid={props.invalid}
                 onChange={(event) => props.handleChange(props.idx, event)}
                 value={props.keyName}>
          </Input>
        </Col>
        <Col className='custom-value-col'>
          <Input name='value'
                 className='custom-value-field'
                 placeholder='Value'
                 onChange={(event) => props.handleChange(props.idx, event)}
                  /* eslint-disable-next-line no-undef */
                 value={decodeHTML(props.keyValue)}>
          </Input>
        </Col>
        { btnDeleteRow }
      </InputGroup>
    </div>
  );
}

export default CustomEditRow;
