const SCHEMA_VERSION = "0.5";

const emptyValidationRules = {
    "schema-version": SCHEMA_VERSION,
    "mandatoryRules": {},
    "immutableRules": {},
    "contentRules": {},
    "updateRules": {}
}

let crossLanguageValidationRules = emptyValidationRules;

let defaultMandatoryMessage = "error.validation.mandatory.";
let defaultImmutableMessage = "error.validation.immutable.";
let defaultContentMessage = "error.validation.content.";
let defaultUpdateMessage = "error.validation.update.";

const EQUALS_NOT_NULL_CONSTRAINT = {type: "EQUALS_NOT_NULL"};

export function setValidationRules(rules) {
    if (rules === undefined || rules === null
        || rules["schema-version"] !== SCHEMA_VERSION
        || rules.mandatoryRules === undefined
        || rules.immutableRules === undefined
        || rules.contentRules === undefined
        || rules.updateRules === undefined) {
        console.error("Rules are not valid. Top level content does not match the schema version %s", SCHEMA_VERSION);
        crossLanguageValidationRules = emptyValidationRules;
    } else {
        crossLanguageValidationRules = rules;
    }
}

/**
 * If there is a matching _content rule_ with an EQUALS_ANY resp. EQUALS_ANY_REF constraint for the property, the values
 * of that constraint are returned. Otherwise, if there is a matching _update_ rule with an EQUALS_ANY resp.
 * EQUALS_ANY_REF constraint for the property, the values of that constraint are returned. Otherwise, 'undefined' is
 * returned.
 */
export function getAllowedPropertyValues(typeName, property, object, userPerms) {
    const contentRule = getMatchingContentPropertyRule(typeName, property, object, userPerms);
    let allowedValues = getAllowedPropertyValuesForRule(contentRule, object);
    if (allowedValues === undefined) {
        const updateRule = getMatchingUpdatePropertyRule(typeName, property, object, userPerms);
        allowedValues = getAllowedPropertyValuesForRule(updateRule, object);
    }
    return allowedValues;
}

function getAllowedPropertyValuesForRule(rule, object) {
    let constraint = rule !== undefined ? rule.constraint : undefined;
    if (constraint !== undefined && constraint.type !== undefined) {
        if (constraint.type === "EQUALS_ANY") {
            return constraint.values;
        } else if (constraint.type === "EQUALS_ANY_REF") {
            const allValues = [];
            for (const refProp of constraint.values) {
                allValues.push(...getPropertyValues(refProp, object));
            }
            return allValues;
        }
    }
    return undefined;
}

export function validateMandatoryRules(typeName, object, userPerms) {
    let rules = crossLanguageValidationRules.mandatoryRules[typeName];
    return rules === undefined ? [] : Object.keys(rules)
        .map(property => validateMandatoryPropertyRules(typeName, property, object, userPerms))
        .filter(e => e !== "");
}

export function validateMandatoryPropertyRules(typeName, property, object, userPerms) {
    const rule = getMatchingMandatoryPropertyRule(typeName, property, object, userPerms);
    if (rule !== undefined
        && !conditionIsMet({property: property, constraint: EQUALS_NOT_NULL_CONSTRAINT}, object)) {
        return buildErrorMessage(defaultMandatoryMessage, null, typeName, rule.errorCodeControl, property);
    }
    return "";
}

export function isPropertyMandatory(typeName, property, object, userPerms) {
    console.debug("DEBUG - Checking mandatory rules for:", typeName, property);
    return getMatchingMandatoryPropertyRule(typeName, property, object, userPerms) !== undefined;
}

function getMatchingMandatoryPropertyRule(typeName, property, object, userPerms) {
    if (object === undefined) {
        return undefined;
    }
    if (validateAndGetTerminalAggregateFunctionIfExist(property)) {
        console.error("Aggregate functions are not allowed for mandatory property rules: %s", property);
        return undefined;
    }
    let typeRules = crossLanguageValidationRules.mandatoryRules[typeName];
    return getMatchingPropertyRule(typeRules, property, object, userPerms);
}


export function validateImmutableRules(typeName, originalObject, modifiedObject, userPerms) {
    let rules = crossLanguageValidationRules.immutableRules[typeName];
    return rules === undefined ? [] : Object.keys(rules)
        .map(property => validateImmutablePropertyRules(typeName, property, originalObject, modifiedObject, userPerms))
        .filter(e => e !== "");
}

