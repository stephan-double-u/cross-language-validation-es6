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
                        "constraintsTopGroup": {
                            "operator": "AND",
                            "constraintsSubGroups": [
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
                        "constraintsTopGroup": {
                            "operator": "AND",
                            "constraintsSubGroups": [
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
                        "constraintsTopGroup": {
                            "operator": "AND",
                            "constraintsSubGroups": [
                                {
                                    "operator": "AND",
                                    "constraints": [
                                        {
                                            "property": "someString",
                                            "type": "EQUALS_NOT_NULL"
                                        },
                                        {
                                            "property": "someDate",
                                            "type": "EQUALS_ANY",
                                            "values": [
                                                "2020-02-12T08:15:59.338Z"
                                            ]

                                        },
                                        {
                                            "property": "someDate",
                                            "type": "EQUALS_ANY_REF",
                                            "values": [
                                                "otherDate"
                                            ]

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
        case 'EQUALS_NONE':
            let propAsDate = new Date(propValue);
            if (propAsDate instanceof Date && !isNaN(propAsDate)) {
                let matchLength =  condition.values.map(v => new Date(v)).filter(valueAsDate => +valueAsDate === +propAsDate).length;
                if (condition.type === 'EQUALS_ANY') {
                    return matchLength > 0;
                } else {
                    return matchLength = 0;
                }
            } else {
                if (condition.type === 'EQUALS_ANY') {
                    return condition.values.indexOf(propValue) !== -1;
                } else {
                    return condition.values.indexOf(propValue) === -1;
                }
            }
        case 'EQUALS_NULL':
            return propValue === null;
        case 'EQUALS_NOT_NULL':
            return propValue !== null;
        default:
            console.error("Unknown equals constraint type: ", condition.type)
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
            let propAsDate = new Date(propValue);
            if (propAsDate instanceof Date && !isNaN(propAsDate)) {
                let matchLength =  refValues.map(v => new Date(v)).filter(valueAsDate => +valueAsDate === +propAsDate).length;
                if (condition.type === 'EQUALS_ANY_REF') {
                    return matchLength > 0;
                } else {
                    return matchLength = 0;
                }
            } else {
                if (condition.type === 'EQUALS_ANY_REF') {
                    return refValues.indexOf(propValue) !== -1;
                } else {
                    return refValues.indexOf(propValue) === -1;
                }
            }
        default:
            console.error("Unknown equals ref constraint type: ", condition.type)
    }
    return false;
}

/**
 * Validates regex constraint.
 */
function regexConstraintIsMet(condition, propValue) {
    if (condition.type !== 'REGEX_ANY') {
        console.error("Unknown regex constraint type: ", condition.type)
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
        console.error("Unknown size constraint type: ", condition.type)
        return false;
    }
    if (condition.min === undefined && condition.max === undefined) {
        console.error("Size constraint must have at least 'min' or 'max' property: ", condition)
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
        console.error("Unsupported type of size constraint value:", typeof propValue)
    }
    return false;
}

/**
 * Validates date constraint.
 */
function dateConstraintIsMet(condition, propValue) {
    if (condition.days === undefined) {
        console.error("Date constraint must have either 'days' property: ", condition)
        return false;
    }
    let propAsDate = new Date(propValue);
    if (!(propAsDate instanceof Date) || isNaN(propAsDate)) {
        console.error("The property value is not a valid date: ", propValue)
        return false;
    }
    switch (condition.type) {
        case 'DATE_FUTURE':
            propAsDate.setDate(propAsDate.getDate() - condition.days);
            return propAsDate >= new Date();
        case 'DATE_PAST':
            propAsDate.setDate(propAsDate.getDate() + condition.days);
            return propAsDate <= new Date();
        default:
            console.error("Unknown date constraint: ", condition.type)
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
        case 'DATE_FUTURE':
        case 'DATE_PAST':
            isMet =  dateConstraintIsMet(condition, propValue);
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
function groupConstraintsAreMet(constraintsSubGroup, object) {
    let operator = constraintsSubGroup["operator"];
    let constraints = constraintsSubGroup["constraints"];
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
function allConstraintsAreMet(constraintsTopGroup, object) {
    if (constraintsTopGroup["constraintsSubGroups"] === undefined) {
        console.error("Should not happen: constraintsSubGroups === undefined")
        return false;
    }
    let operator = constraintsTopGroup["operator"];
    for (let i = 0; i < constraintsTopGroup["constraintsSubGroups"].length; i++) {
        let curSubGroup = constraintsTopGroup["constraintsSubGroups"][i];
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

// A 'top group' w/o any 'sub groups' which is evaluated to true! (see: groupConstraintsAreMet)
const NO_CONSTRAINT_TOP_GROUP_VALUE = {"operator": "AND", "constraintsSubGroups": []};

// Returns constraintsTopGroup with matching permissions if exists,
// otherwise the default constraintsTopGroup (w/o any permissions) if exists,
// otherwise NO_CONSTRAINT_REF_TOP_GROUP_VALUE
function getMatchingConstraints(rules, userPerms) {
    let defaultConstraints; // constraints w/o any permissions
    for (let i = 0; i < rules.length; i++ ) {
        let permissions = rules[i]["permissions"];
        let constraintsTopGroup = rules[i]["constraintsTopGroup"];
        if (userPerms === undefined && permissions === undefined)  {
            if (constraintsTopGroup !== undefined) {
                return constraintsTopGroup;
            } else {
                return NO_CONSTRAINT_TOP_GROUP_VALUE;
            }
        } else if(userPerms !== undefined) {
            // look for constraints with matching permission resp. default constraints
            if (permissions !== undefined) {
                let matchingPerms = userPerms.filter(value => permissions["values"].includes(value));
                //console.log(permissions["values"], "intersect", userPerms, "?", matchingPerms)
                if (matchingPerms.length > 0) {
                    if (constraintsTopGroup !== undefined) {
                        return constraintsTopGroup;
                    } else {
                        return NO_CONSTRAINT_TOP_GROUP_VALUE;
                    }
                }
            } else {
                if (constraintsTopGroup !== undefined) {
                    defaultConstraints = constraintsTopGroup;
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

function isMandatory(typeName, property, object, userPerms) {
    //console.log("userPerms:", userPerms, "instanceof Array?", userPerms instanceof Array);
    // TODO more param checks
    if (object === undefined) {
        return false;
    }
    console.log("Checking mandatory rules for:", typeName, property);
    let typeRules = mandatory[typeName];
    return checkTypeCondition(typeRules, property, object, userPerms);
};

function isImmutable(typeName, property, object, userPerms) {
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
var reservation = {
    "id": 1,
    "number1": 1,
    "number2": 2.3,
    "someString": "foobar",
    "someBool": true,
    "nullValue": null,
    "stringArray": ["one", 'two'],
    "someMap": {"one": 1, "two": 2},
    "someDate": "2020-02-12T08:15:59.338+0000",
    "otherDate": "2020-02-12T08:15:59.338Z"
}
//result = isMandatory("reservation", "id", reservation, ["ccc", "eee"]);
//console.log("Property 'id' is mandatory: ", result);
var result = isImmutable("reservation", "someString", reservation);
console.log("Property 'someString' is immutable: ", result);
//result = isImmutable("reservation", "id", reservation, ["ddd", "eee"]);
//console.dir(result);
//result = isMandatory("reservation", "customer", reservation);
//console.dir(result);
//result = isMandatory("notexisting", "foo", reservation, ["aaa", "ccc"]);
//console.dir(result);

function assert(msg, expected, compare) {
    if (expected !== compare) {
        console.dir("Assertion failure: " +  msg + ". Expected " + expected + ", but got " + compare);
    }
};
// sizeConstraintIsMet tests
assert('Type is invalid',
    false, sizeConstraintIsMet({"type": "SIZE_"}, "Test"));
assert('Properties "min" and "max" are missing',
    false, sizeConstraintIsMet({"type": "SIZE"}, "Test"));
assert('Not a string, array or object',
    false, sizeConstraintIsMet({"type": "SIZE", "min": 1}, 123));
assert('String should have min size',
    true, sizeConstraintIsMet({"type": "SIZE", "min": 1}, "T"));
assert('String should have max size',
    true, sizeConstraintIsMet({"type": "SIZE", "max": 10}, "Teststring"));
assert('String should have min and max size',
    true, sizeConstraintIsMet({"type": "SIZE","min": 1, "max": 10}, "Teststring"));
assert('String is to short',
    false, sizeConstraintIsMet({"type": "SIZE", "min": 11}, "Teststring"));
assert('String is too long',
    false, sizeConstraintIsMet({"type": "SIZE", "max": 9}, "Teststring"));
assert('Array should have min size',
    true, sizeConstraintIsMet({"type": "SIZE", "min": 1}, [1]));
assert('Array should have max size',
    true, sizeConstraintIsMet({"type": "SIZE", "max": 3}, [1 ,2, 3]));
assert('Array is to short',
    false, sizeConstraintIsMet({"type": "SIZE", "min": 2}, [1]));
assert('Array is to long',
    false, sizeConstraintIsMet({"type": "SIZE", "max": 2}, [1 ,2, 3]));
assert('Object should have min size',
    true, sizeConstraintIsMet({"type": "SIZE", "min": 1}, {"one": 1, "two": 2}));
assert('Object should have max size',
    true, sizeConstraintIsMet({"type": "SIZE", "max": 2}, {"one": 1, "two": 2}));
assert('Object is to short',
    false, sizeConstraintIsMet({"type": "SIZE", "min": 3}, {"one": 1, "two": 2}));
assert('Object is to long',
    false, sizeConstraintIsMet({"type": "SIZE", "max": 1}, {"one": 1, "two": 2}));

// dateConstraintIsMet tests
assert('expect false if property "days" is missing',
    false, dateConstraintIsMet({"type": "DATE_FUTURE"}, new Date()));
assert('expect true for FUTURE 0 against now',
    true, dateConstraintIsMet({"type": "DATE_FUTURE", "days": 0}, new Date()));
assert('expect true for PAST 0 against now',
    true, dateConstraintIsMet({"type": "DATE_PAST", "days": 0}, new Date()));
assert('expect false for FUTURE 1 against now',
    false, dateConstraintIsMet({"type": "DATE_FUTURE", "days": 1}, new Date()));
assert('expect false for PAST 1 against now',
    false, dateConstraintIsMet({"type": "DATE_PAST", "days": 1}, new Date()));
assert('expect true for FUTURE 1 against year 3000',
    true, dateConstraintIsMet({"type": "DATE_FUTURE", "days": 1}, new Date("3000-01-31")));
assert('expect true for PAST 1against year 1000',
    true, dateConstraintIsMet({"type": "DATE_PAST", "days": 0}, new Date("1000-01-31")));
