import React, { Component } from 'react';

import './TextInput.css';
import '../../ComponentStyles.css';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default class TextInput extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: "",
            area: false
        };
    this.handleDateChange = this.handleDateChange.bind(this);
    this.onInputChange = this.onInputChange.bind(this);
    this.myRef = React.createRef();
    }

    componentWillUnmount() {
        this.props.updateCallback(this.props.item.linkId,  
            {"type":this.props.inputTypeDisplay,
            "text":this.props.item.text,
            "valueType": this.props.valueType,
            "ref":this.myRef,
            "enabled": false}, "itemTypes");
    }

    componentDidMount() {
        // setup initial value from qForm
        const value = this.props.retrieveCallback(this.props.item.linkId);
        if(value) {
            this.setState({value: value});
        }
        if(this.props.inputType==="textArea"){
            this.setState({area:true});
        }

        this.props.updateCallback(this.props.item.linkId, 
            {"type":this.props.inputTypeDisplay,
            "text":this.props.item.text,
            "valueType": this.props.valueType,
            "ref":this.myRef,
            "enabled": true}
            , "itemTypes")

    }

    onInputChange(event) {
        if (this.props.valueType === 'valueAttachment'){
            this.setState({value: event.target.value})
            console.log("Input change",event.target.files,event.target.value );
            let file = event.target.files[0];
            let content_type = file.type;
            let file_name = file.name;
            var fileValue = {}
            let self = this;
            var reader = new FileReader();
            reader.onload = function (e) {
                // get file content  
                fileValue = {
                    "data": reader.result,
                    "contentType": content_type,
                    "title": file_name,
                    "language": "en"
                }
                console.log(fileValue, JSON.stringify(fileValue));
                // update the parent state
                self.props.updateCallback(self.props.item.linkId, fileValue, "values")
            }
            reader.readAsBinaryString(file);
        } else{
            // update the parent state
            this.props.updateCallback(this.props.item.linkId, event.target.value, "values")
            // update local state
            this.setState({value: event.target.value})
        }
    }

     handleDateChange(value) {
        // update the parent state
        this.props.updateCallback(this.props.item.linkId, value, "values")

        // update local state
        this.setState({value: value})
    }

    render() {
        return (
            <div className="text-input" ref={this.myRef}>
                <div className="text-input-label">{this.props.inputTypeDisplay}</div>
                {this.state.area?
                    <textarea 
                        className="form-control" 
                        value = {this.state.value} 
                        onChange={this.onInputChange}>
                    </textarea>
                    :
		    
                    <input className="form-control" 
                        type={this.props.inputType} 
                        value = {this.state.value} 
                        onChange={this.onInputChange}
                        readOnly={this.props.item.readOnly}>
                         
                    </input>
                }
            </div>
        );
    }
}
