export const testValidationRules =
    {
        "schema-version": "0.2",
        "mandatoryRules": {
            "reservation": {
                "stringArray[*]": [
                    {
                        "condition": {
                            "property": "stringArray[*]",
                            "constraint": {
                                "type": "EQUALS_ANY",
                                "values": [
                                    "one",
                                    "two",
                                    "three"
                                ]
                            }
                        }
                    }
                ],
                "customer": [
                    {}
                ],
                "id": [
                    {
                        "permissions": {
                            "type": "ANY",
                            "values": [
                                "aaa"
                            ]
                        }
                    },
                    {
                        "permissions": {
                            "type": "ANY",
                            "values": [
                                "bbb"
                            ]
                        },
                        "condition": {
                            "property": "id",
                            "constraint": {
                                "type": "EQUALS_ANY",
                                "values": [
                                    1
                                ]
                            }
                        }
                    },
                    {
                        "permissions": {
                            "type": "ANY",
                            "values": [
                                "ccc"
                            ]
                        },
                        "conditionsGroup": {
                            "operator": "OR",
                            "conditions": [
                                {
                                    "property": "id",
                                    "constraint": {
                                        "type": "EQUALS_ANY",
                                        "values": [
                                            -1
                                        ]
                                    }
                                },
                                {
                                    "property": "id",
                                    "constraint": {
                                        "type": "EQUALS_ANY",
                                        "values": [
                                            1
                                        ]
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "conditionsTopGroup": {
                            "operator": "AND",
                            "conditionsGroups": [
                                {
                                    "operator": "OR",
                                    "conditions": [
                                        {
                                            "property": "id",
                                            "constraint": {
                                                "type": "EQUALS_NONE",
                                                "values": [
                                                    -1
                                                ]
                                            }
                                        }
                                    ]
                                },
                                {
                                    "operator": "OR",
                                    "conditions": [
                                        {
                                            "property": "id",
                                            "constraint": {
                                                "type": "EQUALS_NONE",
                                                "values": [
                                                    -2
                                                ]
                                            }
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
                "id": []
            }
        },
        "contentRules": {
            "reservation": {
            }
        },
        "updateRules": {
            "reservation": {
            }
        }
    }
;

// Test reservation
export let reservation = {
    "id": 1,
    "number1": 1,
    "number2": 2.3,
    "someString": "foobar",
    "someBool": true,
    "nullValue": null,
    "stringArray": ["one", "two"],
    "someMap": {"one": 1, "two": 2},
    "someDate": "2020-02-12T08:15:59.338+0000",
    "otherDate": "2020-02-12T08:15:59.338Z"
}
