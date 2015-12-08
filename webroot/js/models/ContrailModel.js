/*
 * Copyright (c) 2014 Juniper Networks, Inc. All rights reserved.
 */

define([
    'underscore',
    'backbone',
    'contrail-view-model',
    'knockout',
    'knockback'
], function (_, Backbone, ContrailViewModel, Knockout, Knockback) {
    var ContrailModel = Knockback.ViewModel.extend({

        formatModelConfig: function(modelConfig) {
            return modelConfig;
        },

        constructor: function (modelData, modelRemoteDataConfig) {
            var model, errorAttributes,
                editingLockAttrs, _this = this,
                modelAttributes = (modelData == null) ? this.defaultConfig : modelData;

            errorAttributes = generateAttributes(modelAttributes, cowc.ERROR_SUFFIX_ID, false);
            editingLockAttrs = generateAttributes(modelAttributes, cowc.LOCKED_SUFFIX_ID, true);

            modelData = $.extend(true, {}, this.defaultConfig, modelData, {errors: new Backbone.Model(errorAttributes), locks: new Backbone.Model(editingLockAttrs)});

            modelData = this.formatModelConfig(modelData);
            model = new ContrailViewModel($.extend(true, {data: modelData}, modelRemoteDataConfig));
            model = _.extend(model, this.validations, {_originalAttributes: modelAttributes});

            Knockback.ViewModel.prototype.constructor.call(this, model);

            delete this.validations;
            return this;
        },

        getValueByPath: function (path) {
            var obj = this.model().attributes;
            path = path.replace(/\[(\w+)\]/g, '.$1');
            path = path.replace(/^\./, '');
            var pathArray = path.split('.');
            while (pathArray.length) {
                var property = pathArray.shift();
                if (obj != null && property in obj) {
                    obj = obj[property];
                } else {
                    return;
                }
            }
            return obj;
        },

        validateAttr: function (attributePath, validation) {
            var attr = cowu.getAttributeFromPath(attributePath),
                errors = this.model().get(cowc.KEY_MODEL_ERRORS),
                attrErrorObj = {}, isValid;

            isValid = this.model().isValid(attributePath, validation);
            attrErrorObj[attr + cowc.ERROR_SUFFIX_ID] = (isValid == true) ? false : isValid;
            errors.set(attrErrorObj);
        },

        isDeepValid: function(validations) {
            var isValid = true, isInternalValid = true,
                validationObj, validationOption = true,
                key, keyObject, collectionModel, errors, attrErrorObj,
                objectType, getValidation, validationName;

            for (var i = 0; i < validations.length; i++) {
                validationObj = validations[i];
                key = validationObj['key'];
                objectType = validationObj['type'];
                getValidation = validationObj['getValidation'];

                if(contrail.checkIfExist(key)) {
                    keyObject = this.model().attributes[key];
                    errors = this.model().get(cowc.KEY_MODEL_ERRORS);

                    if(objectType == cowc.OBJECT_TYPE_COLLECTION) {
                        for( var j = 0; j < keyObject.size(); j++) {
                            collectionModel = keyObject.at(j);
                            validationName = typeof getValidation == 'function' ? getValidation(collectionModel) : getValidation;
                            isInternalValid = collectionModel.attributes.model().isValid(validationOption, validationName);
                            attrErrorObj = {};
                            if(!isInternalValid) {
                                attrErrorObj[key + cowc.ERROR_SUFFIX_ID] = !isInternalValid;
                                errors.set(attrErrorObj);
                            }
                            isValid = isValid && isInternalValid;
                        }
                    } else if (objectType == cowc.OBJECT_TYPE_MODEL) {
                        validationName = typeof getValidation == 'function' ? getValidation(this) : getValidation;
                        isInternalValid = keyObject.model().isValid(validationOption, validationName);
                        attrErrorObj = {};
                        attrErrorObj[key + cowc.ERROR_SUFFIX_ID] = !isInternalValid;
                        errors.set(attrErrorObj);
                        isValid = isValid && isInternalValid;
                    }

                } else {
                    validationName = typeof getValidation == 'function' ? getValidation(this) : getValidation;
                    isValid = isValid && this.model().isValid(validationOption, validationName);
                }
            }

            return isValid;
        },

        initLockAttr: function (attributePath, lockFlag) {
            var attribute = cowu.getAttributeFromPath(attributePath),
                locks = this.model().get(cowc.KEY_MODEL_LOCKS),
                errors = this.model().get(cowc.KEY_MODEL_ERRORS),
                lockObj = {}, attrErrorObj = {};

            lockObj[attribute + cowc.LOCKED_SUFFIX_ID] = lockFlag;
            locks.set(lockObj);

            attrErrorObj[attribute + cowc.ERROR_SUFFIX_ID] = false
            errors.set(attrErrorObj);
        },

        toggleLockAttr: function(attributePath) {
            var attribute = cowu.getAttributeFromPath(attributePath),
                locks = this.model().get(cowc.KEY_MODEL_LOCKS),
                lockedStatus = locks.attributes[attribute + cowc.LOCKED_SUFFIX_ID],
                lockObj = {};

            lockObj[attribute + cowc.LOCKED_SUFFIX_ID] = !lockedStatus;
            locks.set(lockObj);
        },

        showErrorAttr: function(attributePath, msg) {
            var attribute = cowu.getAttributeFromPath(attributePath),
                errors = this.model().get(cowc.KEY_MODEL_ERRORS),
                errorObj = {};

            errorObj[attribute + cowc.ERROR_SUFFIX_ID] = msg;
            errors.set(errorObj);
        },

        checkIfInputDisabled: function(disabledFlag, lockFlag) {
            return disabledFlag || lockFlag;
        },

        getFormErrorText: function (prefixId) {
            var modelErrors = this.model().attributes.errors.attributes,
                errorText = cowm.get(cowm.SHOULD_BE_VALID, cowl.get(prefixId));

            _.each(modelErrors, function (value, key) {
                if (_.isFunction(modelErrors[key]) || (modelErrors[key] == 'false') || (modelErrors[key] == '')) {
                    delete modelErrors[key];
                } else {
                    if (-1 == (key.indexOf('_form_error'))) {
                        errorText = errorText + cowl.getFirstCharUpperCase(key.split('_error')[0]) + ", ";
                    }
                }
            });
            // Replace last comma by a dot
            errorText = errorText.slice(0, -2) + ".";
            return {responseText: errorText};
        }
    });

    function generateAttributes(attributes, suffix, defaultValue) {
        var flattenAttributes = cowu.flattenObject(attributes),
            errorAttributes = {};

        _.each(flattenAttributes, function (value, key) {
            var keyArray = key.split('.');
            errorAttributes[keyArray[keyArray.length - 1] + suffix] = defaultValue;
        });

        return errorAttributes;
    };

    return ContrailModel;
});