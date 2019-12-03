import React, { Component } from 'react';
import urlUtils from "../../util/url";


import './QuestionnaireForm.css';

import Section from '../Section/Section';
import TextInput from '../Inputs/TextInput/TextInput';
import ChoiceInput from '../Inputs/ChoiceInput/ChoiceInput';
import BooleanInput from '../Inputs/BooleanInput/BooleanInput';
import QuantityInput from '../Inputs/QuantityInput/QuantityInput';
import { findValueByPrefix } from '../../util/util.js';
import OpenChoice from '../Inputs/OpenChoiceInput/OpenChoice';
import DocumentInput from '../Inputs/DocumentInput/DocumentInput';
import { isTSEnumMember } from '@babel/types';

import Select from "react-dropdown-select";
import providerOptions from "../../providerOptions.json";
import { faCarrot } from '@fortawesome/free-solid-svg-icons';
import Loader from 'react-loader-spinner';

// const state = urlUtils.getUrlParameter("state"); // session key
// const code = urlUtils.getUrlParameter("code"); // authorization code
// console.log(state);
// const state = sessionStorage["launchContextId"]
// const params = JSON.parse(sessionStorage[state]); // load app session
// const tokenUri = params.tokenUri;
// const clientId = params.clientId;
// const secret = params.secret;
const tokenUri = "https://auth.mettles.com:8443/auth/realms/ProviderCredentials/protocol/openid-connect/token";
export default class QuestionnaireForm extends Component {
    constructor(props) {
        super(props);
        if (!sessionStorage.hasOwnProperty("providerSource")) {
            sessionStorage["providerSource"] = 1
        }
        this.state = {
            containedResources: null,
            items: null,
            itemTypes: {},
            values: {
                "1.1": "henlo"
            },
            orderedLinks: [],
            sectionLinks: {},
            fullView: true,
            turnOffValues: [],
            files: [],
            communicationJson: {},
            displayQuestionnaire: true,
            claimResponse: {},
            claimMessage: "",
            otherProvider: false,
            otherProviderName: "",
            providerQueries: [],
            communicationRequestId: '',
            providerSource: sessionStorage["providerSource"],
            loading: false,
            resloading: false
        };

        this.updateQuestionValue = this.updateQuestionValue.bind(this);
        this.updateNestedQuestionValue = this.updateNestedQuestionValue.bind(this);
        this.updateDocuments = this.updateDocuments.bind(this);
        this.renderComponent = this.renderComponent.bind(this);
        this.retrieveValue = this.retrieveValue.bind(this);
        this.outputResponse = this.outputResponse.bind(this);
        this.reloadClaimResponse = this.reloadClaimResponse.bind(this);
        this.onChangeOtherProvider = this.onChangeOtherProvider.bind(this);
        this.getProviderQueries = this.getProviderQueries.bind(this);
        this.renderQueries = this.renderQueries.bind(this);
        this.onChangeProviderQuery = this.onChangeProviderQuery.bind(this);
        this.setProviderSource = this.setProviderSource.bind(this);
        this.submitCommunicationRequest = this.submitCommunicationRequest.bind(this);
        this.relaunch = this.relaunch.bind(this);
    }

    relaunch() {
        let serviceUri = sessionStorage["serviceUri"]
        let launchContextId = sessionStorage["launchContextId"]
        let launchUri = sessionStorage["launchUri"]
        console.log(launchUri + "?launch=" + launchContextId + "&iss=" + serviceUri);
        window.location.href = launchUri + "?launch=" + launchContextId + "&iss=" + serviceUri;
        // this.props.history.push();
    }
    componentWillMount() {
        // setup
        // get all contained resources
        if (this.props.qform.contained) {
            this.distributeContained(this.props.qform.contained)
        }
        const items = this.props.qform.item;
        this.setState({ items });
        const links = this.prepopulate(items, []);
        this.setState({ orderedLinks: links });
        this.getProviderQueries(items);
    }

    setProviderSource(values) {
        console.log(this.state);
        if (values.length > 0) {
            this.setState({ "providerSource": values[0].value });
            sessionStorage["providerSource"] = values[0].value;
            console.log("options---", providerOptions)
            providerOptions.forEach((p) => {
                if (p.value === values[0].value) {
                    this.setState({ "otherProviderName": p.label });
                    sessionStorage["otherProviderUrl"] = p.url;
                    console.log("Selected PRovider URi", p.url)
                }
            })
            // sessionStorage["serviceUri"] = values[0].url;
        }
    }

