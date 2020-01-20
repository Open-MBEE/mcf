/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.element-textbox
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Danny Chiu
 *
 * @author Danny Chiu
 *
 * @description This renders a text box.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React from 'react';
import {
  FormGroup,
  Label,
  Input,
  Col
} from 'reactstrap';

/* eslint-enable no-unused-vars */

function ElementTextbox(props) {
  const { name, label, value, id, disabled, children, placeholder, onChange } = props;
  return (
    <React.Fragment>
      <Col sm={2} style={{ paddingRight: 1 }}>
        <Label for={id} style={{ fontSize: 13, margin: 0 }}>
          {label} {children}
        </Label>
      </Col>
      <Col sm={4} style={{ paddingLeft: 0 }}>
        <Input type="text"
               name={name}
               value={value || 'null'}
               id={id}
               disabled={disabled}
               placeholder={placeholder}
               onChange={onChange}
               style={{ fontSize: 14 }}/>
      </Col>
    </React.Fragment>
  );
}

export default ElementTextbox;