export function validateImmutablePropertyRules(typeName, property, originalObject, modifiedObject, userPerms) {
    const rule = getMatchingImmutablePropertyRule(typeName, property, originalObject, userPerms);
    if (rule !== undefined
        && !propertyValuesEquals(property, originalObject, modifiedObject)) {
        return buildErrorMessage(defaultImmutableMessage, null, typeName, rule.errorCodeControl, property);
    }
    return "";
}

export function isPropertyImmutable(typeName, property, object, userPerms) {
    console.debug("DEBUG - Checking immutable rules for:", typeName, property);
    return getMatchingImmutablePropertyRule(typeName, property, object, userPerms) !== undefined;
}

function getMatchingImmutablePropertyRule(typeName, property, object, userPerms) {
    if (object === undefined) {
        return undefined;
    }
    if (validateAndGetTerminalAggregateFunctionIfExist(property)) {
        console.error("Aggregate functions are not allowed for immutable property rules: %s", property);
        return undefined;
    }
    let typeRules = crossLanguageValidationRules.immutableRules[typeName];
    return getMatchingPropertyRule(typeRules, property, object, userPerms);
}


function propertyValuesEquals(property, originalObject, modifiedObject) {
    let propertiesToCheck = inflatePropertyIfMultiIndexed(property, originalObject);
    if (propertiesToCheck.length !== inflatePropertyIfMultiIndexed(property, modifiedObject).length) {
        return false;
    }
    for (let propertyToCheck of propertiesToCheck) {
        let originalValue = getPropertyValue(propertyToCheck, originalObject);
        let modifiedValue = getPropertyValue(propertyToCheck, modifiedObject);
        console.debug("Property '{}': original value is '{}', modified value is '{}'", propertyToCheck, originalValue,
            modifiedValue);
        if (originalValue !== modifiedValue) {
            return false;
        }
    }
    return true;
}


export function validateContentRules(typeName, object, userPerms) {
    let rules = crossLanguageValidationRules.contentRules[typeName];
    return rules === undefined ? [] : Object.keys(rules)
        .map(property => validateContentPropertyRules(typeName, property, object, userPerms))
        .filter(e => e !== "");
}

export function validateContentPropertyRules(typeName, property, object, userPerms) {
    let rule = getMatchingContentPropertyRule(typeName, property, object, userPerms);
    let constraint = rule !== undefined ? rule.constraint : undefined;
    if (constraint !== undefined && constraint.type !== undefined
        && !conditionIsMet({property: property, constraint: constraint}, object)) {
        return buildErrorMessage(defaultContentMessage, constraint.type.toLowerCase(), typeName, rule.errorCodeControl,
            property);
    }
    return "";
}

function getMatchingContentPropertyRule(typeName, property, object, userPerms) {
    if (object === undefined) {
        return undefined;
    }
    console.info("Checking content rules for:", typeName, property);
    let typeRules = crossLanguageValidationRules.contentRules[typeName];
    return getMatchingPropertyRule(typeRules, property, object, userPerms);
}


export function validateUpdateRules(typeName, originalObject, modifiedObject, userPerms) {
    let rules = crossLanguageValidationRules.updateRules[typeName];
    return rules === undefined ? [] : Object.keys(rules)
        .map(property => validateUpdatePropertyRules(typeName, property, originalObject, modifiedObject, userPerms))
        .filter(e => e !== "");
}

export function validateUpdatePropertyRules(typeName, property, originalObject, modifiedObject, userPerms) {
    let rule = getMatchingUpdatePropertyRule(typeName, property, originalObject, userPerms);
    let constraint = rule !== undefined ? rule.constraint : undefined;
    if (constraint !== undefined && constraint.type !== undefined
        && !conditionIsMet({property: property, constraint: constraint}, modifiedObject)) {
        return buildErrorMessage(defaultUpdateMessage, constraint.type.toLowerCase(), typeName, rule.errorCodeControl,
            property);
    }
    return "";
}

function getMatchingUpdatePropertyRule(typeName, property, object, userPerms) {
    if (object === undefined) {
        return undefined;
    }
    console.debug("DEBUG - Checking update rules for:", typeName, property);
    let typeRules = crossLanguageValidationRules.updateRules[typeName];
    return getMatchingPropertyRule(typeRules, property, object, userPerms);
}


