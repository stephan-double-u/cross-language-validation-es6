export const testValidationRules = {
    "schema-version": "0.5",
    "mandatoryRules": {
        "sometype": {
            "customer": [
                {
                    "errorCodeControl": {
                        "useType": "AS_SUFFIX",
                        "code": "#errcodesuffix"
                    }
                }
            ],
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
            "number1": [
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
                        "property": "number1",
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
                                "property": "number1",
                                "constraint": {
                                    "type": "EQUALS_ANY",
                                    "values": [
                                        -1
                                    ]
                                }
                            },
                            {
                                "property": "number1",
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
                                        "property": "number1",
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
                                        "property": "number1",
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
        "sometype": {
            "number1": []
        }
    },
    "contentRules": {
        "sometype": {
            "number1": [
                {
                    "constraint": {
                        "type": "RANGE",
                        "min": 1,
                        "max": 10
                    }
                }
            ],
            "someDate": [
                {
                    "constraint": {
                        "type": "RANGE",
                        "min": "2022-01-01T00:00:00Z",
                        "max": "2022-01-01T23:59:59Z"
                    }
                }
            ],
            "someString": [
                {
                    "constraint": {
                        "type": "SIZE",
                        "min": 1,
                        "max": 10
                    }
                }
            ],
            "nullValue": [
                {
                    "constraint": {
                        "type": "EQUALS_NULL"
                    }
                }
            ],
            "stringArray": [
                {
                    "constraint": {
                        "type": "SIZE",
                        "min": 2,
                        "max": 3
                    }
                }
            ],
            "integerArray[*]#sum": [
                {
                    "constraint": {
                        "type": "EQUALS_ANY",
                        "values": [
                            6
                        ]
                    },
                    "permissions": {
                        "type": "ANY",
                        "values": [
                            "aaa"
                        ]
                    }
                },
                {
                    "constraint": {
                        "type": "RANGE",
                        "min": 1,
                        "max": 6
                    },
                    "permissions": {
                        "type": "ANY",
                        "values": [
                            "bbb"
                        ]
                    }
                }
            ],
            "integerArray[*]#distinct": [
                {
                    "constraint": {
                        "type": "EQUALS_ANY",
                        "values": [
                            true
                        ]
                    },
                    "permissions": {
                        "type": "ANY",
                        "values": [
                            "aaa"
                        ]
                    }
                },
                {
                    "constraint": {
                        "type": "EQUALS_ANY",
                        "values": [
                            false
                        ]
                    }
                }
            ],
            "stringArray[*]#distinct": [
                {
                    "constraint": {
                        "type": "EQUALS_ANY",
                        "values": [
                            true
                        ]
                    },
                    "permissions": {
                        "type": "ANY",
                        "values": [
                            "aaa"
                        ]
                    }
                },
                {
                    "constraint": {
                        "type": "EQUALS_ANY",
                        "values": [
                            false
                        ]
                    }
                }
            ]
        }
    },
    "updateRules": {
        "sometype": {
            "someString": [
                {
                    "constraint": {
                        "type": "EQUALS_ANY",
                        "values": [
                            "foo",
                            "bar"
                        ]
                    },
                    "condition": {
                        "property": "someString",
                        "constraint": {
                            "type": "EQUALS_ANY",
                            "values": [
                                "foo"
                            ]
                        }
                    }
                },
                {
                    "constraint": {
                        "type": "EQUALS_ANY",
                        "values": [
                            "bar"
                        ]
                    },
                    "condition": {
                        "property": "someString",
                        "constraint": {
                            "type": "EQUALS_ANY",
                            "values": [
                                "bar"
                            ]
                        }
                    }
                },
                {
                    "constraint": {
                        "type": "EQUALS_ANY",
                        "values": [
                            "foo",
                            "bar",
                            "zoo"
                        ]
                    },
                    "permissions": {
                        "type": "ANY",
                        "values": [
                            "aaa"
                        ]
                    }
                }
            ]
        }
    }
};

// Test entity
export let sometypeObject = {
    "number1": 1,
    "number2": 2.3,
    "someString": "foo",
    "someBool": true,
    "nullValue": null,
    "stringArray": ["one", "two"],
    "integerArray": [1, 2, 3],
    "someMap": {"one": 1, "two": 2},
    "someDate": "2022-01-01T12:00:00+0000",
    "otherDate": "2022-01-01T12:00:00Z"
};
