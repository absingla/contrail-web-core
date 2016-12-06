/*
 * Copyright (c) 2014 Juniper Networks, Inc. All rights reserved.
 */

define([
    'underscore',
    'backbone',
    'knockout',
    'contrail-model',
    "view-config-generator",
    "schema-model",
    "json-edit-view",
    "view-config-generator",
    "schema-model"
], function (_, Backbone, Knockout, ContrailModel, ViewConfigGen, UISchemaModel, JsonEditView,
             ViewConfigGen, UISchemaModel) {
    var self = this;

    var JsonModel = ContrailModel.extend({

        defaultConfig: smwmc.getJSONModel(),
        validateAttr: function (attributePath, validation, data) {
            var model = this.model(),
                attr = cowu.getAttributeFromPath(attributePath),
                errors = model.get(cowc.KEY_MODEL_ERRORS),
                attrErrorObj = {}, isValid;

            var schemas = model.get("contrailUIJSONSchemas");
            var schemaModel = new UISchemaModel(schemas.defaultSchema, schemas.stSchema,
                                                schemas.customSchema).schema;
            var vcg = new ViewConfigGen();
            var configureValidation = {};
            vcg.addValidation(schemaModel, configureValidation);
            model.configureValidation = configureValidation;
            var customValidator = schemas.customValidation;
            for (key in customValidator) {
                model.configureValidation[key] = customValidator[key];
            }

            isValid = model.isValid(attributePath, validation);

            attrErrorObj[attr + cowc.ERROR_SUFFIX_ID] = (isValid == true) ? false : isValid;
            errors.set(attrErrorObj);
        },
        configure: function (checkedRows, callbackObj, type, configureData) {
            var ajaxConfig = {},
                putData = {}, attributes = null, locks, jsonData = [], editSchema;

            if (!this.model().isValid(true, "configureValidation")) {
                if (contrail.checkIfFunction(callbackObj.error)) {
                    callbackObj.error(this.getFormErrorText(smwc.CLUSTER_PREFIX_ID));
                    return;
                }
            }
            if (contrail.checkIfExist(checkedRows)) {
                attributes = this.model().attributes;
                if(Array.isArray(attributes)) {
                    attributes = attributes[0];
                }
            } else if (contrail.checkIfExist(configureData)) {
                attributes = configureData;
            }

            locks = attributes.locks.attributes;
            editSchema = attributes.contrailUIJSONSchemas.editSchema;
            /* Delete all added elements */
            delete attributes.contrailUIJSONSchemas;
            delete attributes.customJSON;
            delete attributes.json;
            delete attributes.elementConfigMap;
            delete attributes.errors;
            delete attributes.locks;
            delete attributes.schema;
            if (!cowu.isNil(editSchema)) {
                jsonData.push(cowu.getEditConfigObj(attributes, locks, editSchema, ""));
            } else {
                jsonData.push(attributes);
            }

            putData[type] = jsonData;

            ajaxConfig.type = "PUT";
            ajaxConfig.data = JSON.stringify(putData);
            ajaxConfig.url = smwu.getObjectUrl(type);

            contrail.ajaxHandler(ajaxConfig, function () {
                if (contrail.checkIfFunction(callbackObj.init)) {
                    callbackObj.init();
                }
            }, function (response) {
                if (contrail.checkIfFunction(callbackObj.success)) {
                    callbackObj.success();
                }
            }, function (error) {
                if (contrail.checkIfFunction(callbackObj.error)) {
                    callbackObj.error(error);
                }
            });
        },
        goForward: function(options, path, prefixId) {
            var self = this;
            var modalId = "configure-" + prefixId;
            $("#" + modalId).modal("hide");
            options = JSON.parse(options);
            var rootViewPath = options.rootViewPath;
            var rowIndex = options.rowIndex;
            var gridElId = options.gridElId;

            var viewConfigOptions = {
                title: options.title,
                rootViewPath : rootViewPath,
                path : path,
                group : "",
                page : "",
                element : prefixId,
                rowIndex: rowIndex,
                gridElId: gridElId,
                formType: "edit"
            };
            var schemas = self.contrailUIJSONSchemas();
            var schemaModel = new UISchemaModel(schemas.defaultSchema, schemas.stSchema,
                                                schemas.customSchema).schema;
            var vcg = new ViewConfigGen(prefixId);
            var viewConfig = vcg.generateViewConfig(viewConfigOptions, schemaModel, "default",
                                                    "form"),
                dataItem = $(gridElId).data("contrailGrid")._dataView.getItem(rowIndex),
                checkedRow = dataItem,
                title = options.title;

            var jsonEditView = new JsonEditView();

            jsonEditView.model = self;
            jsonEditView.renderFormEditor({
                "title": title,
                checkedRows: checkedRow,
                rowIndex: rowIndex,
                viewConfig: viewConfig,
                gridElId: gridElId,
                schemas: schemas,
                prefixId: prefixId,
                viewConfig: viewConfig,
                callback: function () {
                    var dataView = $(gridElId).data("contrailGrid")._dataView;
                    dataView.refreshData();
                }
            });
        }
    });

    return JsonModel;
});
