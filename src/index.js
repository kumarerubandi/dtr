import "fhirclient"; // sets window.FHIR
import urlUtils from "./util/url";


import React from "react";
import ReactDOM from "react-dom";
import App from "./App.js";
console.log("completed imports");
// get the URL parameters received from the authorization server
const state = urlUtils.getUrlParameter("state"); // session key
const code = urlUtils.getUrlParameter("code"); // authorization code
console.log(state);
// load the app parameters stored in the session
const params = JSON.parse(sessionStorage[state]); // load app session
const tokenUri = params.tokenUri;
const clientId = params.clientId;
const secret = params.secret;
const serviceUri = params.serviceUri;
const redirectUri = params.redirectUri;
const launchContextId = params.launchContextId;
let red;
// This endpoint available when deployed in CRD server, for development we have
// the proxy set up in webpack.config.dev.js so the CRD server needs to be running
const FHIR_URI_PREFIX = "../../fetchFhirUri/";
// const FHIR_URI_PREFIX = "https://dry-temple-63581.herokuapp.com/fetchFhirUri/";
var data = `code=${code}&grant_type=authorization_code&redirect_uri=${redirectUri}`
// const data = new URLSearchParams();
// data.append("code", code);
// data.append("grant_type", "authorization_code");
// data.append("redirect_uri", redirectUri);
if (!secret) data += "&client_id=" + clientId;

const headers = {
  "Content-Type": "application/x-www-form-urlencoded"
};
export const appContext = {
  // template: "urn:hl7:davinci:crd:home-oxygen-questionnaire",
  template: "",
  request: "http://cdex.mettles.com:8280/ehr-server/stu3/DeviceRequest/10058/",
  patientId: "",
  npi: ""
}

if (secret) headers["Authorization"] = "Basic " + btoa(clientId + ":" + secret);

// async function getMessageDef(token, launchContextId) {
//   var tempURL = params.serviceUri+"/MessageDefinition/"+launchContextId;
//   let req = fetch(tempURL, {
//     method: 'GET',
//     headers: {
//       'Content-Type': 'application/json',
//       'Authorization': 'Bearer ' + token
//     }
//   }).then((response) => {
//     return response.json();
//   }).then((response) => {
//     return response;
//   }).catch(err => err);
//   return req;
// }
// this.getParameterByName = this.getParameterByName.bind(this);

function getParameterByName(name, url)  {
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regex = new RegExp("[\\?&#]" + name + "=([^&#]*)"),
      results = regex.exec(url);
  // return results == null ? "" :
  //        decodeURIComponent(results[1].replace(/\+/g, " "));
  if (results != null){
      return decodeURIComponent(results[1].replace(/\+/g, " "))
  }
  else{
      return ""
  }
  
}