function buildErrorMessage(defaultMessagePrefix, constraintType, typeJsonKey, errorCodeControl, property) {
    const constraintTypePart = constraintType !== null ? constraintType + "." : "";
    const defaultErrorMessage = defaultMessagePrefix + constraintTypePart + typeJsonKey + "." + property;
    return applyErrorCodeControl(errorCodeControl, defaultErrorMessage);
}

function applyErrorCodeControl(errorCodeControl, defaultErrorMessage) {
    if (errorCodeControl === undefined) {
        return defaultErrorMessage;
    }
    const code = errorCodeControl.code;
    if (errorCodeControl.useType === "AS_SUFFIX") {
        return defaultErrorMessage + code;
    }
    return code;
}


function validateAndGetTerminalAggregateFunctionIfExist(property) {
    const propertySplit = property.split("#");
    if (propertySplit.length > 2) {
        console.error("Property must not contain more then one aggregate function markers (#): %s", property);
        return null;
    }
    if (propertySplit.length === 2) {
        if (property.indexOf("[") === -1) {
            console.error("Aggregate functions are only allowed for indexed properties: %s", property);
            return null;
        }
        const functionName = propertySplit[1];
        if (functionName !== "sum" && functionName !== "distinct") {
            console.error("Property contains unknown aggregate function: %s" + property);
            return null;
        }
        return functionName;
    }
    return null;
}

function getMatchingPropertyRule(typeRules, property, object, userPerms) {
    let propertyRules = typeRules !== undefined ? typeRules[property] : undefined;
    if (propertyRules === undefined) {
        return undefined;
    }
    if (propertyRules.length === 0) {
        return {};
    }
    // find first constraint with matching permission and valid conditions
    for (const rule of propertyRules) {
        let permissions = rule["permissions"];
        if (permissions!== undefined
            && arePermissionsMatching(permissions, userPerms)
            && allConditionsAreMet(getConditionsTopGroup(rule), object)) {
            return rule;
        }
    }
    // find first default constraint (w/o any permission) and valid conditions
    for (const rule of propertyRules) {
        let permissions = rule["permissions"];
        if (permissions === undefined
            && allConditionsAreMet(getConditionsTopGroup(rule), object)) {
            return rule;
        }
    }
    return undefined;
}

function arePermissionsMatching(conditionPerms, userPerms) {
    if (conditionPerms === undefined || userPerms === undefined) {
        return false;
    }
    let matchingPerms = userPerms.filter(value => conditionPerms["values"].includes(value));
    console.debug(conditionPerms["values"], "intersect", userPerms, "?", matchingPerms)
    switch (conditionPerms.type) {
        case 'ALL':
            return matchingPerms.length === userPerms.length;
        case 'ANY':
            return matchingPerms.length > 0;
        case 'NONE':
            return matchingPerms.length === 0;
        default:
            console.error("Permissions type not supported: ", conditionPerms.type)
        return false;
    }
}

