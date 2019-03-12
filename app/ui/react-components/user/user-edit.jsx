/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.user
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the user's edit page.
 */
import React, { Component } from 'react';
import {Form, FormGroup, Label, Input, FormFeedback, Button} from 'reactstrap';
import validators from '../../../../build/json/validators.json';

class UserEdit extends Component{
    constructor(props) {
        super(props);

        this.handleChange = this.handleChange.bind(this);
        this.onSubmit = this.onSubmit.bind(this);

        this.state = {
            fname: this.props.user.fname,
            lname: this.props.user.lname,
            custom: JSON.stringify(this.props.user.custom || {}, null, 2)
        }
    }

    handleChange(event) {
        this.setState({ [event.target.name]: event.target.value});
    }

    onSubmit(){
        jQuery.ajax({
            method: "PATCH",
            url: `/api/users/${this.props.user.username}`,
            data: {
                fname: this.state.fname,
                lname: this.state.lname,
                custom: JSON.parse(this.state.custom)
            }
        })
        .done((msg, status) => {
            window.location.replace('/whoami');
        })
        .fail((msg) => {
            alert( `Update Failed: ${msg.responseJSON.description}`);
        });
    }

    render() {
        let fnameInvalid;
        let lnameInvalid;
        let customInvalid;
        let disableSubmit;

        if(!RegExp(validators.user.fname).test(this.state.fname)) {
            fnameInvalid = true;
            disableSubmit = true;
        }

        if(!RegExp(validators.user.lname).test(this.state.lname)) {
            lnameInvalid = true;
            disableSubmit = true;
        }

        try {
            JSON.parse(this.state.custom);
        }
        catch(err) {
            customInvalid = true;
            disableSubmit = true;
        }

        return (
            <div className='user-edit'>
                <Form>
                    <FormGroup>
                        <Label for="fname">User's First Name</Label>
                        <Input type="fname"
                               name="fname"
                               id="fname"
                               placeholder="User's first name"
                               value={this.state.fname || ''}
                               invalid={fnameInvalid}
                               onChange={this.handleChange}/>
                        <FormFeedback >
                            Invalid: A user's first name may only contain letters.
                        </FormFeedback>
                    </FormGroup>

                    <FormGroup>
                        <Label for="lname">User's Last Name</Label>
                        <Input type="lname"
                               name="lname"
                               id="lname"
                               placeholder="User's last name"
                               value={this.state.lname || ''}
                               invalid={lnameInvalid}
                               onChange={this.handleChange}/>
                        <FormFeedback >
                            Invalid: A user's last name may only contain letters.
                        </FormFeedback>
                    </FormGroup>

                    <FormGroup>
                        <Label for="custom">Custom Data</Label>
                        <Input type="custom"
                               name="custom"
                               id="custom"
                               placeholder="Custom Data"
                               value={this.state.custom || ''}
                               invalid={customInvalid}
                               onChange={this.handleChange}/>
                        <FormFeedback>
                            Invalid: Custom data must be valid JSON
                        </FormFeedback>
                    </FormGroup>
                    <Button disabled={disableSubmit} onClick={this.onSubmit}> Submit </Button>
                </Form>
            </div>
        )
    }
}

export default UserEdit
