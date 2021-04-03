const emptyValidationRules = {
    "schema-version": "0.2",
    "mandatoryRules": {},
    "immutableRules": {},
    "contentRules": {},
    "updateRules": {}
}

let crossLanguageValidationRules = emptyValidationRules;

let defaultMandatoryMessage = "error.validation.mandatory";
let defaultImmutableMessage = "error.validation.immutable";
let defaultContentMessage = "error.validation.content";
// let defaultUpdateMessage = "error.validation.update";

export function setValidationRules(rules) {
    if (rules === undefined || rules === null
        || rules["schema-version"] !== "0.2"
        || rules.mandatoryRules === undefined
        || rules.immutableRules === undefined
        || rules.contentRules === undefined
        || rules.updateRules === undefined) {
        console.error("Rules are not valid");
        crossLanguageValidationRules = emptyValidationRules;
    } else {
        crossLanguageValidationRules = rules;
    }
}

export function isPropertyMandatory(typeName, property, object, userPerms) {
    // console.log("userPerms:", userPerms, "instanceof Array?", userPerms instanceof Array);
    // TODO more param checks
    if (object === undefined) {
        return undefined;
    }
    console.info("INFO - Checking mandatory rules for:", typeName, property);
    let typeRules = crossLanguageValidationRules.mandatoryRules[typeName];
    return getMatchingPropertyConstraint(typeRules, property, object, userPerms) !== undefined;
}

const EQUALS_NOT_NULL_CONSTRAINT = {type: "EQUALS_NOT_NULL"};
export function validateMandatoryPropertyRules(typeName, property, object, userPerms) {
    if (isPropertyMandatory(typeName, property, object, userPerms)
        && !conditionIsMet({property: property, constraint: EQUALS_NOT_NULL_CONSTRAINT}, object)) {
        return defaultMandatoryMessage + "." + typeName + "." + property;
    }
    return "VALID";
}

export function isPropertyImmutable(typeName, property, object, userPerms) {
    //console.log("userPerms:", userPerms, "instanceof Array?", userPerms instanceof Array);
    // TODO more param checks
    if (object === undefined) {
        return undefined;
    }
    console.info("INFO - Checking immutable rules for:", typeName, property);
    let typeRules = crossLanguageValidationRules.immutableRules[typeName];
    return getMatchingPropertyConstraint(typeRules, property, object, userPerms) !== undefined;
}

export function validateImmutablePropertyRules(typeName, property, originalObject, modifiedObject, userPerms) {
    if (isPropertyImmutable(typeName, property, originalObject, userPerms)
        && !propertyValuesEquals(property, originalObject, modifiedObject)) {
        return defaultImmutableMessage + "." + typeName + "." + property;
    }
    return "VALID";
}

function propertyValuesEquals(property, originalObject, modifiedObject) {
    let propertiesToCheck = inflatePropertyIfMultiIndexed(property, originalObject);
    if (propertiesToCheck.length !== inflatePropertyIfMultiIndexed(property, modifiedObject).length) {
        return false;
    }
    for (let propertyToCheck of propertiesToCheck) {
        let originalValue = getPropertyValue(propertyToCheck, originalObject);
        let modifiedValue = getPropertyValue(propertyToCheck, modifiedObject);
        //console.debug("Property '{}': original value is '{}', modified value is '{}'", propertyToCheck, originalValue, modifiedValue);
        if (originalValue !== modifiedValue) {
            return false;
        }
    }
    return true;
}

function getPropertyContentConstraint(typeName, property, object, userPerms) {
    //console.log("userPerms:", userPerms, "instanceof Array?", userPerms instanceof Array);
    // TODO more param checks
    if (object === undefined) {
        return undefined;
    }
    console.info("INFO - Checking content rules for:", typeName, property);
    let typeRules = crossLanguageValidationRules.contentRules[typeName];
    return getMatchingPropertyConstraint(typeRules, property, object, userPerms);
}

export function validateContentPropertyRules(typeName, property, object, userPerms) {
    let constraint = getPropertyContentConstraint(typeName, property, object, userPerms);
    if (constraint !== undefined && constraint.type !== undefined
        && !conditionIsMet({property: property, constraint: constraint}, object)) {
        return defaultContentMessage + "." + typeName + "." + property;
    }
    return "VALID";
}

