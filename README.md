# Cross Language Validation ECMAScript 6
This JavaScript implements the client side part of the 
[Cross Language Validation Schema](https://github.com/stephan-double-u/cross-language-validation-schema)
i.e. it:
- is able to consume JSON instances of that schema
- provides an API to validate the validation rules defined in that instances against the relevant objects

TODO: improve documentation

## Importing the framework
```javascript
import {
    setValidationRules, isPropertyMandatory, isPropertyImmutable,
    validateMandatoryRules, validateContentRules, validateImmutableRules, validateUpdateRules
} from './CrossLanguageValidation_ES6.js';
```

## Method setValidationRules
After getting the validation rules as a JSON instance of the mentioned schema somehow from somewhere 
(e.g. from `GET /validation-rules` endpoint), they must be made known to the framework with 
```javascript
setValidationRules(rules);
```

## Method isPropertyMandatory 
The method `isPropertyMandatory` returns `true` if the property of the entity type should be mandatory 
```javascript
isPropertyMandatory("article", "name", article, userPerms);
```

## Method isPropertyImmutable
The method `isPropertyImmutable` returns `true` if the property of the entity type should be immutable 
```javascript
isPropertyImmutable("article", "name", article, userPerms);
```

## Methods validateMandatoryRules and validateContentRules
When a _new object entity is created_, any change of a property value can lead to validation errors.

For a property that should be mandatory this would be the case if the property is _null_. 

For a property for which a constraint on the allowed values is defined this would be the case if the current property 
value does not satisfy this constraint.
```
    const errors = validateMandatoryRules("article", editedArticle, userPerms);
    errors.push(...validateContentRules("article", editedArticle, userPerms));
```
When errors occur, they should be shown to the user in some way, such as by displaying the error message to which the
error code is mapped below the input element for that property.

## Methods validateImmutableRules and validateUpdateRules
When it comes to updating an object, _further validation errors_ may occur, caused by not allowed changes of property 
values.

This applies to properties that are defined as immutable, but whose current value is not identical to the last saved
value.

And it applies to properties for which constraints on allowed value changes are defined, but these constraints are not
met.
```
        errors.push(...validateImmutableRules("article", savedArticle, editedArticle, userPerms));
        errors.push(...validateUpdateRules("article", savedArticle, editedArticle, userPerms));
```