function getConditionsTopGroup(propertyRule) {
    // Default is a 'top group' w/o any 'conditions' which is evaluated to true! (see: groupConditionsAreMet)
    let topGroupToReturn = {"operator":"AND","conditionsGroups":[{"operator":"AND","conditions":[]}]};
    let condition = propertyRule.condition;
    let conditionsGroup = propertyRule.conditionsGroup;
    let conditionsTopGroup = propertyRule.conditionsTopGroup;
    if (condition !== undefined) {
        topGroupToReturn.conditionsGroups[0].conditions[0] = condition;
        if (conditionsGroup !== undefined || conditionsTopGroup !== undefined) {
            console.warn("Property rule should contain 'condition' xor 'conditionsGroup' xor " +
                "'conditionsTopGroup'. Property 'condition' takes precedence", propertyRule)
        }
    } else if (conditionsGroup !== undefined) {
        topGroupToReturn.conditionsGroups[0] = conditionsGroup;
        if (conditionsTopGroup !== undefined) {
            console.warn("Property rule should contain 'conditionsGroup' xor " +
                "'conditionsTopGroup'. Property 'conditionsGroup' takes precedence", propertyRule)
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
        console.error("Should not happen: conditionsGroups === undefined")
        return false;
    }
    let operator = conditionsTopGroup["operator"];
    for (const subGroup of conditionsTopGroup["conditionsGroups"]) {
        let conditionsAreMet = groupConditionsAreMet(subGroup, object);
        console.debug("DEBUG -", subGroup.operator, "groupConditionsAreMet:", conditionsAreMet)
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
    for (let curCondition of conditions) {
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
            console.error("Should never happen: unknown operator:", operator);
        }
    }
    return operator === "AND";
}

/**
 * Validates the condition against the object.
 */
function conditionIsMet(condition, object) {
    const propertyValues = getPropertyValues(condition.property, object)
    const aggregateFunction = validateAndGetTerminalAggregateFunctionIfExist(condition.property);
    if (aggregateFunction != null) {
        const aggregatedValue = propertyValues[0];
        return constraintIsValid(condition.constraint, aggregatedValue, object);
    } else {
        for (const propValue of propertyValues) {
            if (propValue === undefined) {
                console.warn("Condition ", condition, "propValue is undefined; return false");
                return false;
            }
            if (!constraintIsValid(condition.constraint, propValue, object)) {
                return false;
            }
        }
    }
    return true;
}

function getPropertyValues(property, object) {
    const aggregateFunction = validateAndGetTerminalAggregateFunctionIfExist(property);
    const pureProperty = property.split("#")[0];
    const propertiesToCheck = inflatePropertyIfMultiIndexed(pureProperty, object);
    const propertyValues = propertiesToCheck.map(prop => getPropertyValue(prop, object));
    if (aggregateFunction === null) {
        return propertyValues;
    }
    switch (aggregateFunction) {
        case "sum":
            const summation = sumUpPropertyValues(object, propertyValues);
            return [summation];
        case "distinct":
            const valuesAreDistinct = distinctCheckForPropertyValues(object, propertyValues);
            return [valuesAreDistinct];
        default:
            console.error("Should not happen. Unsupported: %s", aggregateFunction);
            return [];
    }
}

function sumUpPropertyValues(object, propertyValues) {
    const sum = propertyValues.reduce((partialSum, a) => partialSum + a, 0);
    console.debug("DEBUG - sumUpPropertyValues: %s", sum)
    return sum;
}

//TODO Support for JSON objects? e.g. JSON.stringify(obj1) === JSON.stringify(obj2)
function distinctCheckForPropertyValues(object, propertyValues) {
    const distinctValues = [...new Set(propertyValues)];
    const distinct = propertyValues.length === distinctValues.length;
    console.debug("DEBUG - distinctCheckForPropertyValues: %s", distinct)
    return distinct;
}

function constraintIsValid(constraint, propValue, object) {
    let isMet = false;
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
            console.error("Constraint type not supported (yet): ", constraint.type)
    }
    //console.debug("DEBUG - constraint:", constraint, "->", isMet)
    return isMet;
}

/**
 * Tries to find hierarchical properties value in item.
 * For example propertyName = 'location.type' will return the value of item.location.type.
 * Single-indexed properties are supported as well, e.g. 'articles[0].accessories[1].name
 */
function getPropertyValue(propertyName, object) {
    let propertyParts = propertyName.split(".");
    let propertyValue = object;
    for (let propertyPart of propertyParts) {
        // split up propertyPart into name and optional index, e.g. 'article[0]' into 'article and 0
        let propertyPartName = propertyPart.split("[")[0];
        propertyValue = propertyValue[propertyPartName];
        console.debug("DEBUG - propertyPartName: %s, propertyValue: %s", propertyPartName, propertyValue)
        if (propertyValue === null) {
            return null;
        }
        if (propertyPart.endsWith("]")) {
            let index = /\[(\d+)]/.exec(propertyPart)[1];
            if (Array.isArray(propertyValue)) {
                if (propertyValue.length > index) {
                    console.debug("DEBUG - propertyValue[%d]: %s", index, propertyValue[index]);
                    propertyValue = propertyValue[index];
                } else {
                    console.error("Indexed property is not an array:", propertyValue);
                    return undefined;
                }
            } else {
                console.error("Indexed property is not an array:", propertyValue);
                return undefined;
            }
        }
    }
    return propertyValue;
}

/**
 * Validates EQUALS_ANY, EQUALS_NONE, EQUALS_NULL and EQUALS_NOT_NULL constraint.
 */
