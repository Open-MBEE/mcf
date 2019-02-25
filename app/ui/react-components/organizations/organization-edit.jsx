/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.organizations
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the organization edit page.
 */
import React, { Component } from 'react';
import {Form, FormGroup, Label, Input, FormFeedback, Button} from 'reactstrap';
import validators from '../../../../build/json/validators.json';

class OrganizationEdit extends Component{
    constructor(props) {
        super(props);

        this.handleChange = this.handleChange.bind(this);
        this.onSubmit = this.onSubmit.bind(this);

        this.state = {
            name: this.props.org.name,
            username: '',
            permissions: '',
            custom: JSON.stringify(this.props.org.custom || {}, null, 2)
        }
    }

    handleChange(event) {
        this.setState({ [event.target.name]: event.target.value});
    }

    onSubmit(){
        const username = this.state.username;
        const permissions = this.state.permissions;

        let data = {
            name: this.state.name,
            custom: JSON.parse(this.state.custom)
        };

        if(username && permissions) {
            data = {
                    name: this.state.name,
                    permissions: {
                        [username]: this.state.permissions
                    },
                    custom: JSON.parse(this.state.custom)
                };
        }

        jQuery.ajax({
            method: "PATCH",
            url: `/api/orgs/${this.props.org.id}`,
            data: data
        })
        .done((msg, status) => {
            window.location.replace(`/${this.props.org.id}`);
        })
        .fail((msg) => {
            alert( `Update Failed: ${msg.responseJSON.description}`);
        });
    }

    render() {
        let nameInvalid;
        let customInvalid;
        let disableSubmit;

        if(!RegExp(validators.org.name).test(this.state.name)) {
            nameInvalid = true;
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
            <div className='org-edit'>
                <h2>Organization Edit</h2>
                <hr />
                <div>
                    <Form>
                        <FormGroup>
                            <Label for="name">Organization Name</Label>
                            <Input type="name"
                                   name="name"
                                   id="name"
                                   placeholder="Organization name"
                                   value={this.state.name || ''}
                                   invalid={nameInvalid}
                                   onChange={this.handleChange}/>
                        </FormGroup>

                        <FormGroup>
                            <Label for="permissions">Organization Permissions</Label>
                            <FormGroup className='nested-form'>
                                <Label>Username</Label>
                                <Input type="username"
                                       name="username"
                                       id="username"
                                       placeholder="Username"
                                       value={this.state.username || ''}
                                       onChange={this.handleChange}/>
                            </FormGroup>

                            <FormGroup className="nested-form">
                                <Label for="permissions">Permissions</Label>
                                <Input type="select"
                                       name='permissions'
                                       id="permissions"
                                       placeholder="Choose one..."
                                       value={this.state.permissions}
                                       onChange={this.handleChange}>
                                    <option>Choose one...</option>
                                    <option>read</option>
                                    <option>write</option>
                                    <option>admin</option>
                                    <option>REMOVE_ALL</option>
                                </Input>
                            </FormGroup>
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
            </div>
        )
    }
}

export default OrganizationEdit
