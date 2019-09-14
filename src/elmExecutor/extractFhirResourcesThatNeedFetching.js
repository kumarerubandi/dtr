function extractFhirResourcesThatNeedFetching(elm) {
  const resources = new Set();
  //TODO: why was this elm.source?! and how was it working?
  // if ((((elm || {}).library || {}).statements || {}).def) {
  //     // Object.keys(elm.library.statements.def).forEach((e)=>{
  //     //     extractResourcesFromExpression(resources, elm.library.statements.def[e].expression);
  //     // });
  //   for (const expDef of Object.keys(elm.library.statements.def)) {
  //     extractResourcesFromExpression(resources, elm.library.statements.def[expDef].expression);
  //   }
  // }
  if (elm || []){
    for (const query of Object.keys(elm)) {
      const resource = {type:"",query:{}}
      if (elm[query].type !== undefined){
        resource.type = elm[query].type;
      }
      if (elm[query].codeFilter !== undefined){
        if ((elm[query].codeFilter || [])){
          const key = elm[query].codeFilter[0].path;
          if (elm[query].codeFilter[0].valueSetString !== "Patient.id"){
            resource.query[key] = elm[query].codeFilter[0].valueSetString;
          } else {
            resource.query[key] = sessionStorage["patientId"];
          }
        }
      }
      resources.add(resource);
    }
  }
  return Array.from(resources);
}

function extractResourcesFromExpression(resources, expression) {
  if (expression && Array.isArray(expression)) {
    expression.forEach(function(e) {
      extractResourcesFromExpression(resources, e);
    });
  } else if (expression && typeof expression === "object") {
    if (expression.type === "Retrieve") {
      const match = /^(\{http:\/\/hl7.org\/fhir\})?([A-Z][a-zA-Z]+)$/.exec(expression.dataType);
      if (match) {
        resources.add(match[2]);
      } else {
        console.error("Cannot find resource for Retrieve w/ dataType: ", expression.dataType);
      }
    } if (expression.type === "List") {
      Object.keys(expression.element).forEach((e)=>{
        if (expression.element[e].value !== undefined){
          resources.add(expression.element[e].value);
        }
      });
    }else {
        Object.keys(expression).forEach((e)=>{
            extractResourcesFromExpression(resources, expression[e]);
        });
    //   for (const val of Object.keys(expression)) {
    //     extractResourcesFromExpression(resources, expression[val]);
    //   }
    }
  }
}

export default extractFhirResourcesThatNeedFetching;