function getMatchingPropertyConstraint(typeRules, property, object, userPerms) {
    let propertyRules = typeRules[property];
    if (typeRules === undefined || propertyRules === undefined) {
        return undefined;
    }
    if (propertyRules.length === 0) {
        return {};
    }
    // find first constraint with matching permission and valid conditions
    for (let i = 0; i < propertyRules.length; i++ ) {
        let permissions = propertyRules[i]["permissions"];
        if (arePermissionsMatching(permissions, userPerms)
            && allConditionsAreMet(getConditionsTopGroup(propertyRules[i]), object)) {
            let constraint = propertyRules[i]["constraint"];
            return constraint !== undefined ? constraint : {};
        }
    }
    // find first default constraint (w/o any permission) and valid conditions
    for (let i = 0; i < propertyRules.length; i++ ) {
        let permissions = propertyRules[i]["permissions"];
        if (permissions === undefined
            && allConditionsAreMet(getConditionsTopGroup(propertyRules[i]), object)) {
            let constraint = propertyRules[i]["constraint"];
            return constraint !== undefined ? constraint : {};
        }
    }
    return undefined;
}

function arePermissionsMatching(conditionPerms, userPerms) {
    if (conditionPerms === undefined || userPerms === undefined) {
        return false;
    }
    let matchingPerms = userPerms.filter(value => conditionPerms["values"].includes(value));
    //console.log(conditionPerms["values"], "intersect", userPerms, "?", matchingPerms)
    return matchingPerms.length > 0;
}

function getConditionsTopGroup(propertyRule) {
    // Default is a 'top group' w/o any 'conditions' which is evaluated to true! (see: groupConditionsAreMet)
    let topGroupToReturn = {"operator":"AND","conditionsGroups":[{"operator":"AND","conditions":[]}]};
    let condition = propertyRule["condition"];
    let conditionsGroup = propertyRule["conditionsGroup"];
    let conditionsTopGroup = propertyRule["conditionsTopGroup"];
    if (condition !== undefined) {
        topGroupToReturn.conditionsGroups[0].conditions[0] = condition;
        if (conditionsGroup !== undefined || conditionsTopGroup !== undefined) {
            console.warn("Property rule should contain either 'condition' or 'conditionsGroup' or " +
                "'conditionsTopGroup'. Property 'condition' takes precedence", propertyRule)
        }
    } else if (conditionsGroup !== undefined) {
        topGroupToReturn.conditionsGroups[0] = conditionsGroup;
        if (conditionsTopGroup !== undefined) {
            console.warn("Property rule should contain either 'conditionsGroup' or " +
                "'conditionsTopGroup'. Property 'conditionsGroup' takes precedence", constraint.type)
        }
    } else if (conditionsTopGroup !== undefined) {
        topGroupToReturn = conditionsTopGroup;
    }
    return topGroupToReturn;
}

/**
 * Validates if all conditions groups are met according to 'group operator' (i.e. AND resp. OR).
 * If groups are ANDed each group must be met, if they are ORed only one group must be met.
 */
function allConditionsAreMet(conditionsTopGroup, object) {
    if (conditionsTopGroup["conditionsGroups"] === undefined) {
        console.error("ERROR - Should not happen: conditionsGroups === undefined")
        return false;
    }
    let operator = conditionsTopGroup["operator"];
    for (let i = 0; i < conditionsTopGroup["conditionsGroups"].length; i++) {
        let curSubGroup = conditionsTopGroup["conditionsGroups"][i];
        let conditionsAreMet = groupConditionsAreMet(curSubGroup, object);
        console.debug("DEBUG -", curSubGroup.operator, "groupConditionsAreMet:", conditionsAreMet)
        if (conditionsAreMet) {
            if (operator === "OR") {
                return true;
            }
        } else {
            if (operator === "AND") {
                return false;
            }
        }
    }
    return operator === "AND";
}
/**
 * Validates if group conditions are met according to 'group operator' (i.e. AND resp. OR).
 * If conditions are ANDed each constraint must be met, if they are ORed only one constraint must be met.
 */