    getProviderQueries(questions) {
        console.log("In get queries------", questions);
        let queries = this.state.providerQueries;
        // let questions = this.state.items;
        questions.forEach((group) => {
            if (group.type === "group") {
                group.item.forEach((link) => {
                    if (link.type === "attachment" && link.code !== undefined) {
                        console.log("Intype attachemnt---", link);
                        let eachQuery = {
                            "id": link.linkId,
                            "name": link.text,
                            "type": "attachment",
                            "code": link.code,
                            "checked": false
                        }
                        queries.push(eachQuery);
                    }
                })
            }
        })
        if (sessionStorage["fhir_queries"] !== undefined) {
            let fhir_queries = JSON.parse(sessionStorage["fhir_queries"]);
            fhir_queries.forEach((query, key) => {
                let code = "";
                if (query.query["code"] !== undefined) {
                    code = "code=" + query.query["code"];
                }
                let eachQuery = {
                    "id": "fhir_" + key,
                    "name": query.type,
                    "type": "query",
                    "code": code,
                    "checked": false
                }
                queries.push(eachQuery);
            })
        }
        this.setState({ providerQueries: queries });
        console.log("Final queries---", this.state.providerQueries);

    }
    componentDidMount() {


    }

    onChangeOtherProvider(event) {
        console.log("other provider----", event.target.value);
        let otherProvider = this.state.otherProvider;
        otherProvider = !otherProvider;
        this.setState({ otherProvider: otherProvider });
    }

    onChangeProviderQuery(event) {
        console.log("event --", event.target.value, event.target.name);
        let queries = this.state.providerQueries;
        queries.forEach((q) => {
            if (q.id === event.target.name) {
                q.checked = !q.checked;
            }
        })
        this.setState({ providerQueries: queries });
        console.log("key, queries--", queries, this.state.providerQueries);
    }

    reloadClaimResponse() {
        var self = this
        this.setState({ resloading: true });
        const Http = new XMLHttpRequest();
        const priorAuthUrl = "http://cmsfhir.mettles.com:8080/drfp/fhir/ClaimResponse/" + this.state.claimResponse.id;
        // const priorAuthUrl = "http://cdex.mettles.com:9000/fhir/ClaimResponse/" + this.state.claimResponse.id;
        Http.open("GET", priorAuthUrl);
        Http.setRequestHeader("Content-Type", "application/fhir+json");
        Http.send();
        Http.onreadystatechange = function () {
            if (this.readyState === XMLHttpRequest.DONE) {
                var message = "";
                self.setState({ displayQuestionnaire: false })
                if (this.status === 200) {
                    var claimResponse = JSON.parse(this.responseText);
                    self.setState({ claimResponse: claimResponse })
                    self.setState({ claimMessage: "Prior Authorization has been submitted successfully" })
                    message = "Prior Authoriza  tion " + claimResponse.disposition + "\n";
                    message += "Prior Authorization Number: " + claimResponse.preAuthRef;
                } else {
                    this.setState({ "claimMessage": "Prior Authorization Request Failed." })
                    message = "Prior Authorization Request Failed."
                }
                self.setState({ resloading: false });
                console.log(message);
                //alert(message);
                console.log(this.responseText);
            }
        }



    }

    evaluateOperator(operator, questionValue, answerValue) {

        switch (operator) {
            case "exists":
                return (answerValue) === (questionValue !== undefined);
            case "=":
                return questionValue === answerValue;
            case "!=":
                return questionValue !== answerValue;
            case "<":
                return questionValue < answerValue;
            case ">":
                return questionValue > answerValue;
            case "<=":
                return questionValue <= answerValue;
            case ">=":
                return questionValue >= answerValue;
            default:
                return questionValue === answerValue;
        }
    }

    retrieveValue(elementName) {
        return this.state.values[elementName];
    }

    updateQuestionValue(elementName, object, type) {
        // callback function for children to update
        // parent state containing the linkIds
        this.setState(prevState => ({
            [type]: {
                ...prevState[type],
                [elementName]: object
            }
        }))
    }

