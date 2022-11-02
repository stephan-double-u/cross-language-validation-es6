const SCHEMA_VERSION = "0.9";

const emptyValidationRules = {
    schemaVersion: SCHEMA_VERSION,
    mandatoryRules: {},
    immutableRules: {},
    contentRules: {},
    updateRules: {}
}

let crossLanguageValidationRules = emptyValidationRules;

let defaultMandatoryMessagePrefix = "error.validation.mandatory.";
let defaultImmutableMessagePrefix = "error.validation.immutable.";
let defaultContentMessagePrefix = "error.validation.content.";
let defaultUpdateMessagePrefix = "error.validation.update.";

/**
 * Set the validation rules that are used for validation. The rules must be an JSON instance according.
 * to {@link https://github.com/stephan-double-u/cross-language-validation-schema}
 *
 * @param rules the validation rules
 */
export function setValidationRules(rules) {
    if (rules === undefined || rules === null
        || rules.schemaVersion !== SCHEMA_VERSION
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

export function getDefaultMandatoryMessagePrefix() {
    return defaultMandatoryMessagePrefix;
}

export function setDefaultMandatoryMessagePrefix(prefix) {
    console.info("set DefaultMandatoryMessagePrefix to ", prefix);
    defaultMandatoryMessagePrefix = prefix;
}

export function getDefaultImmutableMessagePrefix() {
    return defaultImmutableMessagePrefix;
}

export function setDefaultImmutableMessagePrefix(prefix) {
    console.info("set DefaultImmutableMessagePrefix to ", prefix);
    defaultImmutableMessagePrefix = prefix;
}

export function getDefaultContentMessagePrefix() {
    return defaultContentMessagePrefix;
}

export function setDefaultContentMessagePrefix(prefix) {
    console.info("set DefaultContentMessagePrefix to ", prefix);
    defaultContentMessagePrefix = prefix;
}

export function getDefaultUpdateMessagePrefix() {
    return defaultUpdateMessagePrefix;
}

export function setDefaultUpdateMessagePrefix(prefix) {
    console.info("set DefaultUpdateMessagePrefix to ", prefix);
    defaultUpdateMessagePrefix = prefix;
}

/**
 * If there are matching _content rules_ with an EQUALS_ANY resp. EQUALS_ANY_REF constraint for the property, the values
 * array resp. an array with all referenced values of that constraint for the first matching content rule are returned.
 * Otherwise, if there are matching _update rules_ with an EQUALS_ANY resp. EQUALS_ANY_REF constraint for the property,
 * the values array of that constraint are returned. Otherwise, _undefined_ is returned.
 *
 * @param typeName the type name to look for
 * @param property the property name to look for
 * @param object the object against which the rule conditions are checked
 * @param userPerms the user permissions against which the rule permissions are checked
 * @returns the values array or _undefined_
 */
export function getAllowedPropertyValues(typeName, property, object, userPerms) {
    const contentRules = getMatchingContentPropertyRules(typeName, property, object, userPerms);
    let allowedValues = getAllowedPropertyValuesForRule(contentRules, object);
    if (allowedValues === undefined) {
        const updateRules = getMatchingUpdatePropertyRules(typeName, property, object, userPerms);
        allowedValues = getAllowedPropertyValuesForRule(updateRules, object);
    }
    console.debug("Allowed values for: ", typeName, property, userPerms, "->", allowedValues);
    return allowedValues;
}

function getAllowedPropertyValuesForRule(rules, object) {
    if (rules === undefined || !Array.isArray(rules)) {
        return undefined;
    }
    const equalsRule = rules
        .find(rule => isConstraintOfAnyType(rule.constraint, "EQUALS_ANY", "EQUALS_ANY_REF"));
    if (equalsRule === undefined) {
        return undefined;
    }
    const constraint = equalsRule.constraint;
    const allValues = [];
    if (constraint.type === "EQUALS_ANY") {
        allValues.push(...constraint.values);
    } else {
        allValues.push(...getAllPropertyValues(constraint.values, object));
    }
    if (constraint.nullEqualsTo === true) {
        allValues.push(null);
    }
    return allValues;
}

function isConstraintOfAnyType(constraint, ...constraintTypes) {
    return constraint !== undefined
        && constraint.type !== undefined
        && constraintTypes.includes(constraint.type);
}

function getAllPropertyValues(refProps, object) {
    const allValues = [];
    for (const refProp of refProps) {
        allValues.push(...getPropertyValues(refProp, object));
    }
    return allValues;
}

/**
 * For all properties of the given type any _mandatory_ rule is validated.
 * Provided that all conditions and permissions of a rule are matching the given object and user permissions,
 * it is checked that the property value is not _null_. Otherwise, an error code is added to the array that is returned.
 *
 * @param typeName the name of the type to be validated
 * @param object the object against which the rule conditions are checked
 * @param userPerms the user permissions against which the rule permissions are checked
 * @returns an possibly empty array with error codes
 */
export function validateMandatoryRules(typeName, object, userPerms) {
    let rules = crossLanguageValidationRules.mandatoryRules[typeName];
    return rules === undefined ? [] : Object.keys(rules)
        .flatMap(property => validateMandatoryPropertyRules(typeName, property, object, userPerms))
        .filter(e => e !== []);
}

/**
 * For the given properties of the given type any _mandatory_ rule is validated.
 * Provided that all conditions and permissions of a rule are matching the given object and user permissions,
 * it is checked that the property value is not _null_. Otherwise, an error code is added to the array that is returned.
 *
 * @param typeName the name of the type to be validated
 * @param property the property to be validated
 * @param object the object against which the rule conditions are checked
 * @param userPerms the user permissions against which the rule permissions are checked
 * @returns an possibly empty array with error codes
 */
export function validateMandatoryPropertyRules(typeName, property, object, userPerms) {
    let matchingRules = getMatchingMandatoryPropertyRules(typeName, property, object, userPerms);
    if (matchingRules === undefined) {
        return [];
    }
    return matchingRules
        .filter(rule => !conditionIsMet({property: property, constraint: {type: "EQUALS_NOT_NULL"}}, object))
        .map(rule => buildErrorMessage(defaultMandatoryMessagePrefix, null, typeName, rule.errorCodeControl, property));
}

/**
 * For the given properties of the given type it is checked if at least one matching _mandatory_ rule exist,
 * i.e. if all conditions and permissions of that rule are matching the given object and user permissions, regardless of
 * whether the property value itself is _null_ or not.
 *
 * @param typeName the name of the type to be validated
 * @param property the property to be validated
 * @param object the object against which the rule conditions are checked
 * @param userPerms the user permissions against which the rule permissions are checked
 * @returns _true_ if at least one matching _mandatory_ rule exist, _false_ otherwise
 */
export function isPropertyMandatory(typeName, property, object, userPerms) {
    const matchingRules = getMatchingMandatoryPropertyRules(typeName, property, object, userPerms);
    return matchingRules !== undefined && matchingRules.length > 0;
}

function getMatchingMandatoryPropertyRules(typeName, property, object, userPerms) {
    console.debug("Getting mandatory rules for:", typeName, property, object, userPerms);
    if (object === undefined) {
        return undefined;
    }
    if (validateAndGetTerminalAggregateFunctionIfExist(property)) {
        console.error("Aggregate functions are not allowed for mandatory property rules: %s", property);
        return undefined;
    }
    let typeRules = crossLanguageValidationRules.mandatoryRules[typeName];
    return getMatchingPropertyRules(typeRules, property, object, userPerms);
}


export function validateImmutableRules(typeName, originalObject, modifiedObject, userPerms) {
    let rules = crossLanguageValidationRules.immutableRules[typeName];
    return rules === undefined ? [] : Object.keys(rules)
        .flatMap(property => validateImmutablePropertyRules(typeName, property, originalObject, modifiedObject, userPerms))
        .filter(e => e !== []);
}

export function validateImmutablePropertyRules(typeName, property, originalObject, modifiedObject, userPerms) {
    let matchingRules = getMatchingImmutablePropertyRules(typeName, property, originalObject, userPerms);
    if (matchingRules === undefined) {
        return [];
    }
    return matchingRules
        .filter(rule => !propertyValuesEquals(property, originalObject, modifiedObject))
        .map(rule => buildErrorMessage(defaultImmutableMessagePrefix, null, typeName, rule.errorCodeControl, property));
}

export function isPropertyImmutable(typeName, property, object, userPerms) {
    const matchingRules = getMatchingImmutablePropertyRules(typeName, property, object, userPerms);
    return matchingRules !== undefined && matchingRules.length > 0;
}

function getMatchingImmutablePropertyRules(typeName, property, object, userPerms) {
    console.debug("Getting immutable rules for:", typeName, property, object, userPerms);
    if (object === undefined) {
        return undefined;
    }
    if (validateAndGetTerminalAggregateFunctionIfExist(property)) {
        console.error("Aggregate functions are not allowed for immutable property rules: %s", property);
        return undefined;
    }
    let typeRules = crossLanguageValidationRules.immutableRules[typeName];
    return getMatchingPropertyRules(typeRules, property, object, userPerms);
}

function propertyValuesEquals(property, originalObject, modifiedObject) {
    let propertiesToCheck = inflatePropertyIfMultiIndexed(property, originalObject);
    if (propertiesToCheck.length !== inflatePropertyIfMultiIndexed(property, modifiedObject).length) {
        return false;
    }
    for (let propertyToCheck of propertiesToCheck) {
        let originalValue = getPropertyValue(propertyToCheck, originalObject);
        let modifiedValue = getPropertyValue(propertyToCheck, modifiedObject);
        if (originalValue !== modifiedValue) {
            return false;
        }
    }
    return true;
}

export function validateContentRules(typeName, object, userPerms) {
    let rules = crossLanguageValidationRules.contentRules[typeName];
    return rules === undefined ? [] : Object.keys(rules)
        .flatMap(property => validateContentPropertyRules(typeName, property, object, userPerms))
        .filter(e => e !== []);
}

export function validateContentPropertyRules(typeName, property, object, userPerms) {
    let matchingRules = getMatchingContentPropertyRules(typeName, property, object, userPerms);
    if (matchingRules === undefined) {
        return [];
    }
    return matchingRules
        .filter(rule => rule.constraint !== undefined && rule.constraint.type !== undefined)
        .filter(rule => !conditionIsMet({property: property, constraint: rule.constraint}, object))
        .map(rule => buildErrorMessage(defaultContentMessagePrefix, rule.constraint.type.toLowerCase(), typeName,
            rule.errorCodeControl, property));
}

function getMatchingContentPropertyRules(typeName, property, object, userPerms) {
    console.debug("Getting content rules for:", typeName, property, object, userPerms);
    if (object === undefined) {
        return undefined;
    }
    let typeRules = crossLanguageValidationRules.contentRules[typeName];
    return getMatchingPropertyRules(typeRules, property, object, userPerms);
}


export function validateUpdateRules(typeName, originalObject, modifiedObject, userPerms) {
    let rules = crossLanguageValidationRules.updateRules[typeName];
    return rules === undefined ? [] : Object.keys(rules)
        .flatMap(property => validateUpdatePropertyRules(typeName, property, originalObject, modifiedObject, userPerms))
        .filter(e => e !== []);
}

export function validateUpdatePropertyRules(typeName, property, originalObject, modifiedObject, userPerms) {
    let matchingRules = getMatchingUpdatePropertyRules(typeName, property, originalObject, userPerms);
    if (matchingRules === undefined) {
        return [];
    }
    return matchingRules
        .filter(rule => rule.constraint !== undefined && rule.constraint.type !== undefined)
        .filter(rule => !conditionIsMet({property: property, constraint: rule.constraint}, modifiedObject))
        .map(rule => buildErrorMessage(defaultUpdateMessagePrefix, rule.constraint.type.toLowerCase(), typeName,
            rule.errorCodeControl, property));
}

function getMatchingUpdatePropertyRules(typeName, property, object, userPerms) {
    console.debug("Getting update rules for:", typeName, property, object, userPerms);
    if (object === undefined) {
        return undefined;
    }
    let typeRules = crossLanguageValidationRules.updateRules[typeName];
    return getMatchingPropertyRules(typeRules, property, object, userPerms);
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

/**
 * Gets all matching rules for the given property. A rule matches if
 * <ol>
 * <li>the rule has no permissions condition and no property related conditions assigned</li>
 * <li>the rule has only a permissions condition and these permissions match the user permissions</li>
 * <li>the rule has only property related conditions and all of these conditions match</li>
 * <li>the rule has both permissions condition and property related conditions and all of these conditions match</li>
 * </ol>
 *
 * @returns _undefined_ if _typeRules_ resp. _typeRules[property]_ is _undefined_, otherwise an array with matching the
 * rules.
 */
function getMatchingPropertyRules(typeRules, property, object, userPerms) {
    let propertyRules = typeRules !== undefined ? typeRules[property] : undefined;
    if (propertyRules === undefined) {
        return undefined;
    }
    if (propertyRules.length === 0) {
        return [{}];
    }
    return propertyRules
        .filter(rule => rule.permissions === undefined || arePermissionsMatching(rule.permissions, userPerms))
        .filter(rule => allConditionsAreMet(getConditionsTopGroup(rule), object));
}

function arePermissionsMatching(conditionPerms, userPerms) {
    if (conditionPerms === undefined) {
        return false;
    }
    if (userPerms === undefined) {
        userPerms = [];
    }
    let matchingPerms = userPerms.filter(value => conditionPerms.values.includes(value));
    switch (conditionPerms?.type) {
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

/*
 * A rule may contain (a) a conditionsTopGroup object, (b) a _conditionsGroup_ object, (c) a single _condition_ object
 * or (d) no condition object at all. For cases (b), (c) and (d) a conditionsTopGroup object is created as a wrapper for
 * easier validation. See: {@link allConditionsAreMet}
 */
function getConditionsTopGroup(propertyRule) {
    // Default is a 'top group' w/o any 'conditions' which is evaluated to true!
    let topGroupToReturn = {operator:"AND", conditionsGroups:[{operator:"AND",conditions:[]}]};
    let condition = propertyRule.condition;
    let conditionsGroup = propertyRule.conditionsGroup;
    let conditionsTopGroup = propertyRule.conditionsTopGroup;
    if (condition !== undefined) {
        topGroupToReturn.conditionsGroups[0].conditions[0] = condition;
        if (conditionsGroup !== undefined || conditionsTopGroup !== undefined) {
            console.warn("Property rule should contain 'condition' xor 'conditionsGroup' xor " +
                "'conditionsTopGroup'. Property 'condition' takes precedence", propertyRule);
        }
    } else if (conditionsGroup !== undefined) {
        topGroupToReturn.conditionsGroups[0] = conditionsGroup;
        if (conditionsTopGroup !== undefined) {
            console.warn("Property rule should contain 'conditionsGroup' xor " +
                "'conditionsTopGroup'. Property 'conditionsGroup' takes precedence", propertyRule);
        }
    } else if (conditionsTopGroup !== undefined) {
        topGroupToReturn = conditionsTopGroup;
    }
    return topGroupToReturn;
}

/*
 * Validates if all conditions groups are met according to the _group operator_ (i.e. AND resp. OR).
 * If groups are ANDed each group must evaluate to _true_, if they are ORed only one group must evaluate to _true_.
 */
function allConditionsAreMet(conditionsTopGroup, object) {
    if (conditionsTopGroup.conditionsGroups === undefined) {
        console.error("Should not happen: conditionsGroups is undefined")
        return false;
    }
    let operator = conditionsTopGroup.operator;
    for (const subGroup of conditionsTopGroup.conditionsGroups) {
        let conditionsAreMet = groupConditionsAreMet(subGroup, object);
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

/*
 * Validates if group conditions are met according to the'group operator' (i.e. AND resp. OR).
 * If conditions are ANDed each condition must evaluate to _true_, if they are ORed only one condition must evaluate
 * to _true_.
 */
function groupConditionsAreMet(conditionsSubGroup, object) {
    let operator = conditionsSubGroup.operator;
    let conditions = conditionsSubGroup.conditions;
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
    for (const propValue of propertyValues) {
        if (propValue === undefined) {
            console.warn("Condition ", condition, "propValue is undefined; return false");
            return false;
        }
        if (!constraintIsValid(condition.constraint, propValue, object)) {
            return false;
        }
    }
    return true;
}

/*
 Returns an array with one or more property values.
 For a simple property and for a property with a terminal aggregate function one value is returned.
 For a property with an index definition the number of values returned depends on that index definition.
 Epamples:
 "foo", { foo: "bar"] } -> ["bar"]
 "foo[0, 2]", { foo: ["a", "b", "c"] } -> ["a", "c"]
 "foo[*]#sum", { foo: [1, 3, 5] } -> [9]
 "foo[*]#distinct", { foo: [1, 3, 5] } -> [true]
 */
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
            const summation = summedUpPropertyValues(propertyValues);
            return [summation];
        case "distinct":
            const valuesAreDistinct = distinctCheckForPropertyValues(propertyValues);
            return [valuesAreDistinct];
        default:
            console.error("Should not happen. Unsupported: %s", aggregateFunction);
            return [];
    }
}

function summedUpPropertyValues(propertyValues) {
    const sum = propertyValues.reduce((partialSum, a) => partialSum + a, 0);
    console.debug("summedUpPropertyValues: ", propertyValues, sum);
    return sum;
}

function distinctCheckForPropertyValues(propertyValues) {
    const distinctValues = [...new Set(propertyValues)];
    const distinct = propertyValues.length === distinctValues.length;
    console.debug("distinctCheckForPropertyValues: ", propertyValues, distinct);
    return distinct;
}

// export for easier testing
export function constraintIsValid(constraint, propValue, object) {
    if (propValue === null && isConstraintOfAnyType(constraint, 'EQUALS_ANY', 'EQUALS_ANY_REF',
        'EQUALS_NONE', 'EQUALS_NONE_REF', 'WEEKDAY_ANY', 'QUARTER_ANY', 'QUARTER_ANY_REF',
        'YEAR_ANY', 'YEAR_ANY_REF')) {
        return validateNullValueAgainstNullEqualsToValue(constraint)
    } else {
        return validateContraint(constraint, propValue, object);
    }
}

function validateNullValueAgainstNullEqualsToValue(constraint) {
    const nullEqualsTo = constraint.nullEqualsTo;
    switch (constraint.type) {
        case 'EQUALS_NONE':
        case 'EQUALS_NONE_REF':
            return nullEqualsTo === undefined || nullEqualsTo === true;
        default:
            return nullEqualsTo !== undefined && nullEqualsTo === true;
    }
}

function validateContraint(constraint, propValue, object) {
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
        case 'REGEX_NONE':
            isMet =  regexConstraintIsMet(constraint, propValue);
            break;
        case 'SIZE':
            isMet =  sizeConstraintIsMet(constraint, propValue);
            break;
        case 'RANGE':
            isMet =  rangeConstraintIsMet(constraint, propValue);
            break;
        case 'FUTURE_DAYS':
        case 'PAST_DAYS':
        case 'PERIOD_DAYS':
            isMet =  dateConstraintIsMet(constraint, propValue);
            break;
        case 'WEEKDAY_ANY':
            isMet =  weekdayConstraintIsMet(constraint, propValue);
            break;
        case 'QUARTER_ANY':
        case 'QUARTER_ANY_REF':
            isMet =  quarterConstraintIsMet(constraint, propValue, object);
            break;
        case 'YEAR_ANY':
        case 'YEAR_ANY_REF':
            isMet =  yearConstraintIsMet(constraint, propValue, object);
            break;
        default:
            console.error("Constraint type not supported (yet): ", constraint.type)
    }
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
        if (propertyValue === null) {
            return null;
        }
        if (propertyPart.endsWith("]")) {
            let index = /\[(\d+)]/.exec(propertyPart)[1];
            if (Array.isArray(propertyValue)) {
                if (propertyValue.length > index) {
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
            const propAsDate = getStringAsValidDateOrUndefined(propValue);
            if (propAsDate !== undefined) {
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
 * Validates EQUALS_ANY_REF and EQUALS_NONE_REF constraint.
 */
export function equalsRefConstraintIsMet(constraint, propValue, object) {
    switch (constraint.type) {
        case 'EQUALS_ANY_REF':
        case 'EQUALS_NONE_REF':
            if (equalsRefPropertyMatch(constraint.values, propValue, object)) {
                return constraint.type === 'EQUALS_ANY_REF';
            }
            return constraint.type === 'EQUALS_NONE_REF';
        default:
            console.error("Unknown equals ref constraint type: ", constraint.type)
    }
    return false;
}

function equalsRefPropertyMatch(refProps, propValue, object) {
    const refValues = getAllPropertyValues(refProps, object)
    let equals = false;
    const propAsDate = getStringAsValidDateOrUndefined(propValue);
    if (propAsDate !== undefined) {
        const matchLength =  refValues.map(v => new Date(v))
            .filter(valueAsDate => +valueAsDate === +propAsDate).length;
        equals = matchLength > 0;
    } else {
        equals = refValues.indexOf(propValue) !== -1;
    }
    console.debug("" + propValue + (equals ? " " : " NOT ") + "equals referenced properties " + refProps);
    return equals;
}

/**
 * Validates REGEX_ANY and REGEX_NONE constraint.
 */
export function regexConstraintIsMet(constraint, propValue) {
    switch (constraint.type) {
        case 'REGEX_ANY':
        case 'REGEX_NONE':
            if (propValueIsNullOrUndefined(propValue)) {
                return false;
            }
            for (const regexString of constraint.values) {
                const regex = new RegExp(regexString, "u");
                if (("" + propValue).match(regex)) {
                    return constraint.type === 'REGEX_ANY';
                }
            }
            return constraint.type === 'REGEX_NONE';
        default:
            console.error("Unknown regex constraint type: ", constraint.type)
    }
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
    if (!rangeParamsAreValid(constraint, propValue)) {
        return false;
    }
    if (typeof propValue === "number" || typeof propValue === "bigint") {
        return rangeOfNumbersMeetsValue(constraint, propValue);
    }
    const propAsDate = getStringAsValidDateOrUndefined(propValue);
    if (propAsDate !== undefined) {
        return rangeOfDatesMeetsValue(constraint, propAsDate);
    }
    console.error("Unsupported type of range constraint value:", typeof propValue)
    return false;
}

function rangeParamsAreValid(constraint, propValue) {
    if (constraint.type !== 'RANGE') {
        console.error("Range constraint must have 'type' property with value 'RANGE': ", constraint.type)
        return false;
    }
    if (constraint.min === undefined && constraint.max === undefined) {
        console.error("Range constraint must have at least 'min' or 'max' property: ", constraint)
        return false;
    }
    return !propValueIsNullOrUndefined(propValue);
}

function rangeOfNumbersMeetsValue(constraint, propValue) {
    if (constraint.min !== undefined && typeof constraint.min != 'number' && typeof constraint.min != 'bigint'
        || constraint.max !== undefined && typeof constraint.max != 'number' && typeof constraint.max != 'bigint') {
        console.error("Range constraint 'min' and 'max' values must have type 'number' resp. 'bigint': ", constraint);
        return false;
    }
    // Check min <= propValue <= max
    return (constraint.min === undefined || propValue >= constraint.min)
        && (constraint.max === undefined || propValue <= constraint.max)
}

function rangeOfDatesMeetsValue(constraint, propAsDate) {
    const minAsDate = new Date(constraint.min);
    const maxAsDate = new Date(constraint.max);
    if (!rangeMinMaxAreValidDates(constraint, minAsDate, maxAsDate)) {
        return false;
    }
    // Check min <= propValue <= max
    return (constraint.min === undefined || propAsDate >= minAsDate)
        && (constraint.max === undefined || propAsDate <= maxAsDate);
}

function rangeMinMaxAreValidDates(constraint, minAsDate, maxAsDate) {
    if (constraint.min !== undefined
        && (typeof constraint.min !== 'string' || !(minAsDate instanceof Date) || isNaN(minAsDate))
        || constraint.max !== undefined
        && (typeof constraint.max !== 'string' || !(maxAsDate instanceof Date) || isNaN(maxAsDate))) {
        console.error("Range constraint 'min' resp. 'max' is not a valid ISO date string: ", constraint)
        return false;
    }
    return true;
}

/**
 * Validates FUTURE_DAYS, PAST_DAYS and PERIOD_DAYS constraint.
 */
export function dateConstraintIsMet(constraint, propValue) {
    if (constraint.min === undefined && constraint.max === undefined) {
        console.error("Date constraint must have at least 'min' or 'max' property: ", constraint);
        return false;
    }
    if (propValueIsNullOrUndefined(propValue)) {
        return false;
    }

    let propAsDate = getStringAsValidDateOrUndefined(propValue, true);
    if (propAsDate === undefined) {
        return false;
    }
    propAsDate = stripOffTime(propAsDate);

    let minDays = constraint.min;
    let maxDays = constraint.max;
    if ("PAST_DAYS" === constraint.type) {
        const minDaysCopy = minDays;
        minDays = maxDays !== undefined ? -1 * maxDays : undefined;
        maxDays = minDaysCopy !== undefined ? -1 * minDaysCopy : undefined;
    }

    let minDaysDate;
    if (minDays !== undefined) {
        minDaysDate = getToday();
        minDaysDate.setDate(minDaysDate.getDate() + minDays);
    }
    let maxDaysDate;
    if (maxDays !== undefined) {
        maxDaysDate = getToday();
        maxDaysDate.setDate(maxDaysDate.getDate() + maxDays);
    }

    const match = (minDaysDate === undefined || propAsDate >= minDaysDate)
        && (maxDaysDate === undefined || propAsDate <= maxDaysDate);

    console.debug("dateConstraintIsMet: ", constraint, minDaysDate?.toISOString(), "<=", propAsDate.toISOString(), "<=", maxDaysDate?.toISOString(), ":", match);
    return match;
}

/**
 * Validates WEEKDAY_ANY constraint.
 */
function weekdayConstraintIsMet(constraint, propValue) {
    const values = constraint.values;
    if (!isNonEmptyArray(values)) {
        console.error("Constraint is missing 'values' array property with at least one element: ", constraint);
        return false;
    }

    const propAsDate = getStringAsValidDateOrUndefined(propValue, true);
    if (propAsDate === undefined) {
        return false;
    }
    const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const propAsDateWeekday = weekdays[propAsDate.getDay()]; // 0=Sunday

    const match = values.filter(day => day === propAsDateWeekday).length !== 0;
    console.debug("weekdayConstraintIsMet: ", constraint, propAsDate.toISOString(), propAsDateWeekday, " included? ", match);
    return match;
}

/**
 * Validates QUARTER_ANY and QUARTER_ANY_REF constraint.
 */
function quarterConstraintIsMet(constraint, propValue, object) {
    let values = constraint.values;
    if (!isNonEmptyArray(values)) {
        console.error("Constraint is missing 'values' array property with at least one element: ", constraint);
        return false;
    }

    const propAsDate = getStringAsValidDateOrUndefined(propValue, true);
    if (propAsDate === undefined) {
        return false;
    }
    const dateQuarter = Math.floor(propAsDate.getMonth() / 3 + 1);

    switch (constraint.type) {
        case 'QUARTER_ANY':
            break;
        case 'QUARTER_ANY_REF':
            values = getAllPropertyValues(values, object);
            break;
        default:
            console.error("Constraint type not supported (yet): ", constraint.type);
            return false;
    }
    return values.filter(quarter => quarter === dateQuarter).length !== 0;
}

/**
 * Validates YEAR_ANY and YEAR_ANY_REF constraint.
 */
function yearConstraintIsMet(constraint, propValue, object) {
    let values = constraint.values;
    if (!isNonEmptyArray(values)) {
        console.error("Constraint is missing 'values' array property with at least one element: ", constraint);
        return false;
    }

    const propAsDate = getStringAsValidDateOrUndefined(propValue, true);
    if (propAsDate === undefined) {
        return false;
    }
    const dateYear = propAsDate.getFullYear();

    switch (constraint.type) {
        case 'YEAR_ANY':
            break;
        case 'YEAR_ANY_REF':
            values = getAllPropertyValues(values, object);
            break;
        default:
            console.error("Constraint type not supported (yet): ", constraint.type);
            return false;
    }
    return values.filter(year => year === dateYear).length !== 0;
}

function isNonEmptyArray(object) {
    return object !== undefined && Array.isArray(object) && object.length > 0;
}

function getStringAsValidDateOrUndefined(value, logErrorIfInvalid) {
    const valueAsDate = new Date(value);
    if (typeof value === 'string' && (valueAsDate instanceof Date) && !isNaN(valueAsDate)) {
        return valueAsDate;
    }
    if (logErrorIfInvalid === true) {
        console.error("The value is not a valid date string: ", value)
    }
    return undefined;
}

function propValueIsNullOrUndefined(propValue) {
    if (propValue === undefined) {
        console.error("The property value should not be 'undefined'.")
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

const INDEX_PARTS_REGEX = /^(.+)\[(\d+(,\d+)*|\d+\/\d+|\d+-\d+|\*)]$/;
/*
 Inflates property with multi-index definition to properties with single-index definitions, e.g.
 "a.b[0,1].c.d[2-3]" -> ["a.b[0].c.d[2]", "a.b[0].c.d[3]", "a.b[1].c.d[2]", "a.b[1].c.d[3]"]
 */
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
    if (propValueIsNullOrUndefined(propertyValue)) {
        return;
    }
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
