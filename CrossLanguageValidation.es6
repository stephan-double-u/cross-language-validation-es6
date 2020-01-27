// IntelliJ Plugin Quokka -> rapid prototyping playground
const validationRules =
    {
        "mandatoryRules": {
            "reservation": {
                "customer": [
                    {}
                ],
                "id": [
                    {
                        "permissions": {
                            "type": "ANY",
                            "values": [
                                "aaa",
                                "bbb"
                            ]
                        }
                    },
                    {
                        "permissions": {
                            "type": "ANY",
                            "values": [
                                "ccc"
                            ]
                        },
                        "relationsTopGroup": {
                            "operator": "AND",
                            "relationsSubGroups": [
                                {
                                    "operator": "AND",
                                    "constraints": [
                                        {
                                            "property": "stringArray[1]",
                                            "type": "SIZE",
                                            "min": 1,
                                            "max": 10
                                        }
                                    ]
                                }
                            ]
                        }
                    },
                    {
                        "relationsTopGroup": {
                            "operator": "AND",
                            "relationsSubGroups": [
                                {
                                    "operator": "OR",
                                    "constraints": [
                                        {
                                            "property": "id",
                                            "type": "EQUALS_NONE",
                                            "values": [
                                                1,
                                                2
                                            ]
                                        },
                                        {
                                            "property": "id",
                                            "type": "EQUALS_NONE",
                                            "values": [
                                                99
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "operator": "AND",
                                    "constraints": [
                                        {
                                            "property": "id",
                                            "type": "EQUALS_ANY",
                                            "values": [
                                                1
                                            ]
                                        },
                                        {
                                            "property": "nullValue",
                                            "type": "EQUALS_NULL"
                                        },
                                        {
                                            "property": "id",
                                            "type": "EQUALS_NOT_NULL"
                                        },
                                        {
                                            "property": "someString",
                                            "type": "REGEX_ANY",
                                            "values": ["nomatch", "fo{2}"]
                                        },
                                        {
                                            "property": "someString",
                                            "type": "SIZE",
                                            "min": 1,
                                            "max": 10
                                        },
                                        {
                                            "property": "stringArray",
                                            "type": "SIZE",
                                            "min": 2
                                        },
                                        {
                                            "property": "someMap",
                                            "type": "SIZE",
                                            "max": 2
                                        },
                                        {
                                            "property": "id",
                                            "type": "EQUALS_ANY_REF",
                                            "values": [
                                                "number1"
                                            ]
                                        },
                                        {
                                            "property": "id",
                                            "type": "EQUALS_NONE_REF",
                                            "values": [
                                                "number2"
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                ]
            }
        },
        "immutableRules": {
            "reservation": {
                "someString": [
                    {
                        "relationsTopGroup": {
                            "operator": "AND",
                            "relationsSubGroups": [
                                {
                                    "operator": "AND",
                                    "constraints": [
                                        {
                                            "property": "someString",
                                            "type": "EQUALS_NOT_NULL"
                                        }
                                    ]
                                }
                            ]
                        }

                    }
                ],
            }
        },
        "contentRules": {
            "reservation": {}
        }
    }
;
let mandatory = validationRules.mandatoryRules;
let immutable = validationRules.immutableRules;
let content = validationRules.contentRules;

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
            let index = /\[(\d+)\]/.exec(propertyPart)[1];
            //console.log("index:", index);
            if (Array.isArray(propertyValue)) {
                if (propertyValue.length > index) {
                    console.log("propertyValue[index]", propertyValue[index]);
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
    //console.log("getPropertyValue:", propertyName, "->", propertyValue);
    return propertyValue;
}

/**
 * Validates equals constraint.
 */
function equalsConstraintIsMet(condition, propValue) {
    switch (condition.type) {
        case 'EQUALS_ANY':
            return condition.values.indexOf(propValue) !== -1;
        case 'EQUALS_NONE':
            return condition.values.indexOf(propValue) === -1;
        case 'EQUALS_NULL':
            return propValue === null;
        case 'EQUALS_NOT_NULL':
            return propValue !== null;
        default:
            console.error("Equals constraint type not supported: ", condition.type)
    }
    return false;
}

/**
 * Validates equals ref constraint.
 */
function equalsRefConstraintIsMet(condition, propValue, object) {
    switch (condition.type) {
        case 'EQUALS_ANY_REF':
        case 'EQUALS_NONE_REF':
            //console.log(condition.values.map(v => findPropertyValue(v, object)));
            let refValues = condition.values.map(v => getPropertyValue(v, object));
            if (condition.type === 'EQUALS_ANY_REF') {
                return refValues.indexOf(propValue) !== -1;
            } else {
                return refValues.indexOf(propValue) === -1;
            }
        default:
            console.error("Equals ref constraint type not supported: ", condition.type)
    }
    return false;
}

/**
 * Validates regex constraint.
 */
function regexConstraintIsMet(condition, propValue) {
    if (condition.type !== 'REGEX_ANY') {
        console.error("Regex constraint type not supported: ", condition.type)
        return true;
    }
    for (var regex of condition.values) {
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
function sizeConstraintIsMet(condition, propValue) {
    if (condition.type !== 'SIZE') {
        console.error("Size constraint type not supported: ", condition.type)
        return false;
    }
    if (condition.min === undefined && condition.max === undefined) {
        console.error("Size constraint must have either min or max property: ", condition)
        return false;
    }
    // Check min <= length <= max
    if (typeof propValue == "string") {
        return (condition.min === undefined || propValue.length >= condition.min)
            && (condition.max === undefined || propValue.length <= condition.max)
    } else if (typeof propValue == "object") {  // e.g. {"one":1, "two":2} resp. [1,2]
        let size = Object.keys(propValue).length;
        return (condition.min === undefined || size >= condition.min)
            && (condition.max === undefined || size <= condition.max)
    } else {
        console.log("ERROR: Unknown type of size constraint value: ", typeof propValue)
    }
    return false;
}

/**
 * Validates the constraint against the object.
 */
function constraintIsMet(condition, object) {
    let propValue = getPropertyValue(condition.property, object)
    if (propValue === undefined) {
        console.log("Condition ", condition, "propValue is undefined; return false")
        return false;
    }
    //console.log("typeof", propValue, typeof propValue)
    let isMet;
    switch (condition.type) {
        case 'EQUALS_ANY':
        case 'EQUALS_NONE':
        case 'EQUALS_NULL':
        case 'EQUALS_NOT_NULL':
            isMet = equalsConstraintIsMet(condition, propValue);
            break;
        case 'EQUALS_ANY_REF':
        case 'EQUALS_NONE_REF':
            isMet = equalsRefConstraintIsMet(condition, propValue, object);
            break;
        case 'REGEX_ANY':
            isMet =  regexConstraintIsMet(condition, propValue);
            break;
        case 'SIZE':
            isMet =  sizeConstraintIsMet(condition, propValue);
            break;
        default:
            console.error("Constraint type not supported (yet): ", condition.type)
    }
    console.log("Condition:", condition, "->", isMet)
    return isMet;
}

/**
 * Validates if group constraints are met according to 'group operator' (i.e. AND resp. OR).
 * If constraints are ANDed each constraint must be met, if they are ORed only one constraint must be met.
 */
function groupConstraintsAreMet(relationsSubGroup, object) {
    let operator = relationsSubGroup["operator"];
    let constraints = relationsSubGroup["constraints"];
    for (let i = 0; i < constraints.length; i++) {
        let curConstraint = constraints[i];
        let isMet = constraintIsMet(curConstraint, object);
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
    return (operator == "AND") ? true : false;
}

/**
 * Validates if all constraints groups are met according to 'group operator' (i.e. AND resp. OR).
 * If groups are ANDed each group must be met, if they are ORed only one group must be met.
 */
function allConstraintsAreMet(relationsTopGroup, object) {
    if (relationsTopGroup["relationsSubGroups"] === undefined) {
        console.error("Should not happen: relationsSubGroups === undefined")
        return false;
    }
    let operator = relationsTopGroup["operator"];
    for (let i = 0; i < relationsTopGroup["relationsSubGroups"].length; i++) {
        let curSubGroup = relationsTopGroup["relationsSubGroups"][i];
        let constraintsAreMet = groupConstraintsAreMet(curSubGroup, object);
        console.log("groupConstraintsAreMet:", constraintsAreMet)
        if (constraintsAreMet) {
            if (operator === "OR") {
                return true;
            }
        } else {
            if (operator === "AND") {
                return false;
            }
        }
    }
    return (operator == "AND") ? true : false;
}

// A 'top group' w/o any 'sub groups'; should evaluate to true!
const NO_CONSTRAINT_TOP_GROUP_VALUE = {"operator": "AND", "relationsSubGroups": []};

// Returns relationsTopGroup with matching permissions if exists,
// otherwise the default relationsTopGroup (w/o any permissions) if exists,
// otherwise NO_CONSTRAINT_REF_TOP_GROUP_VALUE
function getMatchingConstraints(rules, userPerms) {
    let defaultConstraints; // constraints w/o any permissions
    for (let i = 0; i < rules.length; i++ ) {
        let permissions = rules[i]["permissions"];
        let relationsTopGroup = rules[i]["relationsTopGroup"];
        if (userPerms === undefined && permissions === undefined)  {
            if (relationsTopGroup !== undefined) {
                return relationsTopGroup;
            } else {
                return NO_CONSTRAINT_TOP_GROUP_VALUE;
            }
        } else if(userPerms !== undefined) {
            // look for constraints with matching permission resp. default constraints
            if (permissions !== undefined) {
                let matchingPerms = userPerms.filter(value => permissions["values"].includes(value));
                //console.log(permissions["values"], "intersect", userPerms, "?", matchingPerms)
                if (matchingPerms.length > 0) {
                    if (relationsTopGroup !== undefined) {
                        return relationsTopGroup;
                    } else {
                        return NO_CONSTRAINT_TOP_GROUP_VALUE;
                    }
                }
            } else {
                if (relationsTopGroup !== undefined) {
                    defaultConstraints = relationsTopGroup;
                } else {
                    defaultConstraints = NO_CONSTRAINT_TOP_GROUP_VALUE;
                }
            }
        }
    }
    return defaultConstraints;
};

function checkTypeCondition(typeRules, property, object, userPerms) {
    if (typeRules !== undefined) {
        let propertyRules = typeRules[property];
        if (propertyRules !== undefined) {
            let matchingConstraints = getMatchingConstraints(propertyRules, userPerms);
            if (matchingConstraints !== undefined) {
                return allConstraintsAreMet(matchingConstraints, object);
            }
            return false;
        }
    }
    return false; // no rules defined for type
};

isMandatory = function (typeName, property, object, userPerms) {
    //console.log("userPerms:", userPerms, "instanceof Array?", userPerms instanceof Array);
    // TODO more param checks
    if (object === undefined) {
        return false;
    }
    console.log("Checking mandatory rules for:", typeName, property);
    let typeRules = mandatory[typeName];
    return checkTypeCondition(typeRules, property, object, userPerms);
};

isImmutable = function (typeName, property, object, userPerms) {
    //console.log("userPerms:", userPerms, "instanceof Array?", userPerms instanceof Array);
    // TODO more param checks
    if (object === undefined) {
        return false;
    }
    console.log("Checking immutable rules for:", typeName, property);
    let typeRules = immutable[typeName];
    return checkTypeCondition(typeRules, property, object, userPerms);
};

// some testing ...
reservation = {
    "id": 1,
    "number1": 1,
    "number2": 2.3,
    "someString": "foobar",
    "someBool": true,
    "nullValue": null,
    "stringArray": ["one", 'two'],
    "someMap": {"one": 1, "two": 2}
}
result = isMandatory("reservation", "id", reservation, ["ccc", "eee"]);
console.log("Property 'id' is mandatory: ", result);
result = isImmutable("reservation", "someString", reservation);
console.log("Property 'someString' is immutable: ", result);
//result = isImmutable("reservation", "id", reservation, ["ddd", "eee"]);
//console.dir(result);
//result = isMandatory("reservation", "customer", reservation);
//console.dir(result);
//result = isMandatory("notexisting", "foo", reservation, ["aaa", "ccc"]);
//console.dir(result);