function groupConditionsAreMet(conditionsSubGroup, object) {
    let operator = conditionsSubGroup["operator"];
    let conditions = conditionsSubGroup["conditions"];
    for (let i = 0; i < conditions.length; i++) {
        let curCondition = conditions[i];
        let isMet = conditionIsMet(curCondition, object);
        if (operator === "OR") {
            if (isMet) {
                return true;
            }
        } else if (operator === "AND") {
            if (!isMet) {
                return false;
            }
        } else {
            console.error("ERROR - Should never happen: unknown operator:", operator);
        }
    }
    return operator === "AND";
}

/**
 * Validates the condition against the object.
 */
function conditionIsMet(condition, object) {
    let propertiesToCheck = inflatePropertyIfMultiIndexed(condition.property, object);
    for (let i = 0; i < propertiesToCheck.length; i++) {
        let propValue = getPropertyValue(propertiesToCheck[i], object)
        //console.log("propertiesToCheck: ", propertiesToCheck, ", propValue: ", propValue)
        if (propValue === undefined) {
            console.warn("WARN - Condition ", condition, "propValue is undefined; return false")
            return false;
        }
        if (!constraintIsValid(condition.constraint, propValue, object)) {
            return false;
        }
    }
    return true;
}

function constraintIsValid(constraint, propValue, object) {
    let isMet;
    switch (constraint.type) {
        case 'EQUALS_ANY':
        case 'EQUALS_NONE':
        case 'EQUALS_NULL':
        case 'EQUALS_NOT_NULL':
            isMet = equalsConstraintIsMet(constraint, propValue);
            break;
        case 'EQUALS_ANY_REF':
        case 'EQUALS_NONE_REF':
            isMet = equalsRefConstraintIsMet(constraint, propValue, object);
            break;
        case 'REGEX_ANY':
            isMet =  regexConstraintIsMet(constraint, propValue);
            break;
        case 'SIZE':
            isMet =  sizeConstraintIsMet(constraint, propValue);
            break;
        case 'RANGE':
            isMet =  rangeConstraintIsMet(constraint, propValue);
            break;
        case 'DATE_FUTURE':
        case 'DATE_PAST':
            isMet =  dateConstraintIsMet(constraint, propValue);
            break;
        default:
            console.error("ERROR - Constraint type not supported (yet): ", constraint.type)
    }
    //console.debug("DEBUG - constraint:", constraint, "->", isMet)
    return isMet;
}

/**
 * Tries to find hierarchical properties value in item.
 * For example propertyName = 'location.type' will return the value of item.location.type.
 * Single-indexed properties are supported as well, eg. 'articles[0].accessories[1].name
 */
function getPropertyValue(propertyName, object) {
    let propertyParts = propertyName.split(".");
    let propertyValue = object;
    for (let i = 0; i < propertyParts.length; i++) {
        let propertyPart = propertyParts[i];
        // split up propertyPart into name and optional index, e.g. 'article[0]' into 'article and 0
        let propertyPartName = propertyPart.split("[")[0];
        propertyValue = propertyValue[propertyPartName];
        //console.log("propertyValue:", propertyValue)
        if (propertyPart.endsWith("]")) {
            let index = /\[(\d+)]/.exec(propertyPart)[1];
            //console.log("index:", index);
            if (Array.isArray(propertyValue)) {
                if (propertyValue.length > index) {
                    console.debug("DEBUG - propertyValue[index]", propertyValue[index]);
                    propertyValue = propertyValue[index];
                } else {
                    console.error("ERROR - Indexed property is not an array:", propertyValue);
                    return undefined;
                }
            } else {
                console.error("ERROR - Indexed property is not an array:", propertyValue);
                return undefined;
            }
        }
    }
    //console.log("getPropertyValue:", propertyName, "->", propertyValue);
    return propertyValue;
}

/**
 * Validates equals constraint.
 */