    updateNestedQuestionValue(linkId, elementName, object) {
        this.setState(prevState => ({
            values: {
                ...prevState.values,
                [linkId]: {
                    ...prevState.values[linkId],
                    [elementName]: object
                }
            }
        }))
    }

    updateDocuments(elementName, object) {
        console.log(elementName, object, 'is it workinggg')
        this.setState({ [elementName]: object })
        var fileInputData = {
            "resourceType": "Communication",
            "id": "376",
            "meta": {
                "versionId": "1",
                "lastUpdated": "2018-10-08T07:22:32.421+00:00"
            },
            "status": "preparation",
            "identifier": [
                {
                    "use": "official"
                }
            ],
            "payload": [],
        }
        if (this.state.files != null) {
            for (var i = 0; i < this.state.files.length; i++) {
                (function (file) {
                    let content_type = file.type;
                    let file_name = file.name;
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        // get file content  
                        fileInputData.payload.push({
                            "contentAttachment": {
                                "data": reader.result,
                                "contentType": content_type,
                                "title": file_name,
                                "language": "en"
                            }
                        })
                    }
                    reader.readAsBinaryString(file);
                })(this.state.files[i])
            }
        }
        console.log("Resource Json before communication--", fileInputData);
        // this.props.saveDocuments(this.props.files,fileInputData)
        this.setState({ communicationJson: fileInputData })
        // return fileInputData
    }

    distributeContained(contained) {
        // make a key:value map for the contained
        // resources with their id so they can be 
        // referenced by #{id}
        const containedResources = {};
        contained.forEach((resource) => {
            containedResources[resource.id] = resource;
        });
        this.setState({ containedResources })
    }

    checkEnable(item) {
        if (item.hasOwnProperty("enableWhen")) {
            const enableCriteria = item.enableWhen;
            const results = [];
            // false if we need all behaviorType to be "all"
            const checkAny = enableCriteria.length > 1 ? item.enableBehavior === 'any' : false
            enableCriteria.forEach((rule) => {
                const question = this.state.values[rule.question]
                const answer = findValueByPrefix(rule, "answer");
                if (typeof question === 'object' && typeof answer === 'object') {
                    if (rule.answerQuantity) {
                        // at the very least the unit and value need to be the same
                        results.push(this.evaluateOperator(rule.operator, question.value, answer.value.toString())
                            && this.evaluateOperator(rule.operator, question.unit, answer.unit));
                    } else if (rule.answerCoding) {
                        let result = false;
                        if (Array.isArray(question)) {
                            question.forEach((e) => {
                                result = result || (e.code === answer.code && e.system === answer.system);
                            })
                        }
                        results.push(result);
                    }
                } else {
                    results.push(this.evaluateOperator(rule.operator, question, answer));
                }
            });
            return !checkAny ? results.some((i) => { return i }) : results.every((i) => { return i });
        } else {
            // default to showing the item
            return true;
        }
    }


    prepopulate(items, links) {
        items.map((item) => {
            if (item.item) {
                // its a section/group
                links.push(item.linkId);
                this.prepopulate(item.item, links);
            } else {
                // autofill fields
                links.push(item.linkId);
                // if (item.enableWhen) {
                //     console.log(item.enableWhen);
                // }
                if (item.extension) {
                    item.extension.forEach((e) => {
                        if (e.url === "http://hl7.org/fhir/StructureDefinition/cqif-calculatedValue") {
                            // stu3 
                            const value = findValueByPrefix(e, "value");
                            this.updateQuestionValue(item.linkId, this.props.cqlPrepoulationResults[value], 'values')
                        }
                    })
                }
            }
        })
        return links;
    }

    isNotEmpty(value) {
        return (value !== undefined && value !== null && value !== "" && (Array.isArray(value) ? value.length > 0 : true));
    }

    renderQueries(item, key) {
        return (<div>
            <div key={key} style={{ padding: "15px", paddingBottom: "0px" }}>
                <label>
                    <input type="checkbox" name={item.id} value={this.state.providerQueries[key].checked}
                        onChange={this.onChangeProviderQuery} />
                </label>

                <span style={{ lineHeight: "0.1px" }}>{item.name} &nbsp; {item.type === "attachment" &&
                    <span>
                        (LONIC Code - {item.code.coding[0].code})
                        </span>
                }{item.type === "query" && item.code !== "" &&
                    <span>
                        (With Query - {item.code})
                    </span>
                    }
                </span>
            </div>
        </div>
        )
    }


    renderComponent(item, level) {
        const enable = this.checkEnable(item);
        if (enable && (this.state.turnOffValues.indexOf(item.linkId) < 0)) {
            switch (item.type) {
                case "group":
                    return <Section
                        key={item.linkId}
                        componentRenderer={this.renderComponent}
                        updateCallback={this.updateQuestionValue}
                        item={item}
                        level={level}
                    />
                case "string":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="text"
                        inputTypeDisplay="string"
                        valueType="valueString"
                    />

                case "text":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="textArea"
                        inputTypeDisplay="text"
                        valueType="valueString"
                    />
                case "choice":
                    return <ChoiceInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        containedResources={this.state.containedResources}
                        valueType="valueCoding"
                    />
                case "boolean":
                    return <BooleanInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        valueType="valueBoolean"
                    />
                case "decimal":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="number"
                        inputTypeDisplay="decimal"
                        valueType="valueDecimal"
                    />

                case "url":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="url"
                        inputTypeDisplay="url"
                        valueType="valueUri"
                    />
                case "date":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="date"
                        inputTypeDisplay="date"
                        valueType="valueDate"
                    />
                case "time":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="time"
                        inputTypeDisplay="time"
                        valueType="valueTime"
                    />
                case "dateTime":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="datetime-local"
                        inputTypeDisplay="datetime"
                        valueType="valueDateTime"
                    />

                case "attachment":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="file"
                        inputTypeDisplay="attachment"
                        valueType="valueAttachment"
                    />

                case "integer":
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="number"
                        inputTypeDisplay="valueInteger"
                        valueType="integer"
                    />

                case "quantity":
                    return <QuantityInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateNestedQuestionValue}
                        updateQuestionValue={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputTypeDisplay="quantity"
                        valueType="valueQuantity"
                    />

                case "open-choice":
                    return <OpenChoice
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputTypeDisplay="open-choice"
                        containedResources={this.state.containedResources}
                        valueType={["valueCoding", "valueString"]}
                    />
                default:
                    return <TextInput
                        key={item.linkId}
                        item={item}
                        updateCallback={this.updateQuestionValue}
                        retrieveCallback={this.retrieveValue}
                        inputType="text"
                        inputTypeDisplay="string"
                        valueType="valueString"
                    />
            }
        }
    }

    // create the questionnaire response based on the current state
    outputResponse(status) {
        this.setState({ loading: true });
        console.log(this.state.sectionLinks);
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        const yyyy = today.getFullYear();
        const authored = `${yyyy}-${mm}-${dd}`
        const response = {
            resourceType: "QuestionnaireResponse",
            id: "response1",
            authored: authored,
            status: "completed", //TODO: Get status from somewhere
            item: []

        }
        var self = this;

        let currentItem = response.item;
        let currentLevel = 0;
        let currentValues = [];
        const chain = { 0: { currentItem, currentValues } };
        this.state.orderedLinks.map((item) => {
            const itemType = this.state.itemTypes[item];

            if (Object.keys(this.state.sectionLinks).indexOf(item) >= 0) {
                currentValues = currentValues.filter((e) => { return e !== item });
                if (chain[currentLevel + 1]) {
                    chain[currentLevel + 1].currentValues = currentValues;
                }
                const section = this.state.sectionLinks[item];
                currentValues = section.values;
                // new section
                currentItem = chain[section.level].currentItem
                const newItem = {
                    "linkId": item,
                    "text": section.text,
                    item: []
                };
                currentItem.push(newItem);
                currentItem = newItem.item;
                currentLevel = section.level;

                // filter out this section
                chain[section.level + 1] = { currentItem, currentValues };
            } else {
                // not a new section, so it's an item
                if (currentValues.indexOf(item) < 0 && itemType && itemType.enabled) {
                    // item not in this section, drop a level
                    const tempLevel = currentLevel;

                    while (chain[currentLevel].currentValues.length === 0 && currentLevel > 0) {
                        // keep dropping levels until we find an unfinished section
                        currentLevel--;
                    }

                    // check off current item
                    chain[tempLevel].currentValues = currentValues.filter((e) => { return e !== item });

                    currentValues = chain[currentLevel].currentValues;
                    currentItem = chain[currentLevel].currentItem;
                } else {
                    // item is in this section, check it off

                    currentValues = currentValues.filter((e) => { return e !== item });
                    chain[currentLevel + 1].currentValues = currentValues;
                }
            }
            if (itemType && (itemType.enabled || this.state.turnOffValues.indexOf(item) >= 0)) {
                const answerItem = {
                    "linkId": item,
                    "text": itemType.text,
                    "answer": []
                }
                switch (itemType.valueType) {
                    case "valueAttachment":
                        console.log("In attachment", this.state.values[item])
                        const attachment = this.state.values[item]
                        answerItem.answer.push({ [itemType.valueType]: attachment })
                        break;
                    case "valueQuantity":
                        const quantity = this.state.values[item];
                        if (quantity && quantity.comparator === "=") {
                            delete quantity.comparator;
                        }
                        answerItem.answer.push({ [itemType.valueType]: quantity })
                        break;
                    case "valueDateTime":
                    case "valueDate":
                        const date = this.state.values[item];
                        console.log("date---", date);
                        if (date != undefined) {
                            answerItem.answer.push({ [itemType.valueType]: date.toString() });
                        } else {
                            answerItem.answer.push({ [itemType.valueType]: "" });
                        }
                        break;
                    default:
                        const answer = this.state.values[item];
                        if (Array.isArray(answer)) {
                            answer.forEach((e) => {
                                // possible for an array to contain multiple types
                                let finalType;
                                if (e.valueTypeFinal) {
                                    finalType = e.valueTypeFinal;
                                    delete e.valueTypeFinal;
                                } else {
                                    finalType = itemType.valueType;
                                }
                                answerItem.answer.push({ [finalType]: e });
                            })
                        } else {
                            answerItem.answer.push({ [itemType.valueType]: answer });
                        }
                }
                // FHIR fields are not allowed to be empty or null, so we must prune
                if (this.isEmptyAnswer(answerItem.answer)) {
                    // console.log("Removing empty answer: ", answerItem);
                    delete answerItem.answer;
                }
                currentItem.push(answerItem);
            }
        });
        console.log(response);
        const priorAuthBundle = JSON.parse(JSON.stringify(this.props.bundle));
        priorAuthBundle.entry.unshift({ resource: this.props.deviceRequest })
        priorAuthBundle.entry.unshift({ resource: response })
        console.log(priorAuthBundle);

        const priorAuthClaim = {
            resourceType: "Claim",
            status: "active",
            type: {
                coding: [{
                    system: "http://terminology.hl7.org/CodeSystem/claim-type",
                    code: "professional",
                    display: "Professional"
                }]
            },
            subType: {
                coding: [
                    {
                        system: "https://www.cms.gov/codes/billtype",
                        code: "41",
                        display: "Hospital Outpatient Surgery performed in an Ambulatory ​Surgical Center"
                    }
                ]
            },
            use: "preauthorization",
            patient: { reference: this.makeReference(priorAuthBundle, "Patient") },
            created: authored,
            // provider:    { reference: this.makeReference(priorAuthBundle, "Organization") },
            // insurer: { reference: this.makeReference(priorAuthBundle, "Organization") },
            facility: { reference: this.makeReference(priorAuthBundle, "Location") },
            priority: { coding: [{ "code": "normal" }] },
            // presciption: { reference: this.makeReference(priorAuthBundle, "DeviceRequest") },
            supportingInfo: [{
                sequence: 1,
                category: {
                    coding: [
                        {
                            "system": "http://hl7.org/us/davinci-pas/CodeSystem/PASSupportingInfoType",
                            "code": "patientEvent"
                        }
                    ]
                },
                timingPeriod: {
                    start: "2019-01-05T00:00:00-07:00",
                    end: "2019-03-05T00:00:00-07:00"
                }
            },
            {
                sequence: 2,
                category: {
                    coding: [{
                        system: "http://terminology.hl7.org/CodeSystem/claiminformationcategory",
                        code: "info",
                        display: "Information"
                    }]
                },
                valueReference: { reference: this.makeReference(priorAuthBundle, "QuestionnaireResponse") }
            }],
            // item: [
            //     {
            //         sequence: 1,
            //         productOrService: this.props.deviceRequest.codeCodeableConcept,
            //         quantity: {
            //             value: this.props.deviceRequest.parameter[0].valueQuantity.value
            //         }
            //     }
            // ],
            careTeam: [
                {
                    sequence: 1,
                    provider: { reference: this.makeReference(priorAuthBundle, "Practitioner") },
                    extension: [
                        {
                            url: "http://terminology.hl7.org/ValueSet/v2-0912",
                            valueCode: "OP"
                        }
                    ]
                }
            ],
            diagnosis: [],
            insurance: [{
                sequence: 1,
                focal: true,
                // coverage: { reference: this.makeReference(priorAuthBundle, "Coverage") }
            }]
        }
        var sequence = 1;
        priorAuthBundle.entry.forEach(function (entry, index) {
            if (entry.resource !== undefined) {
                if (entry.resource.resourceType == "Condition") {
                    priorAuthClaim.diagnosis.push({
                        sequence: sequence++,
                        diagnosisReference: { reference: "Condition/" + entry.resource.id }
                    });
                }
            }
        })
        // console.log(priorAuthClaim, 'HEREEE', tokenUri);
        console.log(JSON.stringify(priorAuthClaim));
        if (sessionStorage.hasOwnProperty("docResources")) {
            if (sessionStorage["docResources"]) {
                JSON.parse(sessionStorage["docResources"]).forEach((doc) => {
                    priorAuthBundle.entry.push({ "resource": doc })
                })
            }
        }
        priorAuthBundle.entry.unshift({ resource: priorAuthClaim })

        /*creating token */
        const tokenPost = new XMLHttpRequest();
        var auth_response;
        tokenPost.open("POST", tokenUri);
        tokenPost.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        var data = `client_id=app-login&grant_type=password&username=john&password=john123`
        tokenPost.send(data);
        tokenPost.onload = function () {
                if (tokenPost.status === 200) {
                try {
                    auth_response = JSON.parse(tokenPost.responseText);
                    console.log("auth res--1243-", auth_response);
                } catch (e) {
                    const errorMsg = "Failed to parse auth response";
                    document.body.innerText = errorMsg;
                    console.error(errorMsg);
                    return;
                }
        /** creating cliam  */
        const Http = new XMLHttpRequest();
        // const priorAuthUrl = "https://davinci-prior-auth.logicahealth.org/fhir/Claim/$submit";
        // const priorAuthUrl = "http://cmsfhir.mettles.com:8080/drfp/fhir/Claim/$submit";
        // const priorAuthUrl = "http://cdex.mettles.com:9000/fhir/Claim/$submit";
        const priorAuthUrl = "http://cdex.mettles.com:8180/hapi-fhir-jpaserver/fhir/Claim/$submit";

        console.log("claim final--", JSON.stringify(priorAuthBundle));
        Http.open("POST", priorAuthUrl);
        Http.setRequestHeader("Content-Type", "application/fhir+json");
        Http.setRequestHeader("Authorization", "Bearer " + auth_response.access_token);
        // Http.send(JSON.stringify(pBundle));
        Http.send(JSON.stringify(priorAuthBundle));
        Http.onreadystatechange = function () {
            if (this.readyState === XMLHttpRequest.DONE) {
                var message = "";
                self.setState({ displayQuestionnaire: false })
                if (this.status === 200) {
                    var claimResponse = JSON.parse(this.responseText);
                    console.log("lllllll")
                    let result = claimResponse;
                    if (claimResponse.hasOwnProperty('entry')) {
                        claimResponse.entry.forEach((res) => {
                            if (res.resource.resourceType === "ClaimResponse") {
                                result = res.resource;
                            }
                        })
                    }
                    self.setState({ claimResponse: result })
                    self.setState({ claimMessage: "Prior Authorization has been submitted successfully" })
                    message = "Prior Authorization " + claimResponse.disposition + "\n";
                    message += "Prior Authorization Number: " + claimResponse.preAuthRef;
                } else {
                    self.setState({ "claimMessage": "Prior Authorization Request Failed." })
                    message = "Prior Authorization Request Failed."
                }
                self.setState({ loading: false });
                console.log(message);
                //alert(message);
                console.log(this.responseText);
            }
        }
            } else {
                const errorMsg = "Token post request failed. Returned status: " + tokenPost.status;
                document.body.innerText = errorMsg;
                console.error(errorMsg);
                return;
            }
        };
        // tokenPost.send(data)
        // const Http = new XMLHttpRequest();
        // // const priorAuthUrl = "https://davinci-prior-auth.logicahealth.org/fhir/Claim/$submit";
        // const priorAuthUrl = "http://54.227.218.17:9000/fhir/Claim/$submit";
        // Http.open("POST", priorAuthUrl);
        // Http.setRequestHeader("Content-Type", "application/fhir+json");
        // Http.setRequestHeader("Authorization", "Bearer "+auth_response);
        // Http.send(JSON.stringify(priorAuthBundle));
        // Http.onreadystatechange = function() {
        //     if (this.readyState === XMLHttpRequest.DONE) {
        //         var message = "";
        //         if (this.status === 200) {
        //             var claimResponse = JSON.parse(this.responseText);
        //             message = "Prior Authorization " + claimResponse.disposition + "\n";
        //             message += "Prior Authorization Number: " + claimResponse.preAuthRef;
        //         } else {
        //             message = "Prior Authorization Request Failed."
        //         }
        //         console.log(message);
        //         alert(message);
        //         console.log(this.responseText);
        //     }
        // }
    }

    isEmptyAnswer(answer) {
        return ((answer.length < 1) ||
            (JSON.stringify(answer[0]) == "{}") ||
            (answer[0].hasOwnProperty("valueString") && (answer[0].valueString == null || answer[0].valueString == "")) ||
            (answer[0].hasOwnProperty("valueDateTime") && (answer[0].valueDateTime == null || answer[0].valueDateTime == "")) ||
            (answer[0].hasOwnProperty("valueDate") && (answer[0].valueDate == null || answer[0].valueDate == "")) ||
            (answer[0].hasOwnProperty("valueBoolean") && (answer[0].valueBoolean == null || answer[0].valueBoolean == "")) ||
            (answer[0].hasOwnProperty("valueQuantity") && (answer[0].valueQuantity.value == null || answer[0].valueQuantity.value == "")));
    }

    makeReference(bundle, resourceType) {

        var entry = bundle.entry.find(function (entry) {
            if (entry.resource !== undefined) {
                return (entry.resource.resourceType == resourceType);
            }
        });
        if (entry.resource.hasOwnProperty("id")) {
            return resourceType + "/" + entry.resource.id;
        }
        return null
    }

    removeFilledFields() {
        if (this.state.turnOffValues.length > 0) {
            this.setState({ turnOffValues: [] });
        } else {
            const returnArray = [];
            this.state.orderedLinks.forEach((e) => {
                if (this.isNotEmpty(this.state.values[e]) && this.state.itemTypes[e] && this.state.itemTypes[e].enabled) {
                    returnArray.push(e);
                }
            });
            this.setState({ turnOffValues: returnArray });
        }
    }
    randomString() {
        var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
        var string_length = 8;
        var randomstring = '';
        for (var i = 0; i < string_length; i++) {
            var rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.substring(rnum, rnum + 1);
        }
        return randomstring
    }
    submitCommunicationRequest() {
        console.log("in send comm reqiest, removed for this project");
    }

    render() {
        return (
            <div>{this.state.displayQuestionnaire &&
                <div>
                    <div className="floating-tools">
                        <p className="filter-filled" >filter: <input type="checkbox" onClick={() => {
                            this.removeFilledFields();
                        }}></input></p>
                    </div>
                    <div className="container">
                        <div className="section-header">
                            <h3>{this.props.qform.title}</h3>
                            {/* <p>Setup FHIR information and others</p> */}
                        </div>
                    </div>
                    {/* <h2 className="document-header">{this.props.qform.title}

                    </h2> */}

                    <div className="sidenav">
                        {this.state.orderedLinks.map((e) => {
                            if (Object.keys(this.state.sectionLinks).indexOf(e) < 0) {
                                const value = this.state.values[e];
                                let extraClass;
                                let indicator;
                                if (this.state.itemTypes[e] && this.state.itemTypes[e].enabled) {
                                    extraClass = (this.isNotEmpty(value) ? "sidenav-active" : "")
                                    indicator = true;
                                } else {
                                    if (this.isNotEmpty(value) && this.state.turnOffValues.indexOf(e) > -1) {
                                        extraClass = "sidenav-manually-disabled";
                                    } else if (value) {
                                        extraClass = "sidenav-disabled filled"
                                    } else {
                                        extraClass = "sidenav-disabled"
                                    }

                                }
                                return <div
                                    key={e}
                                    className={"sidenav-box " + extraClass}
                                    onClick={() => {
                                        indicator ? window.scrollTo(0, this.state.itemTypes[e].ref.current.previousSibling.offsetTop) : null;
                                    }}
                                >
                                    {e}
                                </div>
                            }
                        })}
                        <div className="sidenav-box "></div>
                    </div>
                    {/* <div className="wrapper">
                    {
                        this.state.items.map((item) => {
                            return this.renderComponent(item, 0);
                        })
                    }
                </div> */}
                    <div className="wrapper1">
                        {
                            this.state.items.map((item) => {
                                // if (item.linkId <= (this.state.items.length / 2 + 1)) {
                                return this.renderComponent(item, 0);
                                // }
                            })
                        }
                        {/* <div className="section" style={{marginBottom: "30px"}}>
                            <div className="section-header">
                                <input type="checkbox" name="otherProvider" value={this.state.otherProvider} onChange={this.onChangeOtherProvider} />Request from Other Provider
                            </div>
                            {this.state.otherProvider &&
                                <div className="entry-block" style={{ marginLeft: "30px"}}>
                                    <div className="header-input">Select Provider</div>
                                    <Select style={{ width: "50%" }} className="text-input" options={providerOptions} onChange={(values) => this.setProviderSource(values)} />
                                    <div className="header-input">Select Queries</div>
                                    {this.state.providerQueries.map((item, key) => {
                                        return this.renderQueries(item, key);
                                    })}
                                    
                                    <button className="btn comm-btn" onClick={this.submitCommunicationRequest}>Send Request</button>
                                    
                                    {this.state.communicationRequestId && 
                                        <div className="decision-card alert-success">Request Posted successfully to {this.state.otherProviderName} - ({this.state.communicationRequestId}) </div>
                                    }
                                </div>
                            }
                        </div> */}
                        {/* <div className="section">
                            <h3 className="section-header" style={{ marginLeft: "-15px" }}>Please attach the following documents</h3>
                            <ol>
                                <li>OASIS Evaluation form</li>
                                <li>Face to face discussion details</li>
                            </ol>
                        </div>
                        <DocumentInput
                            updateCallback={this.updateDocuments}
                        /> */}
                        <div className="text-center" style={{ marginBottom: "50px" }}>
                            <button type="button" onClick={this.outputResponse}>Submit Prior Authorization
                                        <div id="fse" className={"spinner " + (this.state.loading ? "visible" : "invisible")}>
                                    <Loader
                                        type="Oval"
                                        color="#fff"
                                        height="15"
                                        width="15"
                                    />
                                </div>
                            </button>
                        </div>
                    </div>
                    {/* <div className="wrapper2">

                        {
                            this.state.items.map((item) => {
                                if (item.linkId > (this.state.items.length / 2 + 1)) {
                                    return this.renderComponent(item, 0);
                                }
                            })
                        }
                        <div className="text-center">
                            <button type="button" onClick={this.outputResponse}>Submit Prior Authorization
                                        <div id="fse" className={"spinner " + (this.state.loading ? "visible" : "invisible")}>
                                    <Loader
                                        type="Oval"
                                        color="#fff"
                                        height="15"
                                        width="15"
                                    />
                                </div>
                            </button>
                        </div>
                        <div>
                            <button className="btn refreshButton" onClick={this.relaunch}>Refresh</button>
                        </div>
                    </div> */}

                </div>}

                <div>
                    {!this.state.displayQuestionnaire &&
                        <div>
                            <div style={{ fontSize: "1.5em", background: "#98ce94", padding: "10px" }}> {this.state.claimMessage}</div>
                            <pre style={{ background: "#dee2e6" }}> {JSON.stringify(this.state.claimResponse, null, 2)}</pre>
                            {JSON.stringify(this.state.claimResponse).length > 0 &&
                                <div><button type="button" onClick={this.reloadClaimResponse} >Reload Claim Response
                                <div id="fse" className={"spinner " + (this.state.resloading ? "visible" : "invisible")}>
                                        <Loader
                                            type="Oval"
                                            color="#fff"
                                            height="15"
                                            width="15"
                                        />
                                    </div>
                                </button></div>
                            }
                        </div>

                    }

                </div>
            </div>

        );
    }
}