// obtain authorization token from the authorization service using the authorization code
const tokenPost = new XMLHttpRequest();
var auth_response;
tokenPost.open("POST", tokenUri);
tokenPost.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
tokenPost.onload =   function (){
  if (tokenPost.status === 200) {
    try { 
      auth_response = JSON.parse(tokenPost.responseText);
      console.log("auth res---", auth_response);
    } catch (e) {
      const errorMsg = "Failed to parse auth response";
      document.body.innerText = errorMsg;
      console.error(errorMsg);
      return;
    }
    var tempURL = params.serviceUri + "/MessageDefinition/" + launchContextId;

    // const fhirPost = new XMLHttpRequest();
    // // var token = 'Bearer ' + auth_response.access_token
    // // var auth_response;
    // console.log('autho,',auth_response)
    // var token = 'Bearer ' + auth_response.access_token
    // fhirPost.open("GET", tempURL);
    // fhirPost.setRequestHeader("Content-Type", "application/json");
    // fhirPost.setRequestHeader('Authorization',token)
    // fhirPost.onload= function(){
    //   console.log(fhirPost.status,'status')
    //   console.log(JSON.parse(fhirPost.responseText,'fhirpost'))
    // }
    var res=   fetch(tempURL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + auth_response.access_token
      }
    }).then((response) => {
      return response.json()
  
    }).then((response) => {
      red = response
      console.log(response,'lets see')
      console.log(response,'messdef',response.description)
      if (response.description != undefined) {
        console.log("messagw def---", decodeURIComponent(response.description));
        let resp = decodeURIComponent(response.description);
        let appContextEncoded = resp.appContext;
        console.log(resp,'police')

        // appContextEncoded = "template=urn:hl7:davinci:crd:home-oxygen-questionnaire_2&request={\"resourceType\":\"DeviceRequest\",\"id\":\"devreq013\",\"meta\":{\"profile\":[\"http:\/\/hl7.org\/fhir\/us\/davinci-crd\/STU3\/StructureDefinition\/profile-devicerequest-stu3\"]},\"extension\":[{\"url\":\"http:\/\/build.fhir.org\/ig\/HL7\/davinci-crd\/STU3\/ext-insurance.html\",\"valueReference\":{\"reference\":\"Coverage\/0f58e588-eecd-4ab3-9316-f3d02a3ba39d\"}}],\"status\":\"draft\",\"codeCodeableConcept\":{\"coding\":[{\"system\":\"https:\/\/bluebutton.cms.gov\/resources\/codesystem\/hcpcs\",\"code\":\"E0424\",\"display\":\"Stationary Compressed Gaseous Oxygen System, Rental\"}]},\"subject\":{\"reference\":\"Patient\/f31500e8-15cb-4e8e-8c6e-a001edc6604e\"},\"performer\":{\"reference\":\"PractitionerRole\/f0b0cf14-4066-403f-b217-e92e73c350eb\"}}&filepath=../../getfile/cms/hcpcs/E0424";
        // console.log(appContextEncoded,'appencode')
        // const appString = decodeURIComponent(appContextEncoded);

        // appContext.patientId = ;
        console.log("app string----", );
        var request = getParameterByName('request',resp)
        var patient = getParameterByName('patient',resp)
        console.log(patient,'too')
        const appContext = {
          template: resp.split("&")[0].split("=")[1],
          request: JSON.parse(request),
          // filepath: appString.split("&")[2].split("=")[1]
          filepath: null,
          patientId: patient
        }

        var smart = FHIR.client({
          serviceUrl: serviceUri,
          patientId: appContext.patientId,
          auth: {
            type: "bearer",
            token: auth_response.access_token

          }
        });
        console.log(appContext,'appcontext')
        ReactDOM.render(
          <App
            FHIR_URI_PREFIX={FHIR_URI_PREFIX}
            questionnaireUri={appContext.template}
            smart={smart}
            deviceRequest={appContext.request}
            filepath={appContext.filepath}
          />,
          document.getElementById("root")
        );
        console.log(auth_response);
        const patientId = appContext.patientId;
        if (patientId == null) {
          const errorMsg = "Failed to get a patientId from the app params or the authorization response.";
          document.body.innerText = errorMsg;
          console.error(errorMsg);
          return;
        }
        console.log(patientId,'pati')
        return patientId;
      }
      // console.log()

      // return response;

    }).catch(err => err);
    console.log(res,'please',red)
      // console.log(response,'messdef',msg_def.description)
      // if (response.description != undefined) {
      //   console.log("messagw def---", decodeURIComponent(response.description));
      //   let resp = decodeURIComponent(response.description);
      //   let appContextEncoded = resp.appContext;

      //   // appContextEncoded = "template=urn:hl7:davinci:crd:home-oxygen-questionnaire_2&request={\"resourceType\":\"DeviceRequest\",\"id\":\"devreq013\",\"meta\":{\"profile\":[\"http:\/\/hl7.org\/fhir\/us\/davinci-crd\/STU3\/StructureDefinition\/profile-devicerequest-stu3\"]},\"extension\":[{\"url\":\"http:\/\/build.fhir.org\/ig\/HL7\/davinci-crd\/STU3\/ext-insurance.html\",\"valueReference\":{\"reference\":\"Coverage\/0f58e588-eecd-4ab3-9316-f3d02a3ba39d\"}}],\"status\":\"draft\",\"codeCodeableConcept\":{\"coding\":[{\"system\":\"https:\/\/bluebutton.cms.gov\/resources\/codesystem\/hcpcs\",\"code\":\"E0424\",\"display\":\"Stationary Compressed Gaseous Oxygen System, Rental\"}]},\"subject\":{\"reference\":\"Patient\/f31500e8-15cb-4e8e-8c6e-a001edc6604e\"},\"performer\":{\"reference\":\"PractitionerRole\/f0b0cf14-4066-403f-b217-e92e73c350eb\"}}&filepath=../../getfile/cms/hcpcs/E0424";
      //   const appString = decodeURIComponent(appContextEncoded);
      //   // appContext.patientId = ;
      //   console.log("app string----", appString.split("&")[1].split("=")[1]);
      //   const appContext = {
      //     template: appString.split("&")[0].split("=")[1],
      //     request: JSON.parse(appString.split("&")[1].split("=")[1].replace(/\\/g, "")),
      //     // filepath: appString.split("&")[2].split("=")[1]
      //     filepath: null,
      //     patientId: appString.split('&')[3].split('=')[1]
      //   }

      //   var smart = FHIR.client({
      //     serviceUrl: serviceUri,
      //     patientId: appContext.patientId,
      //     auth: {
      //       type: "bearer",
      //       token: auth_response.access_token

      //     }
      //   });
      //   console.log(appContext,'appcontext')
      //   ReactDOM.render(
      //     <App
      //       FHIR_URI_PREFIX={FHIR_URI_PREFIX}
      //       questionnaireUri={appContext.template}
      //       smart={smart}
      //       deviceRequest={appContext.request}
      //       filepath={appContext.filepath}
      //     />,
      //     document.getElementById("root")
      //   );
      //   console.log(auth_response);
      //   const patientId = appContext.patientId;
      //   if (patientId == null) {
      //     const errorMsg = "Failed to get a patientId from the app params or the authorization response.";
      //     document.body.innerText = errorMsg;
      //     console.error(errorMsg);
      //     return;
      //   }
      //   return patientId;
      // }

    // }).catch(err => err);
    // console.log(res,'responbse')

  } else {
    const errorMsg = "Token post request failed. Returned status: " + tokenPost.status;
    document.body.innerText = errorMsg;
    console.error(errorMsg);
    return;
  }
};
tokenPost.send(data);