export function equalsConstraintIsMet(constraint, propValue) {
    switch (constraint.type) {
        case 'EQUALS_ANY':
        case 'EQUALS_NONE': //TODO: new Date(1) ist instanceOfDate :-(
            let propAsDate = new Date(propValue);
            if (typeof propValue != 'number' && propAsDate instanceof Date && !isNaN(propAsDate)) {
                let matchLength =  constraint.values.map(v => new Date(v)).filter(valueAsDate => +valueAsDate === +propAsDate).length;
                if (constraint.type === 'EQUALS_ANY') {
                    return matchLength > 0;
                } else {
                    return matchLength === 0;
                }
            } else {
                if (constraint.type === 'EQUALS_ANY') {
                    return constraint.values.indexOf(propValue) !== -1;
                } else {
                    return constraint.values.indexOf(propValue) === -1;
                }
            }
        case 'EQUALS_NULL':
            return propValue === null;
        case 'EQUALS_NOT_NULL':
            return propValue !== null;
        default:
            console.error("ERROR - Unknown equals constraint type: ", constraint.type)
    }
    return false;
}

/**
 * Validates equals ref constraint.
 */
export function equalsRefConstraintIsMet(constraint, propValue, object) {
    switch (constraint.type) {
        case 'EQUALS_ANY_REF':
        case 'EQUALS_NONE_REF':
            let refValues = constraint.values
                .flatMap(refProp => inflatePropertyIfMultiIndexed(refProp, object))
                .map(prop => getPropertyValue(prop, object));
            let propAsDate = new Date(propValue);
            if (propAsDate instanceof Date && !isNaN(propAsDate)) {
                let matchLength =  refValues.map(v => new Date(v)).filter(valueAsDate => +valueAsDate === +propAsDate).length;
                if (constraint.type === 'EQUALS_ANY_REF') {
                    return matchLength > 0;
                } else {
                    return matchLength === 0;
                }
            } else {
                if (constraint.type === 'EQUALS_ANY_REF') {
                    return refValues.indexOf(propValue) !== -1;
                } else {
                    return refValues.indexOf(propValue) === -1;
                }
            }
        default:
            console.error("ERROR - Unknown equals ref constraint type: ", constraint.type)
    }
    return false;
}

/**
 * Validates regex constraint.
 */
export function regexConstraintIsMet(constraint, propValue) {
    if (constraint.type !== 'REGEX_ANY') {
        console.error("ERROR - Unknown regex constraint type: ", constraint.type)
        return true;
    }
    for (let regex of constraint.values) {
        if (("" + propValue).match(regex)) {
            //console.log(propValue, "match", regex);
            return true;
        }
        //console.log(propValue, "not match", regex);
    }
    return false;
}

/**
 * Validates size constraint.
 */
export function sizeConstraintIsMet(constraint, propValue) {
    if (constraint.type !== 'SIZE') {
        console.error("ERROR - Size constraint must have 'type' property with value 'SIZE': ", constraint.type)
        return false;
    }
    if (constraint.min === undefined && constraint.max === undefined) {
        console.error("ERROR - Size constraint must have at least 'min' or 'max' property: ", constraint)
        return false;
    }
    if (constraint.min !== undefined && typeof constraint.min != 'number'
        || constraint.max !== undefined && typeof constraint.max != 'number') {
        console.error("ERROR - Size constraint 'min' and 'max' values must have type 'number': ", constraint)
        return false;
    }
    // Check min <= length <= max
    if (typeof propValue == "string") {
        return (constraint.min === undefined || propValue.length >= constraint.min)
            && (constraint.max === undefined || propValue.length <= constraint.max)
    } else if (typeof propValue == "object") {  // e.g. {"one":1, "two":2} resp. [1,2]
        let size = Object.keys(propValue).length;
        return (constraint.min === undefined || size >= constraint.min)
            && (constraint.max === undefined || size <= constraint.max)
    } else {
        console.error("ERROR - Unsupported type of size constraint value:", typeof propValue)
    }
    return false;
}

/**
 * Validates range constraint.
 */
export function rangeConstraintIsMet(constraint, propValue) {
    if (constraint.type !== 'RANGE') {
        console.error("ERROR - Range constraint must have 'type' property with value 'RANGE': ", constraint.type)
        return false;
    }
    if (constraint.min === undefined && constraint.max === undefined) {
        console.error("ERROR - Range constraint must have at least 'min' or 'max' property: ", constraint)
        return false;
    }
    if (constraint.min !== undefined && typeof constraint.min != 'number'
        || constraint.max !== undefined && typeof constraint.max != 'number') {
        console.error("ERROR - Range constraint 'min' and 'max' values must have type 'number': ", constraint)
        return false;
    }
    // Check min <= length <= max
    if (typeof propValue == "number") {
        return (constraint.min === undefined || propValue >= constraint.min)
            && (constraint.max === undefined || propValue <= constraint.max)
    } else {
        console.error("ERROR - Unsupported type of range constraint value:", typeof propValue)
    }
    return false;
}

