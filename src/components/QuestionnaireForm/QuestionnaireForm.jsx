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
const tokenUri = "https://auth.mettles.com/auth/realms/ProviderCredentials/protocol/openid-connect/token";
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
            claimResponseBundle: {},
            claimMessage: "",
            otherProvider: false,
            otherProviderName: "",
            providerQueries: [],
            communicationRequestId: '',
            providerSource: sessionStorage["providerSource"],
            loading: false,
            resloading: false,
            showBundle: false,
            priorAuthBundle: {},
            showPreview: false,
            previewloading: false
        };

        this.updateQuestionValue = this.updateQuestionValue.bind(this);
        this.updateNestedQuestionValue = this.updateNestedQuestionValue.bind(this);
        this.updateDocuments = this.updateDocuments.bind(this);
        this.renderComponent = this.renderComponent.bind(this);
        this.retrieveValue = this.retrieveValue.bind(this);
        this.outputResponse = this.outputResponse.bind(this);
        this.previewBundle = this.previewBundle.bind(this);
        this.generateBundle = this.generateBundle.bind(this);
        this.reloadClaimResponse = this.reloadClaimResponse.bind(this);
        this.onChangeOtherProvider = this.onChangeOtherProvider.bind(this);
        this.getProviderQueries = this.getProviderQueries.bind(this);
        this.renderQueries = this.renderQueries.bind(this);
        this.onChangeProviderQuery = this.onChangeProviderQuery.bind(this);
        this.setProviderSource = this.setProviderSource.bind(this);
        this.submitCommunicationRequest = this.submitCommunicationRequest.bind(this);
        this.relaunch = this.relaunch.bind(this);
        this.handleShowBundle = this.handleShowBundle.bind(this);
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

    handleShowBundle() {
        var showBundle = this.state.showBundle;
        this.setState({ showBundle: !showBundle });
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
        // const priorAuthUrl = "http://cmsfhir.mettles.com:8080/drfp/fhir/ClaimResponse/" + this.state.claimResponse.id;
        // const priorAuthUrl = "http://cdex.mettles.com:9000/fhir/ClaimResponse/" + this.state.claimResponse.id;
        const priorAuthUrl = "http://cdex.mettles.com/payerfhir/hapi-fhir-jpaserver/fhir/ClaimResponse/" + this.state.claimResponse.id;
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

    generateBundle() {

        var self = this;
        return new Promise(function (resolve, reject) {
            console.log(self.state.sectionLinks);
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


            let currentItem = response.item;
            let currentLevel = 0;
            let currentValues = [];
            const chain = { 0: { currentItem, currentValues } };
            self.state.orderedLinks.map((item) => {
                const itemType = self.state.itemTypes[item];

                if (Object.keys(self.state.sectionLinks).indexOf(item) >= 0) {
                    currentValues = currentValues.filter((e) => { return e !== item });
                    if (chain[currentLevel + 1]) {
                        chain[currentLevel + 1].currentValues = currentValues;
                    }
                    const section = self.state.sectionLinks[item];
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
                if (itemType && (itemType.enabled || self.state.turnOffValues.indexOf(item) >= 0)) {
                    const answerItem = {
                        "linkId": item,
                        "text": itemType.text,
                        "answer": []
                    }
                    switch (itemType.valueType) {
                        case "valueAttachment":
                            console.log("In attachment", self.state.values[item])
                            const attachment = self.state.values[item]
                            answerItem.answer.push({ [itemType.valueType]: attachment })
                            break;
                        case "valueQuantity":
                            const quantity = self.state.values[item];
                            if (quantity && quantity.comparator === "=") {
                                delete quantity.comparator;
                            }
                            answerItem.answer.push({ [itemType.valueType]: quantity })
                            break;
                        case "valueDateTime":
                        case "valueDate":
                            const date = self.state.values[item];
                            console.log("date---", date);
                            if (date != undefined) {
                                answerItem.answer.push({ [itemType.valueType]: date.toString() });
                            } else {
                                answerItem.answer.push({ [itemType.valueType]: "" });
                            }
                            break;
                        default:
                            const answer = self.state.values[item];
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
                    if (self.isEmptyAnswer(answerItem.answer)) {
                        // console.log("Removing empty answer: ", answerItem);
                        delete answerItem.answer;
                    }
                    currentItem.push(answerItem);
                }
            });
            console.log(response);
            const priorAuthBundle = JSON.parse(JSON.stringify(self.props.bundle));
            priorAuthBundle.entry.unshift({ resource: response })
            priorAuthBundle.entry.unshift({ resource: self.props.serviceRequest });


            const orgRes = {
               
                    "resourceType": "Organization",
                    "id": "516",
                    "identifier": [
                        {
                            "system": "http://hl7.org.fhir/sid/us-npi",
                            "value": "1568461820"
                        }
                    ],
                    "name": "Rest Haven ILLIANA Christian Co",
                    "address": [
                        {
                            "use": "work",
                            "line": [
                                "18601 North Creek Dr A"
                            ],
                            "city": "Tinley Park",
                            "state": "IL",
                            "postalCode": "604776398"
                        }
                    ],
                    "contact": [
                        {
                            "name": [
                                {
                                    "use": "official",
                                    "family": "Randall",
                                    "given": [
                                        "Janice"
                                    ]
                                }
                            ],
                            "telecom": [
                                {
                                    "system": "phone",
                                    "value": "803-763-5900",
                                    "use": "home"
                                }
                            ]
                        }
                    ]
                
            };
            // const organizationResource = {
            //     "resourceType": "Organization",
            //     "id": "20114",
            //     "meta": {
            //         "versionId": "1",
            //         "lastUpdated": "2019-09-13T18:52:12.558+00:00"
            //     },
            //     "identifier": [
            //         {
            //             "system": "urn:ietf:rfc:3986",
            //             "value": "2.16.840.1.113883.13.34.110.1.110.11"
            //         },
            //         {
            //             "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
            //             "code": "NII",
            //             "value": "06111"
            //         }
            //     ],
            //     "name": sessionStorage["payerName"],
            //     "contact":[
            //         {
            //            "name":[
            //               {
            //                  "use":"official",
            //                  "family":"Randall",
            //                  "given":[
            //                     "Janice"
            //                  ]
            //               }
            //            ],
            //            "telecom":[
            //               {
            //                  "system":"phone",
            //                  "value":"803-763-5900",
            //                  "use":"home"
            //               }
            //            ]
            //         }
            //      ],
            //     "address": [
            //         {
            //             "line": [
            //                 "123 Healthcare Ave."
            //             ],
            //             "city": "Chicago",
            //             "state": "IL",
            //             "postalCode": "60643",
            //             "country": "US"
            //         }
            //     ]
            // }
            priorAuthBundle.entry.unshift({ resource: orgRes })

            console.log(priorAuthBundle);

            const locationResource = {
                "resourceType": "Location",
                "id": "29955",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2019-07-11T06:20:39.485+00:00",
                    "profile": [
                        "http://hl7.org/fhir/us/qicore/StructureDefinition/qicore-location"
                    ]
                },
                "type": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
                                "code": "PTRES",
                                "display": "Patient's Residence"
                            }
                        ]
                    }
                ],
                "managingOrganization": {
                    "reference": "Organization/516"
                },
                "name": "South Wing, second floor",
                "address": {
                    "line": [
                        "102 Heritage Dr."
                    ],
                    "city": "Somerset",
                    "state": "NJ",
                    "postalCode": "08873",
                    "country": "USA"
                }
            }
            priorAuthBundle.entry.unshift({ resource: locationResource })

            const priorAuthClaim = {
                resourceType: "Claim",
                status: "active",
                type: {
                    coding: [{
                        system: "http://terminology.hl7.org/CodeSystem/claim-type",
                        code: "institutional",
                        display: "Institutional"
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
                patient: { reference: self.makeReference(priorAuthBundle, "Patient") },
                created: authored,
                provider: { reference: self.makeReference(priorAuthBundle, "Organization") },
                enterer: { reference: self.makeReference(priorAuthBundle, "Practitioner") },
                insurer: { reference: self.makeReference(priorAuthBundle, "Organization") },
                facility: { reference: self.makeReference(priorAuthBundle, "Location") },
                priority: { coding: [{ "code": "normal" }] },
                presciption: { reference: self.makeReference(priorAuthBundle, "ServiceRequest") },
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
                    valueReference: { reference: self.makeReference(priorAuthBundle, "QuestionnaireResponse") }
                }],
                item: [

                ],
                careTeam: [
                    {
                        sequence: 1,
                        provider: { reference: self.makeReference(priorAuthBundle, "Practitioner") },
                        extension: [
                            {
                                url: "http://terminology.hl7.org/ValueSet/v2-0912",
                                valueCode: "OP"
                            }
                        ]
                    }
                ],
                diagnosis: [],
                procedure: [],
                insurance: [{
                    sequence: 1,
                    focal: true,
                    // coverage: { reference: self.makeReference(priorAuthBundle, "Coverage") }
                }]
            }
            if (self.props.serviceRequest.hasOwnProperty("quantity") && self.props.serviceRequest.hasOwnProperty("code")) {
                let service = {
                    sequence: 1,
                    productOrService: self.props.serviceRequest.code,
                    quantity: {
                        value: self.props.serviceRequest.quantity.value
                    },
                    procedureSequence: [],
                    diagnosisSequence: []
                }
                priorAuthClaim.item.push(service);

                var sequence = 1;
                priorAuthBundle.entry.forEach(function (entry, index) {
                    if (entry.resource !== undefined) {
                        if (entry.resource.resourceType == "Condition") {
                            priorAuthClaim.diagnosis.push({
                                sequence: sequence,
                                diagnosisReference: { reference: "Condition/" + entry.resource.id }
                            });
                            priorAuthClaim.item[0].diagnosisSequence.push(sequence);
                            sequence++;
                        }

                    }
                })

                var psequence = 1;
                priorAuthBundle.entry.forEach(function (entry, index) {
                    if (entry.resource !== undefined) {
                        if (entry.resource.resourceType == "Procedure") {
                            priorAuthClaim.procedure.push({
                                sequence: psequence,
                                procedureReference: { reference: "Procedure/" + entry.resource.id }
                            });
                            priorAuthClaim.item[0].procedureSequence.push(psequence);
                            psequence++;
                        }

                    }
                })
            }
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

            resolve(priorAuthBundle);
        });

    }
    previewBundle() {
        this.setState({ previewloading: true });
        this.generateBundle().then((priorAuthBundle) => {
            this.setState({ priorAuthBundle });
            console.log("Prior auth bundle---", this.state.priorAuthBundle)
            let showPreview = this.state.showPreview;
            this.setState({ showPreview: !showPreview });
            console.log("Prior auth bundle-preview--", this.state.showPreview)
            this.setState({ previewloading: false });
        });
    }
    // create the questionnaire response based on the current state
    outputResponse(status) {
        this.setState({ loading: true });
        this.generateBundle().then((priorAuthBundle) => {
            /*creating token */
            const tokenPost = new XMLHttpRequest();
            var auth_response;
            var self = this;
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
                    var priorAuthUrl = "http://cdex.mettles.com/payerfhir/hapi-fhir-jpaserver/fhir/Claim/$submit";
                    if (self.props.hasOwnProperty("claimEndpoint") && self.props.claimEndpoint !== null) {
                        priorAuthUrl = self.props.claimEndpoint;
                    }
		    if(priorAuthUrl === "http://stdrfp.mettles.com:8080/drfp/fhir/Claim/$submit"){
		       priorAuthBundle = {
   "resourceType":"Bundle",
   "id": "1234567890",
   "type":"collection",
   "entry":[
      {
         "resource":{
            "resourceType":"Claim",
            "status":"active",
            "type":{
               "coding":[
                  {
                     "system":"http://terminology.hl7.org/CodeSystem/claim-type",
                     "code":"institutional",
                     "display":"Institutional"
                  }
               ]
            },
            "subType":{
               "coding":[
                  {
                     "system":"https://www.cms.gov/codes/billtype",
                     "code":"32",
                     "display":"Hospital Outpatient Surgery performed in an Ambulatory â€‹Surgical Center"
                  }
               ]
            },
            "use":"preauthorization",
            "patient":{
               "reference":"Patient/1"
            },
            "created":"2019-07-12",
            "provider":{
               "reference":"Organization/516"
            },
            "insurer":{
               "reference":"Organization/415"
            },
            "facility":{
               "reference":"Location/235"
            },
            "priority":{
               "coding":[
                  {
                     "code":"normal"
                  }
               ]
            },
            "supportingInfo":[
               {
                  "sequence":1,
                  "category":{
                     "coding":[
                        {
                           "system":"http://hl7.org/us/davinci-pas/CodeSystem/PASSupportingInfoType",
                           "code":"patientEvent"
                        }
                     ]
                  },
                  "timingPeriod":{
                        "start": "2019-01-01",
                        "end":"2019-01-30"
                  }
               },
                                                   {
                  "sequence":2,
                  "category":{
                     "coding":[
                        {
                           "system":"http://hl7.org/us/davinci-pas/CodeSystem/PASSupportingInfoType",
                           "code":"additionalInformation"
                        }
                     ]
                  },
               "valueReference":{
               "reference":"DocumentReference/635"
            }
                 
               }
            ],
            "item":[
                 {
                              "sequence":3456,
                  "productOrService":{
                     "coding":[
                        {
                           "system":"http://www.ama-assn.org/go/cpt",
                           "code":"G0151",
                                                                                                   "display":"Physical Therapy"
                        }
                     ]
                  },
                                                                  "quantity":{
                       "value":6
                  },
                                                                "servicedPeriod":{
                     "start":"2019-01-02",
                     "end":"2019-01-15"
                                                                                }
              },
               {
                  "sequence":3457,
                  "productOrService":{
                     "coding":[
                        {
                           "system":"http://www.ama-assn.org/go/cpt",
                           "code":"G0299",
                                                                                                   "display":"Direct skilled services of a licensed nurse (RN)"
                        }
                     ]
               },
                  "quantity":{
                                                                      "value":12
                                                                                  },
                                                                                  "servicedPeriod":{
                        "start": "2019-01-03",
                        "end":"2019-01-12"
                                                                  }
                  },
               {
                  "sequence":3458,
                  "productOrService":{
                     "coding":[
                        {
                           "system":"http://www.ama-assn.org/go/cpt",
                           "code":"G0496",
                                                                                                   "display":"LPN training and/or education of a patient or family member"
                        }
                     ]
                  },
                                                                  "quantity":{
                       "value":1
                                                                },
                                                                "servicedPeriod":{
                     "start":"2019-01-13",
                     "end":"2019-01-13"
                                                                }
               }
               ],
            "careTeam":[
               {
                  "sequence":1,
                  "provider":{
                     "reference":"Practitioner/386"
                  },
                  "extension":[
                                                                  {
                     "url":"http://terminology.hl7.org/ValueSet/v2-0912",
                     "valueCode":"AT"
                  }
                                                                  ]
               },
               {
                  "sequence":2,
                  "provider":{
                     "reference":"Practitioner/387"
                  },
                  "extension":[
                   {
                     "url":"http://terminology.hl7.org/ValueSet/v2-0912",
                     "valueCode":"OP"
                  }
                                                                ]
                }
                ],
            "diagnosis":[
               {
                  "sequence":123,
                  "diagnosisReference":{
                               "reference":"Condition/234"
                              
                  }
                  
               }
            ],
            "insurance":[
               {
                  "sequence":1,
                  "focal":true,
                  "coverage":{
                     "reference":"Coverage/29956"
                  }
               }
            ]
         }
       },
      {
      "resource":{
            "resourceType":"Condition",
            "id":"234",
            "code":{
                         "coding": [
               {
                  "code":"M6281",
                  "system":"http://hl7.org/fhir/sid/icd-10-cm",
                  "display":"M6281,Muscle weakness"
               }
                                                   ]
            
         },
         "subject":{
            "reference":"Patient/1"
         }
      }
      },
               {
      "resource":{
            "resourceType":"DocumentReference",
            "id":"635",
            "status":"current",
             "content":[
                  {
                   "attachment":{
                   "contentType": "application/pdf",
                   "data" : "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HJ+QQHOYpBvK6qaGLV7FXZUakhwJ5SZa/Ac+9s0zDQplbmRzdHJlYW0NCmVuZG9iag0KNSAwIG9iag0KPDwvVHlwZS9Gb250L1N1YnR5cGUvVHJ1ZVR5cGUvTmFtZS9GMS9CYXNlRm9udC9CQ0RFRUUrQ2FsaWJyaS9FbmNvZGluZy9XaW5BbnNpRW5jb2RpbmcvRm9udERlc2NyaXB0b3IgNiAwIFIvRmlyc3RDaGFyIDMyL0xhc3RDaGFyIDEyMS9XaWR0aHMgMzQgMCBSPj4NCmVuZG9iag0KNiAwIG9iag0KPDwvVHlwZS9Gb250RGVzY3JpcHRvci9Gb250TmFtZS9CQ0RFRUUrQ2FsaWJyaS9GbGFncyAzMi9JdGFsaWNBbmdsZSAwL0FzY2VudCA3NTAvRGVzY2VudCAtMjUwL0NhcEhlaWdodCA3NTAvQXZnV2lkdGggNTIxL01heFdpZHRoIDE3NDMvRm9udFdlaWdodCA0MDAvWEhlaWdodCAyNTAvU3RlbVYgNTIvRm9udEJCb3hbIC01MDMgLTI1MCAxMjQwIDc1MF0gL0ZvbnRGaWxlMiAzNSAwIFI+Pg0KZW5kb2JqDQo3IDAgb2JqDQo8PC9UeXBlL0V4dEdTdGF0ZS9CTS9Ob3JtYWwvY2EgMT4+DQplbmRvYmoNCjggMCBvYmoNCjw8L1R5cGUvRXh0R1N0YXRlL0JNL05vcm1hbC9DQSAxPj4NCmVuZG9iag0KOSAwIG9iag0KPDwvVHlwZS9Gb250L1N1YnR5cGUvVHJ1ZVR5cGUvTmFtZS9GMi9CYXNlRm9udC9BcmlhbE1UL0VuY29kaW5nL1dpbkFuc2lFbmNvZGluZy9Gb250RGVzY3JpcHRvciAxMCAwIFIvRmlyc3RDaGFyIDMyL0xhc3RDaGFyIDEyMS9XaWR0aHMgMzYgMCBSPj4NCmVuZG9iag0KMTAgMCBvYmoNCjw8L1R5cGUvRm9udERlc2NyaXB0b3IvRm9udE5hbWUvQXJpYWxNVC9GbGFncyAzMi9JdGFsaWNBbmdsZSAwL0FzY2VudCA5MDUvRGVzY2VudCAtMjEwL0NhcEhlaWdodCA3MjgvQXZnV2lkdGggNDQxL01heFdpZHRoIDI2NjUvRm9udFdlaWdodCA0MDAvWEhlaWdodCAyNTAvTGVhZGluZyAz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NzggMCAwIDU1NiAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCA2NjcgMCA3MjIgNzIyIDY2NyA2MTEgMCAwIDAgMCAwIDAgODMzIDAgMCA2NjcgMCA3MjIgNjY3IDYxMSAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCA1NTYgNTU2IDUwMCA1NTYgNTU2IDI3OCA1NTYgNTU2IDIyMiAwIDUwMCAyMjIgODMzIDU1NiA1NTYgNTU2IDU1NiAzMzMgNTAwIDI3OCA1NTYgNTAwIDcyMiAwIDUwMF0gDQplbmRvYmoNCjM3IDAgb2JqDQpbIDI3OCAwIDAgMCAwIDAgMCAwIDMzMyAzMzMgMCAwIDAgMCAyNzggMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgNzIyIDcyMiA3MjIgMCA2NjcgMCAwIDAgMjc4IDAgMCAwIDgzMyAwIDc3OCA2NjcgNzc4IDcyMiA2NjcgNjExIDAgMCAwIDAgMCA2MTEgMCAwIDAgMCAwIDAgNTU2IDAgNTU2IDYxMSA1NTYgMzMzIDYxMSA2MTEgMjc4IDAgNTU2IDI3OCA4ODkgNjExIDYxMSA2MTEgMCAzODkgNTU2IDMzMyA2MTEgNTU2IDc3OCAwIDU1NiA1MDBdIA0KZW5kb2JqDQozOCAwIG9iag0KPDwvVHlwZS9NZXRhZGF0YS9TdWJ0eXBlL1hNTC9MZW5ndGggMzA4Mz4+DQpzdHJlYW0NCjw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+PHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iMy4xLTcwMSI+CjxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CjxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiICB4bWxuczpwZGY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGRmLzEuMy8iPgo8cGRmOlByb2R1Y2VyPk1pY3Jvc29mdMKuIFdvcmQgZm9yIE9mZmljZSAzNjU8L3BkZjpQcm9kdWNlcj48L3JkZjpEZXNjcmlwdGlvbj4KPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyI+CjxkYzpjcmVhdG9yPjxyZGY6U2VxPjxyZGY6bGk+RGVlcHRoaSBSZWRkeTwvcmRmOmxpPjwvcmRmOlNlcT48L2RjOmNyZWF0b3I+PC9yZGY6RGVzY3JpcHRpb24+CjxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iPgo8eG1wOkNyZWF0b3JUb29sPk1pY3Jvc29mdMKuIFdvcmQgZm9yIE9mZmljZSAzNjU8L3htcDpDcmVhdG9yVG9vbD48eG1wOkNyZWF0ZURhdGU+MjAxOS0wNC0yMlQxNToyNTo0MS0wNzowMDwveG1wOkNyZWF0ZURhdGU+PHhtcDpNb2RpZnlEYXRlPjIwMTktMDQtMjJUMTU6MjU6NDEtMDc6MDA8L3htcDpNb2RpZnlEYXRlPjwvcmRmOkRlc2NyaXB0aW9uPgo8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiAgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iPgo8eG1wTU06RG9jdW1lbnRJRD51dWlkOjJFQzE1NjkyLTBCMTctNEY5Qi05ODg5LUQ5ODlEQTM0RUY3NTwveG1wTU06RG9jdW1lbnRJRD48eG1wTU06SW5zdGFuY2VJRD51dWlkOjJFQzE1NjkyLTBCMTctNEY5Qi05ODg5LUQ5ODlEQTM0RUY3NTwveG1wTU06SW5zdGFuY2VJRD48L3JkZjpEZXNjcmlwdGlvbj4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCjwvcmRmOlJERj48L3g6eG1wbWV0YT48P3hwYWNrZXQgZW5kPSJ3Ij8+DQplbmRzdHJlYW0NCmVuZG9iag0KMzkgMCBvYmoNCjw8L0Rpc3BsYXlEb2NUaXRsZSB0cnVlPj4NCmVuZG9iag0KNDAgMCBvYmoNCjw8L1R5cGUvWFJlZi9TaXplIDQwL1dbIDEgNCAyXSAvUm9vdCAxIDAgUi9JbmZvIDEzIDAgUi9JRFs8OTI1NkMxMkUxNzBCOUI0Rjk4ODlEOTg5REEzNEVGNzU+PDkyNTZDMTJFMTcwQjlCNEY5ODg5RDk4OURBMzRFRjc1Pl0gL0ZpbHRlci9GbGF0ZURlY29kZS9MZW5ndGggMTM1Pj4NCnN0cmVhbQ0KeJw1zrsNwlAMhWHf8E5unogZmIQVGICGSagoEAyQkjVgCVpEiYQo6JGCOT+48CdL9pHNvLoueK/NvhzhKsJbpCeRrUVcwhbOIl+JYgFPUV7MEg+bWQElVFBDDr/Nxu+q238KkEAP+jCAIYxgDBNIIYPo0c1Dn03vYvcS+ygOc9FuzD5mJxOHDQplbmRzdHJlYW0NCmVuZG9iag0KeHJlZg0KMCA0MQ0KMDAwMDAwMDAxNCA2NTUzNSBmDQowMDAwMDAwMDE3IDAwMDAwIG4NCjAwMDAwMDAxNjYgMDAwMDAgbg0KMDAwMDAwMDIyMiAwMDAwMCBuDQowMDAwMDAwNTA4IDAwMDAwIG4NCjAwMDAwMDI3NTEgMDAwMDAgbg0KMDAwMDAwMjkxOSAwMDAwMCBuDQowMDAwMDAzMTU4IDAwMDAwIG4NCjAwMDAwMDMyMTEgMDAwMDAgbg0KMDAwMDAwMzI2NCAwMDAwMCBuDQowMDAwMDAzNDI2IDAwMDAwIG4NCjAwMDAwMDM2NTMgMDAwMDAgbg0KMDAwMDAwMzgyMSAwMDAwMCBuDQowMDAwMDA0MDUzIDAwMDAwIG4NCjAwMDAwMDAwMTUgNjU1MzUgZg0KMDAwMDAwMDAxNiA2NTUzNSBmDQowMDAwMDAwMDE3IDY1NTM1IGYNCjAwMDAwMDAwMTggNjU1MzUgZg0KMDAwMDAwMDAxOSA2NTUzNSBmDQowMDAwMDAwMDIwIDY1NTM1IGYNCjAwMDAwMDAwMjEgNjU1MzUgZg0KMDAwMDAwMDAyMiA2NTUzNSBmDQowMDAwMDAwMDIzIDY1NTM1IGYNCjAwMDAwMDAwMjQgNjU1MzUgZg0KMDAwMDAwMDAyNSA2NTUzNSBmDQowMDAwMDAwMDI2IDY1NTM1IGYNCjAwMDAwMDAwMjcgNjU1MzUgZg0KMDAwMDAwMDAyOCA2NTUzNSBmDQowMDAwMDAwMDI5IDY1NTM1IGYNCjAwMDAwMDAwMzAgNjU1MzUgZg0KMDAwMDAwMDAzMSA2NTUzNSBmDQowMDAwMDAwMDMyIDY1NTM1IGYNCjAwMDAwMDAwMzMgNjU1MzUgZg0KMDAwMDAwMDAwMCA2NTUzNSBmDQowMDAwMDA0ODQzIDAwMDAwIG4NCjAwMDAwMDUwOTYgMDAwMDAgbg0KMDAwMDAzNjg0OSAwMDAwMCBuDQowMDAwMDM3MTMyIDAwMDAwIG4NCjAwMDAwMzc0MTUgMDAwMDAgbg0KMDAwMDA0MDU4MSAwMDAwMCBuDQowMDAwMDQwNjI2IDAwMDAwIG4NCnRyYWlsZXINCjw8L1NpemUgNDEvUm9vdCAxIDAgUi9JbmZvIDEzIDAgUi9JRFs8OTI1NkMxMkUxNzBCOUI0Rjk4ODlEOTg5REEzNEVGNzU+PDkyNTZDMTJFMTcwQjlCNEY5ODg5RDk4OURBMzRFRjc1Pl0gPj4NCnN0YXJ0eHJlZg0KNDA5NjINCiUlRU9GDQp4cmVmDQowIDANCnRyYWlsZXINCjw8L1NpemUgNDEvUm9vdCAxIDAgUi9JbmZvIDEzIDAgUi9JRFs8OTI1NkMxMkUxNzBCOUI0Rjk4ODlEOTg5REEzNEVGNzU+PDkyNTZDMTJFMTcwQjlCNEY5ODg5RDk4OURBMzRFRjc1Pl0gL1ByZXYgNDA5NjIvWFJlZlN0bSA0MDYyNj4+DQpzdGFydHhyZWYNCjQxOTM5DQolJUVPRg==",
                   "size": 56160
                    }
                  }
               ]
            }
      },
      {
         "resource":{
                                
                                 
            "resourceType":"Patient",
            "id":"1",
             "identifier":[
               {
                  "use":"usual",
                  "type":{
                     "coding":[
                        {
                           "system":"http://hl7.org/fhir/sid/us-medicare",
                           "code":"MC"
                        }
                     ]
                  },
                  "value":"246748159A"
               }
            ],
            "active":true,
            "name":[
               {
                  "use":"official",
                  "family":"Beideman",
                  "given":[
                     "Daniel"
                  ]
               }
            ],
            "gender":"male",
            "birthDate":"1953-11-27",
             "deceasedBoolean":false,
            "address":[
               {
                  "line":[
                     "117 Emily St"
                  ],
                  "city":"Elizabeth City",
                  "state":"NC",
                  "postalCode":"279093317",
                  "country":"US"
               }
            ]
         }
      },
      {
                   "resource":{
         "resourceType":"Organization",
         "id":"415",
          "identifier":[
            {
               "system":"urn:ietf:rfc:3986",
               "value":"2.16.840.1.113883.13.34.110.1.110.11"
            }
         ],
         "name":"Palmetto GBA"
          }
      },
      {
                           "resource":{
         "resourceType":"Location",
         "id":"235",
        
         "type":[
                                {
        "coding":[
            {
               "system":"http://terminology.hl7.org/CodeSystem/v3-RoleCode",
               "code":"PTRES",
               "display":"Patient's Residence"
            }
         ]
          }
         ],
         
         "managingOrganization":{
            "reference":"Organization/516"
         }
      }
                  },
      {
                 "resource":{
         "resourceType":"Organization",
         "id":"516",
         "identifier":[
            {
               "system":"http://hl7.org.fhir/sid/us-npi",
               "value":"1568461820"
            }
         ],
         "name":"Rest Haven ILLIANA Christian Co",
         "address":[
            {
               "use":"work",
               "line":[
                  "18601 North Creek Dr A"
               ],
               "city":"Tinley Park",
               "state":"IL",
               "postalCode":"604776398"
            }
         ],
         "contact":[
            {
               "name":[
                  {
                     "use":"official",
                     "family":"Randall",
                     "given":[
                        "Janice"
                     ]
                  }
               ],
               "telecom":[
                  {
                     "system":"phone",
                     "value":"803-763-5900",
                     "use":"home"
                  }
               ]
            }
         ]
      }
       },
      {
         "resource":{
            "resourceType":"Practitioner",
            "id":"386",
            "identifier":[
               {
                  "system":"http://hl7.org.fhir/sid/us-npi",
                  "value":"1821034307"
               }
            ],
            "name":[
                                                {
               "use":"official",
               "family":"Ather",
               "given":[
                  "Syed"
               ]
            }
                                                ],
            "address":[
               {
                  "use":"work",
                  "line":[
                     "10661  S Roberts Rd 103"
                  ],
                  "city":"Palos Hills",
                  "state":"IL",
                  "postalCode":"604651954"
               }
            ]
         }
      },
      {
         "resource":{
            "resourceType":"Practitioner",
            "id":"387",
            "identifier":[
               {
                  "system":"http://hl7.org.fhir/sid/us-npi",
                  "value":"1881767572"
               }
            ],
            "name":[
                                                {
               "use":"official",
               "family":"Goldenburg",
               "given":[
                  "Richard"
               ]
            }
                                                ],
            "address":[
               {
                  "use":"work",
                  "line":[
                     "1 Medical Center Dr"
                  ],
                  "city":"Morgantown",
                  "state":"WV",
                  "postalCode":"26506"
               }
                                                   ]
         }
      },
      {
         "resource":{
            "resourceType":"Coverage",
            "id":"29956",
            "meta":{
               "versionId":"1",
               "lastUpdated":"2019-07-11T06:27:08.949+00:00",
               "profile":[
                  "http://hl7.org/fhir/us/davinci-deqm/STU3/StructureDefinition/coverage-deqm"
               ]
            },
            "identifier":[
               {
                  "system":"http://benefitsinc.com/certificate",
                  "value":"10138556"
               }
            ],
            "status":"active",
            "type":{
               "coding":[
                  {
                     "system":"http://terminology.hl7.org/CodeSystem/v3-ActCode",
                     "code":"HIP",
                     "display":"health insurance plan policy"
                  }
               ]
            },
            "policyHolder":{
               "reference":"Patient/1"
            },
            "subscriber":{
               "reference":"Patient/1"
            },
            "subscriberId":"246748159A",
            "beneficiary":{
               "reference":"Patient/1"
            },
            "relationship":{
               "coding":[
                  {
                     "code":"self"
                  }
               ]
            },
            "payor":[
               {
                  "reference":"Organization/415"
               }
            ]
         }
      }
   ]
}

		    }
                    console.log("claim final--", JSON.stringify(priorAuthBundle));
                    Http.open("POST", priorAuthUrl);
                    Http.setRequestHeader("Content-Type", "application/fhir+json");
                    // Http.setRequestHeader("Authorization", "Bearer " + auth_response.access_token);
                    // Http.send(JSON.stringify(pBundle));
                    Http.send(JSON.stringify(priorAuthBundle));
                    Http.onreadystatechange = function () {
                        if (this.readyState === XMLHttpRequest.DONE) {
                            var message = "";
                            self.setState({ displayQuestionnaire: false })
                            if (this.status === 200) {
                                var claimResponseBundle = JSON.parse(this.responseText);
                                var claimResponse = self.state.claimResponse;
                                console.log("lllllll")
                                if (claimResponseBundle.hasOwnProperty('entry')) {
                                    claimResponseBundle.entry.forEach((res) => {
                                        if (res.resource.resourceType === "ClaimResponse") {
                                            claimResponse = res.resource;
                                        }
                                    })
                                }
                                self.setState({ claimResponseBundle })
                                self.setState({ claimResponse })
                                console.log(self.state.claimResponseBundle, self.state.claimResponse);
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
        }).catch((error) => {
            console.log("unable to generate bundle", error);
        })
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
                        {this.state.showPreview &&
                            <div><pre style={{ background: "#dee2e6", height: "500px" }}> {JSON.stringify(this.state.priorAuthBundle, null, 2)}</pre></div>
                        }
                        <div className="text-center" style={{ marginBottom: "50px" }}>
                            <button type="button" style={{ background: "grey" }} onClick={this.previewBundle}>Preview
                                        <div id="fse" className={"spinner " + (this.state.previewloading ? "visible" : "invisible")}>
                                    <Loader
                                        type="Oval"
                                        color="#fff"
                                        height="15"
                                        width="15"
                                    />
                                </div>
                            </button>
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
                            <div className="form-row">
                                <div className="col-3">Status</div>
                                {this.state.claimResponse.status === "active" &&
                                <div className="col-6">: Affirmed</div>
                                }
                                {this.state.claimResponse.status !== "active" &&
                                <div className="col-6">: {this.state.claimResponse.status}</div>
                                }
                            </div>
                            <div className="form-row">
                                <div className="col-3">Outcome</div>
                                <div className="col-6">: {this.state.claimResponse.outcome}</div>
                            </div>
                            {this.state.claimResponse.outcome !== "queued" &&
                                <div className="form-row">
                                    <div className="col-3">Prior Auth Reference No</div>
                                    <div className="col-6">: {this.state.claimResponse.preAuthRef}</div>
                                </div>
                            }
                            {JSON.stringify(this.state.claimResponse).length > 0 &&
                                <div style={{ paddingTop: "10px", paddingBottom: "10px" }}>
                                    <button style={{ float: "right" }} type="button" onClick={this.handleShowBundle}>Show Claim Response Bundle</button>

                                    <button type="button" onClick={this.reloadClaimResponse} >Reload Claim Response
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
                            {this.state.showBundle &&
                                <pre style={{ background: "#dee2e6", height: "500px" }}> {JSON.stringify(this.state.claimResponseBundle, null, 2)}</pre>
                            }
                        </div>

                    }

                </div>
            </div>

        );
    }
}
