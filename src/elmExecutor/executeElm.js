import cql from "cql-execution";
import cqlfhir from "cql-exec-fhir";
// import fhirhelpersElm from "./FHIRHelpers.json";
import extractFhirResourcesThatNeedFetching from "./extractFhirResourcesThatNeedFetching";
import buildPopulatedResourceBundle from "./buildPopulatedResourceBundle";
import "fhirclient";

function getSmartConnection(){

  var smart = FHIR.client({
          serviceUrl: sessionStorage["serviceUri"],
          patientId: sessionStorage["patientId"],
          auth: {
            type: "bearer",
            token: sessionStorage["token"]

          }
        });
  return smart
}

function executeElm(smart, fhirVersion, executionInputs, consoleLog) {
  smart = getSmartConnection(); 
  return new Promise(function(resolve, reject){
    const patientSource = getPatientSource(fhirVersion)
    console.log("SssnStorage",sessionStorage)
    if(sessionStorage.hasOwnProperty("CommunicationRequest")){
      smart.patient.api.read({type: "CommunicationRequest", id: sessionStorage["CommunicationRequest"]})
      .then(response => {
        console.log("response",response)
      }, err => reject(err))
    }
    const neededResources = extractFhirResourcesThatNeedFetching(executionInputs.dataRequirement);
    consoleLog("need to fetch resources","infoClass");
    console.log("We need to fetch these resources:", neededResources);
    sessionStorage['fhir_queries'] = JSON.stringify(neededResources);

    buildPopulatedResourceBundle(smart, neededResources, consoleLog)
    .then(function(resourceBundle) {
      console.log("Fetched resources are in this bundle:", resourceBundle);
      console.log(JSON.stringify(resourceBundle));
      patientSource.loadBundles([resourceBundle]);
      const elmResults = executeElmAgainstPatientSource(executionInputs, patientSource);
      const results = {
        bundle: resourceBundle,
        elmResults: elmResults
      }
      resolve(results);
    })
    .catch(function(err){reject(err)});
  });
}

function executeElmAgainstPatientSource(executionInputs, patientSource) {
  // executionInputs.elmDependencies = [ fhirhelpersElm ]
  const repository = new cql.Repository(executionInputs.elmDependencies);
  const lib = new cql.Library(executionInputs.elm, repository);
  const codeService = new cql.CodeService(executionInputs.valueSetDB);
  const executor = new cql.Executor(lib, codeService, executionInputs.parameters);
  const results = executor.exec(patientSource);
  return results.patientResults[Object.keys(results.patientResults)[0]];
}

function getPatientSource(fhirVersion) {
  if (fhirVersion == "dstu2") return cqlfhir.PatientSource.FHIRv102();
  if (fhirVersion == "stu3") return cqlfhir.PatientSource.FHIRv300();
}


export default executeElm;