/**
 * Validates date constraint.
 */
export function dateConstraintIsMet(constraint, propValue) {
    if (constraint.days === undefined) {
        console.error("ERROR - Date constraint must have 'days' property: ", constraint)
        return false;
    }
    let propAsDate = new Date(propValue);
    if (!(propAsDate instanceof Date) || isNaN(propAsDate)) {
        console.error("ERROR - The property value is not a valid date: ", propValue)
        return false;
    }
    switch (constraint.type) {
        case 'DATE_FUTURE':
            propAsDate.setDate(propAsDate.getDate() - constraint.days);
            return propAsDate > new Date();
        case 'DATE_PAST':
            propAsDate.setDate(propAsDate.getDate() + constraint.days);
            return propAsDate < new Date();
        default:
            console.error("ERROR - Date constraint must have 'type' property ['DATE_FUTURE', 'DATE_PAST']: ", constraint.type)
    }
    return false;
}


// Inflate property with multi-index definitions to properties with single-index definitions, e.g.
// "foo.bar[0,1].zoo.baz[2-3]" ->
// ["foo.bar[0].zoo.baz[2]", "foo.bar[0].zoo.baz[3]", "foo.bar[1].zoo.baz[2]", "foo.bar[1].zoo.baz[3]"]
let INDEX_PARTS_REGEX = /^(.+)\[(\d+(,\d+)*|\d+\/\d+|\d+-\d+|\*)]$/;
export function inflatePropertyIfMultiIndexed(property, object) {
    if (property.indexOf("[") === -1) {
        return [property];
    }
    let propertyParts = property.split(".");
    let inflatedProperties = [""];
    let delimiter = "";
    for (let propertyPart of propertyParts) {
        let parts = INDEX_PARTS_REGEX.exec(propertyPart);
        if (parts !== null) {
            let propertyPartName = delimiter + parts[1];
            let indexPart =  parts[2];
            if (indexPart === "*" || indexPart.indexOf("/") >= 0) {
                let startStep = indexPart === "*" ? [0, 1] : indexPart.split("/");
                inflatedProperties = inflatedProperties.map(ip => ip + propertyPartName)
                    .flatMap(ip => [...startStepIter(ip, object, +startStep[0], startStep[1])]
                        .map(i => ip + "[" + i + "]"))
            } else if (indexPart.indexOf("-") >= 0) {
                let intervall = indexPart.split("-");
                let indexList = [...intervallIter(+intervall[0], intervall[1])];
                inflatedProperties = inflatedProperties.map(ip => ip + propertyPartName)
                    .flatMap(ip => indexList.map(i => ip + "[" + i + "]"))
            } else {
                let indexList = indexPart.split(",");
                inflatedProperties = inflatedProperties.map(ip => ip + propertyPartName)
                    .flatMap(ip => indexList.map(i => ip + "[" + i + "]"))
            }
        } else if (propertyPart.lastIndexOf("[") >= 0) {
            console.error("Not a valid indexed property: " + propertyPart);
            return [];
        } else {
            inflatedProperties = inflatedProperties.map(p => p + delimiter + propertyPart);
        }
        delimiter = ".";
    }
    return inflatedProperties;
}

// ("foo", {foo:["a","b","c","d","e","f",]}, 1, 2) -> 1,3,5)
function* startStepIter(property, object, startIndex, step) {
    let propertyValue = getPropertyValue(property, object);
    if (propertyValue === undefined || !Array.isArray(propertyValue)) {
        console.error("Should not happen: propertyValue is not an array: " + property);
    } else {
        for (let i = startIndex; i < propertyValue.length; i++) {
            if (i >= startIndex && (i - startIndex) % step == 0) {
                yield i;
            }
        }
    }
}

function* intervallIter(start, end) {
    for (let i = start; i <= end; i++) {
        yield i;
    }
}
