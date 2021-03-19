
let crossLanguageValidationRules;

export function setValidationRules(rules) {
    if (rules === undefined || rules === null
        || rules["schema-version"] !== "0.2"
        || rules["schema-version"] === undefined
        || rules.mandatoryRules === undefined
        || rules.immutableRules === undefined
        || rules.contentRules === undefined
        || rules.updateRules === undefined) {
        console.error("Rules are not valid");
        crossLanguageValidationRules = {
            "schema-version": "0.2",
            "mandatoryRules": {},
            "immutableRules": {},
            "contentRules": {},
            "updteRules": {}
        }
    } else {
        crossLanguageValidationRules = rules;
    }
}

export function isMandatory(typeName, property, object, userPerms) {
    //console.log("userPerms:", userPerms, "instanceof Array?", userPerms instanceof Array);
    // TODO more param checks
    if (object === undefined) {
        return false;
    }
    console.info("INFO - Checking mandatory rules for:", typeName, property);
    let typeRules = crossLanguageValidationRules.mandatoryRules[typeName];
    return checkTypeRules(typeRules, property, object, userPerms);
}

export function validateMandatory(typeName, property, object, userPerms) {
    return object[property] !== null && isMandatory(typeName, property, object, userPerms);
}

export function isImmutable(typeName, property, object, userPerms) {
    //console.log("userPerms:", userPerms, "instanceof Array?", userPerms instanceof Array);
    // TODO more param checks
    if (object === undefined) {
        return false;
    }
    console.log("Checking immutable rules for:", typeName, property);
    let typeRules = crossLanguageValidationRules.immutableRules[typeName];
    return checkTypeRules(typeRules, property, object, userPerms);
}


function checkTypeRules(typeRules, property, object, userPerms) {
    if (typeRules !== undefined) {
        let propertyRules = typeRules[property];
        if (propertyRules !== undefined) {
            let matchingConditions = getMatchingConditions(propertyRules, userPerms);
            if (matchingConditions !== undefined) {
                return allConditionsAreMet(matchingConditions, object);
            }
            return false;
        }
    }
    return false; // no rules defined for type
}

/** Returns conditionsTopGroup with matching permissions if exists,
 * otherwise the default conditionsTopGroup (w/o any permissions) if exists,
 * otherwise an 'empty' topGroup
 * TODO fix logic? ...
 **/
function getMatchingConditions(propertyRules, userPerms) {
    let defaultConditions; // conditions w/o any permissions
    for (let i = 0; i < propertyRules.length; i++ ) {
        let permissions = propertyRules[i]["permissions"];
        let conditionsTopGroup = getConditionsTopGroup(propertyRules[i]);
        if (userPerms === undefined && permissions === undefined)  {
            console.debug("DEBUG - conditionsTopGroup w/o permissions found")
            return conditionsTopGroup;
        } else if (userPerms !== undefined) {
            // look for conditions with matching permission resp. default conditions
            if (permissions !== undefined) {
                let matchingPerms = userPerms.filter(value => permissions["values"].includes(value));
                //console.log(permissions["values"], "intersect", userPerms, "?", matchingPerms)
                if (matchingPerms.length > 0) {
                    console.debug("DEBUG - conditionsTopGroup for matching permissions: ", matchingPerms)

                    return conditionsTopGroup;
                }
            } else {
                defaultConditions = conditionsTopGroup;
            }
        }
    }
    return defaultConditions;
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
    let property = condition["property"];
    let constraint = condition["constraint"];
    if (property === undefined || constraint === undefined) {
        console.error("ERROR - condition.property and condition.contraint must not be undefined")
        return false;
    }
    let propValue = getPropertyValue(condition.property, object)
    if (propValue === undefined) {
        console.warn("WARN - Condition ", condition, "propValue is undefined; return false")
        return false;
    }
    //console.log("typeof", propValue, typeof propValue)
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
    console.debug("DEBUG - Condition:", condition, "->", isMet)
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
        //console.log("propertyPartName:", propertyPartName)
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
            if (typeof propValue != 'number' && propValue instanceof Date && !isNaN(propAsDate)) {
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
            //console.log(constraint.values.map(v => findPropertyValue(v, object)));
            let refValues = constraint.values.map(v => getPropertyValue(v, object));
            let propAsDate = new Date(propValue);
            if (propAsDate instanceof Date && !isNaN(propAsDate)) {
                let matchLength =  refValues.map(v => new Date(v)).filter(valueAsDate => +valueAsDate === +propAsDate).length;
                if (constraint.type === 'EQUALS_ANY_REF') {
                    return matchLength > 0;
                } else {
                    return matchLength = 0;
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
        if (propValue.match(regex)) {
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
