function doSearch(smart, type, q, callback) {
  // const q = {};

  // If this is for Epic, there are some specific modifications needed for the queries to work properly
  if (
    process.env.REACT_APP_EPIC_SUPPORTED_QUERIES &&
    process.env.REACT_APP_EPIC_SUPPORTED_QUERIES.toLowerCase() === "true"
  ) {
    switch (type) {
      case "Observation":
        // Epic requires you to specify a category or code search parameter, so search on all categories
        q.category = [
          "social-history",
          "vital-signs",
          "imaging",
          "laboratory",
          "procedure",
          "survey",
          "exam",
          "therapy"
        ].join(",");
        break;
      case "MedicationOrder":
        // Epic returns only active meds by default, so we need to specifically ask for other types
        q.status = ["active", "completed", "stopped", "on-hold", "draft", "entered-in-error"].join(
          ","
        );
        break;
      case "MedicationStatement":
        // Epic returns only active meds by default, so we need to specifically ask for other types
        q.status = ["active", "completed", "intended", "entered-in-error"].join(",");
        break;
      default:
      //nothing
    } 
  }
  if (type === "SupplyRequest"){
    smart.api
    .search({type: type, query: q})
    .then(processSuccess(smart, [], callback), processError(smart, callback));
  } else {
    console.log("resource typw patuent search---",type, q);
    smart.patient.api
      .search({type: type, query: q})
      .then(processSuccess(smart, [], callback), processError(smart, callback));
    }
}

function processSuccess(smart, resources, callback) {
  return response => {
    if (response.data && response.data.resourceType === "Bundle") {
      if (response.data.entry) {
        response.data.entry.forEach(function(e) {
          resources.push(e.resource);
        });
      }
      if (
        response.data.link &&
        response.data.link.some(l => l.relation === "next" && l.url != null)
      ) {
        // There is a next page, so recursively process that before we do the callback
        smart.patient.api
          .nextPage({ bundle: response.data })
          .then(processSuccess(smart, resources, callback), processError(smart, callback));
      } else {
        callback(resources);
      }
    } else {
      callback(null, new Error("Failed to parse response", response));
    }
  };
}

function processError(smart, callback) {
  return error => {
    callback(null, error);
  };
}



function buildPopulatedResourceBundle(smart, neededResources, consoleLog) {
  return new Promise(function(resolve, reject){
    console.log("waiting for patient");
    consoleLog("waiting for patient","infoClass");
    consoleLog(smart.patient.id, "infoClass");
    smart.patient.read().then(
      pt => {
        console.log("got pt", pt);
        consoleLog("got pt:" + pt, "infoClass");
        sessionStorage['patientObject'] = JSON.stringify(pt)
        const entryResources = [pt];
        const readResources = (neededResources, callback) => {
          const rq = neededResources.pop();
          let r = "";
          let q = {};
          if (rq !== undefined ) {
            r = rq.type;
            q = rq.query;
          } 
          if (r === "") {
            callback();
          } else if (r === "Patient") {
            readResources(neededResources, callback);
          } else {

            doSearch(smart, r, q, (results, error) => {
              if (results) {
                entryResources.push(...results);
              }
              if (error) {
                console.error(error);
                consoleLog(error.data.statusText,"errorClass");
              }
              readResources(neededResources, callback);
            });
          }
        };

        readResources(neededResources.slice(), () => {
          const bundle = {
            resourceType: "Bundle",
            type: "collection",
            entry: entryResources.map(r => ({ resource: r }))
          };
          resolve(bundle);
        });
      },
      error => {
          consoleLog("error: " + error, "errorClass");
        console.log(error);
        reject(error);
      }
    );
  });
}

export default buildPopulatedResourceBundle;
