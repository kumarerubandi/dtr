import React, { Component } from "react";
import { hot } from "react-hot-loader";
import "./App.css";
import cqlfhir from "cql-exec-fhir";
import executeElm from "./elmExecutor/executeElm";
import fetchArtifacts from "./util/fetchArtifacts";
import QuestionnaireForm from "./components/QuestionnaireForm/QuestionnaireForm";
import Testing from "./components/ConsoleBox/Testing";
// import sample from './sample_questionnaire.json';
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      questionnaire: null,
      cqlPrepoulationResults: null,
      serviceRequest: null,
      bundle: null,
      logs: [],
      claimEndpoint: null
    }
    this.smart = props.smart;
    this.consoleLog = this.consoleLog.bind(this);
  }

  componentDidMount() {
    const fhirWrapper = cqlfhir.FHIRWrapper.FHIRv300();
    this.consoleLog("fetching artifacts", "infoClass");
    fetchArtifacts(this.props.FHIR_URI_PREFIX, this.props.questionnaireUri, this.smart, this.props.filepath, this.consoleLog)
      .then(artifacts => {
        console.log("fetched needed artifacts:", artifacts)
        this.setState({"claimEndpoint":artifacts.claimEndpoint})
        sessionStorage['claim_endpoint'] = artifacts.claimEndpoint;
        this.setState({ questionnaire: artifacts.questionnaire })
        this.setState({ serviceRequest: this.props.serviceRequest })
        console.log("device request--", this.props.serviceRequest, artifacts.dataRequirement);
        if (this.props.serviceRequest) {
          var filtered = artifacts.dataRequirement.filter(function (value, index, arr) {
            return value.type !== "Procedure";
          });
          console.log("filtered requirements", filtered);
          this.props.serviceRequest.category.forEach(code => {
            console.log(code);
            if (code.code.coding[0].code) {
              let obj = {
                type: "Procedure",
                "codeFilter": [{ path: "code", valueSetString: code.code.coding[0].code }]
              }
              filtered.push(obj);
            }
          });
          console.log("requirements---",filtered);
        }
        const executionInputs = {
          dataRequirement: filtered || artifacts.dataRequirement,
          elm: artifacts.mainLibraryElm,
          elmDependencies: artifacts.dependentElms,
          valueSetDB: {},
          parameters: { device_request: fhirWrapper.wrap(this.props.serviceRequest) }
        }

        this.consoleLog("executing elm", "infoClass");
        return executeElm(this.smart, "stu3", executionInputs, this.consoleLog);
        //return true;
      })
      .then(cqlResults => {
        this.consoleLog("executed cql, result:" + JSON.stringify(cqlResults), "infoClass");
        this.setState({ bundle: cqlResults.bundle })
        this.setState({ cqlPrepoulationResults: cqlResults.elmResults })
      });
  }

  consoleLog(content, type) {
    let jsonContent = {
      content: content,
      type: type
    }
    this.setState(prevState => ({
      logs: [...prevState.logs, jsonContent]
    }))
  }

  render() {
    if (this.state.questionnaire && this.state.cqlPrepoulationResults && this.state.bundle) {
      return (
        <div className="App">
          <QuestionnaireForm smart={this.smart} qform={this.state.questionnaire} 
          cqlPrepoulationResults={this.state.cqlPrepoulationResults} 
          serviceRequest={this.state.serviceRequest} bundle={this.state.bundle}
          claimEndpoint={this.state.claimEndpoint} />
        </div>
      );
    } else {
      return (
        <div className="App">
          <p>Loading...</p>
          <Testing logs={this.state.logs} />
        </div>
      );
    }
  }
}

export default hot(module)(App);
