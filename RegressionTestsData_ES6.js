export const testValidationRules = {
    "schemaVersion": "0.8",
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
            "customer.name": [
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
                        "type": "ALL",
                        "values": [
                            "aaa",
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
            "otherDate": [
                {
                    "constraint": {
                        "type": "WEEKDAY_ANY",
                        "days": ["SATURDAY"]
                    }
                }
            ],
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
                        "type": "EQUALS_ANY",
                        "values": [
                            "one",
                            "two"
                        ],
                        "nullEqualsTo" : true
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
                        "type": "EQUALS_ANY_REF",
                        "values": [
                            "stringArray[*]",
                            "stringArray2[1/2]"
                        ]
                    },
                    "permissions": {
                        "type": "ANY",
                        "values": [
                            "bbb"
                        ]
                    }
                },
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
                    },
                    "permissions": {
                        "type": "NONE",
                        "values": [
                            "aaa"
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
                    },
                    "permissions": {
                        "type": "NONE",
                        "values": [
                            "aaa"
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
                    "permissions": {
                        "type": "NONE",
                        "values": [
                            "aaa"
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
    "stringArray2": null,
    "integerArray": [1, 2, 3],
    "someMap": {"one": 1, "two": 2},
    "someDate": "2022-01-01T12:00:00+0000",
    "otherDate": "2022-01-01T12:00:00Z",
    "customer": { "name": "someCustomer" }
};
