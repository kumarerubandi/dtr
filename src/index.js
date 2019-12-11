import "fhirclient"; // sets window.FHIR
import urlUtils from "./util/url";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App.js";
import { stat } from "fs";

// get the URL parameters received from the authorization server
const state = urlUtils.getUrlParameter("state"); // session key
const code = urlUtils.getUrlParameter("code"); // authorization code

// load the app parameters stored in the session
const params = JSON.parse(sessionStorage[state]); // load app session
const tokenUri = params.tokenUri;
const clientId = params.clientId;
const secret = params.secret;
const serviceUri = params.serviceUri;
const redirectUri = params.redirectUri;

// This endpoint available when deployed in CRD server, for development we have
// the proxy set up in webpack.config.dev.js so the CRD server needs to be running
const FHIR_URI_PREFIX = "../../fetchFhirUri/";
var data = `code=${code}&grant_type=authorization_code&redirect_uri=${redirectUri}`

if (!secret) data += "&client_id=" + clientId;

const headers = {
  "Content-Type": "application/x-www-form-urlencoded"
};
export const appContext = {
  template: "",
  request: "",
  patientId: "",
  npi: ""
}

if (secret) headers["Authorization"] = "Basic " + btoa(clientId + ":" + secret);

function getParameterByName(name, url) {
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regex = new RegExp("[\\?&#]" + name + "=([^&#]*)"),
    results = regex.exec(url);
  if (results != null) {
    return decodeURIComponent(results[1].replace(/\+/g, " "))
  }
  else {
    return ""
  }

}


function updatePatient(auth_response, patientRes) {
  patientRes.gender = "female";
  // patientRes = {
  //   "resourceType": "Patient",
  //   "extension": [
  //     {
  //       "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex",
  //       "valueCode": "M"
  //     },
  //     {
  //       "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
  //       "extension": [
  //         {
  //           "url": "ombCategory",
  //           "valueCoding": {
  //             "system": "urn:oid:2.16.840.1.113883.6.238",
  //             "code": "2028-9",
  //             "display": "Asian"
  //           }
  //         },
  //         {
  //           "url": "detailed",
  //           "valueCoding": {
  //             "system": "urn:oid:2.16.840.1.113883.6.238",
  //             "code": "2039-6",
  //             "display": "Japanese"
  //           }
  //         }
  //       ]
  //     },
  //     {
  //       "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity",
  //       "extension": [
  //         {
  //           "url": "ombCategory",
  //           "valueCoding": {
  //             "system": "urn:oid:2.16.840.1.113883.6.238",
  //             "code": "2186-5",
  //             "display": "Non Hispanic or Latino"
  //           }
  //         }
  //       ]
  //     }
  //   ],
  //   "identifier": [
  //     {
  //       "assigner": {
  //         "reference": "Organization/619848"
  //       }
  //     }
  //   ],
  //   "active": true,
  //   "name": [
  //     {
  //       "use": "official",
  //       "family": "Wolf",
  //       "given": [
  //         "Person",
  //         "Name"
  //       ],
  //       "period": {
  //         "start": "2010-05-17T14:54:31.000Z"
  //       }
  //     },
  //     {
  //       "use": "usual",
  //       "given": [
  //         "Bigby"
  //       ],
  //       "period": {
  //         "start": "2012-05-22T15:45:50.000Z"
  //       }
  //     }
  //   ],
  //   "telecom": [
  //     {
  //       "system": "phone",
  //       "value": "8168229121",
  //       "use": "home",
  //       "period": {
  //         "start": "2012-05-17T15:33:18.000Z"
  //       }
  //     }
  //   ],
  //   "gender": "male",
  //   "birthDate": "1990-09-15",
  //   "address": [
  //     {
  //       "use": "home",
  //       "line": [
  //         "121212 Metcalf Drive",
  //         "Apartment 403"
  //       ],
  //       "city": "Kansas City",
  //       "district": "Jackson",
  //       "state": "KS",
  //       "postalCode": "64199",
  //       "country": "United States of America",
  //       "period": {
  //         "start": "2012-05-17T15:33:18.000Z"
  //       }
  //     }
  //   ],
  //   "maritalStatus": {
  //     "coding": [
  //       {
  //         "system": "http://terminology.hl7.org/CodeSystem/v3-NullFlavor",
  //         "code": "UNK",
  //         "display": "Unknown"
  //       }
  //     ],
  //     "text": "Unknown"
  //   },
  //   "communication": [
  //     {
  //       "language": {
  //         "coding": [
  //           {
  //             "system": "urn:ietf:bcp:47",
  //             "code": "en",
  //             "display": "English"
  //           }
  //         ],
  //         "text": "English"
  //       },
  //       "preferred": true
  //     }
  //   ],
  //   "generalPractitioner": [
  //     {
  //       "reference": "Practitioner/605926"
  //     }
  //   ]
  // }
  console.log(patientRes);
  var tempURL = params.serviceUri + "/Patient/" + auth_response.patient;
  fetch(tempURL, {
    method: 'PUT',
    body: JSON.stringify(patientRes),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json+fhir',
      'Accept-Encoding': 'gzip, deflate, sdch, br',
      'Accept-Language': 'en-US,en;q=0.8',
      'Authorization': 'Bearer ' + auth_response.access_token
    }
  }).then((response) => {
    return response.json()
  }).then((response) => {
    console.log("Patient Create response", response);
  }).catch(err => err);
}