export function equalsConstraintIsMet(constraint, propValue) {
    switch (constraint.type) {
        case 'EQUALS_ANY':
        case 'EQUALS_NONE':
            let propAsDate = new Date(propValue);
            if (typeof propValue === 'string' && propAsDate instanceof Date && !isNaN(propAsDate)) {
                let matchLength =  constraint.values.map(v => new Date(v))
                    .filter(valueAsDate => +valueAsDate === +propAsDate).length;
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
            console.error("Unknown equals constraint type: ", constraint.type)
    }
    return false;
}

/**
 * Validates EQUALS_ANY_REF-REF and EQUALS_NONE_REF constraint.
 */
export function equalsRefConstraintIsMet(constraint, propValue, object) {
    switch (constraint.type) {
        case 'EQUALS_ANY_REF':
        case 'EQUALS_NONE_REF':
            if (propValueIsNullOrUndefined(propValue)) {
                return (constraint.type === 'EQUALS_NONE_REF');
            }
            for (const refProp of constraint.values) {
                if (singleRefPropertyMatch(refProp, propValue, object)) {
                    return constraint.type === 'EQUALS_ANY_REF';
                }
            }
            return constraint.type === 'EQUALS_NONE_REF';
        default:
            console.error("Unknown equals ref constraint type: ", constraint.type)
    }
    return false;
}

function singleRefPropertyMatch(refProp, propValue, object) {
    const refValues = getPropertyValues(refProp, object)
    const aggregateFunction = validateAndGetTerminalAggregateFunctionIfExist(refProp);
    let equals = false;
    if (aggregateFunction != null) {
        const aggregatedValue = refValues[0];
        equals = aggregatedValue === propValue;
    } else {
        const propAsDate = new Date(propValue);
        if (typeof propValue === 'string' && propAsDate instanceof Date && !isNaN(propAsDate)) {
            const matchLength =  refValues.map(v => new Date(v))
                .filter(valueAsDate => +valueAsDate === +propAsDate).length;
            equals = matchLength > 0;
        } else {
            equals = refValues.indexOf(propValue) !== -1;
        }
    }
    console.debug("" + propValue + (equals ? " " : " NOT ") + "equals referenced property " + refProp);
    return equals;
}

/**
 * Validates REGEX_ANY constraint.
 */
export function regexConstraintIsMet(constraint, propValue) {
    if (constraint.type !== 'REGEX_ANY') {
        console.error("Unknown regex constraint type: ", constraint.type)
        return false;
    }
    if (propValueIsNullOrUndefined(propValue)) {
        return false;
    }
    for (const regexString of constraint.values) {
        const regex = new RegExp(regexString, "u");
        if (("" + propValue).match(regex)) {
            return true;
        }
    }
    return false;
}

/**
 * Validates SIZE constraint.
 */
export function sizeConstraintIsMet(constraint, propValue) {
    if (constraint.type !== 'SIZE') {
        console.error("Size constraint must have 'type' property with value 'SIZE': ", constraint.type)
        return false;
    }
    if (constraint.min === undefined && constraint.max === undefined) {
        console.error("Size constraint must have at least 'min' or 'max' property: ", constraint)
        return false;
    }
    if (constraint.min !== undefined && typeof constraint.min != 'number'
        || constraint.max !== undefined && typeof constraint.max != 'number') {
        console.error("Size constraint 'min' and 'max' values must have type 'number': ", constraint)
        return false;
    }
    if (propValueIsNullOrUndefined(propValue)) {
        return false;
    }

    // Check min <= length <= max
    if (typeof propValue == "string") {
        return (constraint.min === undefined || propValue.length >= constraint.min)
            && (constraint.max === undefined || propValue.length <= constraint.max)
    }
    if (typeof propValue == "object") {  // e.g. {"one":1, "two":2} or [1,2]
        let size = Object.keys(propValue).length;
        return (constraint.min === undefined || size >= constraint.min)
            && (constraint.max === undefined || size <= constraint.max)
    }
    console.error("Unsupported type of size constraint value:", typeof propValue)
    return false;
}

/**
 * Validates RANGE constraint.
 */
export function rangeConstraintIsMet(constraint, propValue) {
    if (constraint.type !== 'RANGE') {
        console.error("Range constraint must have 'type' property with value 'RANGE': ", constraint.type)
        return false;
    }
    if (constraint.min === undefined && constraint.max === undefined) {
        console.error("Range constraint must have at least 'min' or 'max' property: ", constraint)
        return false;
    }
    if (propValueIsNullOrUndefined(propValue)) {
        return false;
    }

    // Check min <= propValue <= max
    if (typeof propValue === "number" || typeof propValue === "bigint") {
        if (constraint.min !== undefined && typeof constraint.min != 'number' && typeof constraint.min != 'bigint'
            || constraint.max !== undefined && typeof constraint.max != 'number' && typeof constraint.max != 'bigint') {
            console.error("Range constraint 'min' and 'max' values must have type 'number' resp. 'bigint': ",
                constraint)
            return false;
        }
        return (constraint.min === undefined || propValue >= constraint.min)
            && (constraint.max === undefined || propValue <= constraint.max)
    }
    let propAsDate = new Date(propValue);
    if (typeof propValue === 'string' && propAsDate instanceof Date && !isNaN(propAsDate)) {
        let minAsDate = new Date(constraint.min);
        let maxAsDate = new Date(constraint.max);
        if (constraint.min !== undefined
            && (typeof constraint.min !== 'string' || !(minAsDate instanceof Date) || isNaN(minAsDate))
            || constraint.max !== undefined
            && (typeof constraint.max !== 'string' || !(maxAsDate instanceof Date) || isNaN(maxAsDate))) {
            console.error("Range constraint 'min' resp. 'max' is not a valid ISO date string: ", constraint)
            return false;
        }
        return (constraint.min === undefined || propAsDate >= minAsDate)
            && (constraint.max === undefined || propAsDate <= maxAsDate)
    }
    console.error("Unsupported type of range constraint value:", typeof propValue)
    return false;
}

/**
 * Validates DATE_FUTURE and DATE_PAST constraint.
 */
export function dateConstraintIsMet(constraint, propValue) {
    if (constraint.days === undefined) {
        console.error("Date constraint must have 'days' property: ", constraint)
        return false;
    }
    if (propValueIsNullOrUndefined(propValue)) {
        return false;
    }

    let propAsDate = new Date(propValue);
    if (typeof propValue !== 'string' || !(propAsDate instanceof Date) || isNaN(propAsDate)) {
        console.error("The property value is not a valid ISO date string: ", propValue)
        return false;
    }
    propAsDate = stripOffTime(propAsDate);
    switch (constraint.type) {
        case 'DATE_FUTURE':
            propAsDate.setDate(propAsDate.getDate() - constraint.days);
            return propAsDate >= getToday();
        case 'DATE_PAST':
            propAsDate.setDate(propAsDate.getDate() + constraint.days);
            return propAsDate <= getToday();
        default:
            console.error("Date constraint must have 'type' property ['DATE_FUTURE', 'DATE_PAST']: ",
                constraint.type)
    }
    return false;
}

function propValueIsNullOrUndefined(propValue) {
    if (propValue === undefined) {
        console.error("The property value should not be undefined.")
        return true;
    }
    return propValue === null;

}

function getToday() {
    return stripOffTime(new Date());
}

function stripOffTime(date) {
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
}

// Inflate property with multi-index definitions to properties with single-index definitions, e.g.
// "a.b[0,1].c.d[2-3]" -> ["a.b[0].c.d[2]", "a.b[0].c.d[3]", "a.b[1].c.d[2]", "a.b[1].c.d[3]"]
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
            let indexPart = parts[2];
            if (indexPart === "*" || indexPart.indexOf("/") >= 0) {
                let startStep = indexPart === "*" ? [0, 1] : indexPart.split("/");
                inflatedProperties = inflatedProperties.map(ip => ip + propertyPartName)
                    .flatMap(ip => [...startStepIter(ip, object, +startStep[0], startStep[1])]
                        .map(i => ip + "[" + i + "]"))
            } else if (indexPart.indexOf("-") >= 0) {
                let interval = indexPart.split("-");
                let arrayLength = +interval[1] - +interval[0] + 1;
                let indexList = Array(arrayLength).fill(0).map((_, i) => i + +interval[0]);
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

// startStepIter("foo", {"foo":["a","b","c","d","e","f"]}, 1, 2) yields 1,3,5
function* startStepIter(property, object, startIndex, step) {
    let propertyValue = getPropertyValue(property, object);
    if (Array.isArray(propertyValue)) {
        for (let i = startIndex; i < propertyValue.length; i++) {
            if (i >= startIndex && (i - startIndex) % step === 0) {
                yield i;
            }
        }
    } else {
        console.error("Should not happen: propertyValue is not an array: " + property);
    }
}