function handleFetchErrors(response) {
  if (!response.ok) {
    consoleLog("failed to get resource", "errorClass");
    reject("Failure when fetching resource.");
  }
  return response;
}

function searchPatient(auth_response) {
  var tempURL = params.serviceUri + "/Patient?family=SMART";
  fetch(tempURL, {
    method: 'GET',
    headers: {
      'Accept': 'application/json+fhir',
      'Accept-Encoding': 'gzip, deflate, sdch, br',
      'Accept-Language': 'en-US,en;q=0.8',
      'Authorization': 'Bearer ' + auth_response.access_token
    }
  }).then((response) => {
    return response.json()
  }).then((response) => {
    console.log("Patient Search response", response);
  }).catch(err => err);
}

// obtain authorization token from the authorization service using the authorization code
const tokenPost = new XMLHttpRequest();
var auth_response;
tokenPost.open("POST", tokenUri);
tokenPost.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
tokenPost.onload = function () {
  if (tokenPost.status === 200) {
    try {
      auth_response = JSON.parse(tokenPost.responseText);
      sessionStorage["token"] = auth_response.access_token;
      console.log("auth res---", auth_response);
      // searchPatient(auth_response);
    } catch (e) {
      const errorMsg = "Failed to parse auth response";
      document.body.innerText = errorMsg;
      console.error(errorMsg);
      return;
    }

    if (auth_response.hasOwnProperty("patient")) {
      var tempURL = params.serviceUri + "/Patient/" + auth_response.patient;
      var patient = auth_response.patient;
    } else {
      var tempURL = params.serviceUri + "/Patient";
      var patient = "";
    }


    fetch(tempURL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json+fhir',
        'Accept-Encoding': 'gzip, deflate, sdch, br',
        'Accept-Language': 'en-US,en;q=0.8',
        'Authorization': 'Bearer ' + auth_response.access_token
      }
    }).then((response) => {
      return response.json()
    }).then((response) => {
      let launchDataURL = "../fetchFhirUri/" + encodeURIComponent("urn:hl7:davinci:crd:launchContext");
      console.log("launchdataurl----", launchDataURL);
      fetch(launchDataURL).then(handleFetchErrors).then(r => r.json())
        .then(launchContext => {
          if (!auth_response.hasOwnProperty("patient")) {
            patient = launchContext[state].patientId;
            // patient = "20198"
          }

          console.log("launch context---", launchContext[state]);
          const appContext = {
            template: launchContext[state].template,
            request: launchContext[state].request,
            payerName: launchContext[state].payerName,
            filepath: null,
            patientId: patient
          }
          console.log("launch context json", appContext);
          sessionStorage["patientId"] = patient;
          sessionStorage["payerName"] = launchContext[state].payerName;
          var smart = FHIR.client({
            serviceUrl: serviceUri,
            patientId: appContext.patientId,
            auth: {
              type: "bearer",
              token: auth_response.access_token
            }
          });
          ReactDOM.render(
            <App
              FHIR_URI_PREFIX={FHIR_URI_PREFIX}
              questionnaireUri={appContext.template}
              smart={smart}
              serviceRequest={appContext.request}
              filepath={appContext.filepath}
            />,
            document.getElementById("root")
          );
          const patientId = appContext.patientId;
          if (patientId == null) {
            const errorMsg = "Failed to get a patientId from the app params or the authorization response.";
            document.body.innerText = errorMsg;
            console.error(errorMsg);
            return;
          }
          return patientId;
        });
      // updatePatient(auth_response,response);

      /** Below code is for getting appcontext from Message definition form FHIR */
      //   response.description = "template%3Durn%3Ahl7%3Adavinci%3Acrd%3AAmbulatoryTransportService%26request%3D%7B%22requester%22%3A%7B%22reference%22%3A%22Practitioner%3Fidentifier%3D1932102951%22%7D%2C%22identifier%22%3A%5B%7B%22value%22%3A18631431%7D%5D%2C%22subject%22%3A%7B%22reference%22%3A%22Patient%3Fidentifier%3D20198%22%7D%2C%22parameter%22%3A%5B%7B%22code%22%3A%7B%22coding%22%3A%5B%7B%22system%22%3A%22http%3A%2F%2Floinc.org%22%2C%22code%22%3A%22A0428%22%2C%22display%22%3A%22Ambulance%20service%2C%20Basic%20Life%20Support%20(BLS)%2C%20non-emergency%20transport%20The%20mileage%20code%22%7D%5D%2C%22text%22%3A%22Ambulance%20service%2C%20Basic%20Life%20Support%20(BLS)%2C%20non-emergency%20transport%20The%20mileage%20code%22%7D%7D%5D%2C%22priority%22%3A%22routine%22%2C%22intent%22%3A%22instance-order%22%2C%22resourceType%22%3A%22DeviceRequest%22%2C%22status%22%3A%22active%22%7D%26patient%3D20198";
      //   if (appContext != undefined) {
      //     console.log("App Context--", decodeURIComponent(response.description));
      //     let resp = decodeURIComponent(response.description);
      //     var request = getParameterByName('request', resp)
      //     var patient = auth_response.patient
      //     console.log(patient, 'too')
      //     sessionStorage["patientId"] = patient;
      //     const appContext = {
      //       template: resp.split("&")[0].split("=")[1],
      //       request: JSON.parse(request),
      //       filepath: null,
      //       patientId: patient
      //     }
      //     console.log("Appcontext--",appContext);
      //     var smart = FHIR.client({
      //       serviceUrl: serviceUri,
      //       patientId: appContext.patientId,
      //       auth: {
      //         type: "bearer",
      //         token: auth_response.access_token

      //       }
      //     });
      //     ReactDOM.render(
      //       <App
      //         FHIR_URI_PREFIX={FHIR_URI_PREFIX}
      //         questionnaireUri={appContext.template}
      //         smart={smart}
      //         serviceRequest={appContext.request}
      //         filepath={appContext.filepath}
      //       />,
      //       document.getElementById("root")
      //     );
      //     const patientId = appContext.patientId;
      //     if (patientId == null) {
      //       const errorMsg = "Failed to get a patientId from the app params or the authorization response.";
      //       document.body.innerText = errorMsg;
      //       console.error(errorMsg);
      //       return;
      //     }
      //     return patientId;
      // }
    }).catch(err => err);
  } else {
    const errorMsg = "Token post request failed. Returned status: " + tokenPost.status;
    document.body.innerText = errorMsg;
    console.error(errorMsg);
    return;
  }
};
tokenPost.send(data);

