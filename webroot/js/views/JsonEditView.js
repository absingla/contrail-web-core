/*
 * Copyright (c) 2014 Juniper Networks, Inc. All rights reserved.
 */

define([
    'underscore',
    'contrail-view',
    'knockback',
    "view-config-generator",
    "schema-model",
], function (_, ContrailView, Knockback, ViewConfigGen, UISchemaModel, JsonEditView) {

    var JSONEditView = ContrailView.extend({

        renderEditor: function (options) {
            var prefixId = options['type'],
                modalId = 'configure-' + prefixId,
                editJSONTemplate = contrail.getTemplate4Id(cowc.TMPL_EDIT_JSON),
                jsonEditViewConfig = { elementId: prefixId, view: "JsonEditorView", viewConfig: [] };

            var editLayout = editJSONTemplate({prefixId: prefixId}),
                self = this;

            var defaultSaveFn = function () {
                var callbackObj = {
                    init: function () {
                        cowu.enableModalLoading(modalId);
                    },
                    success: function () {
                        options['callback']();
                        $("#" + modalId).modal('hide');
                    },
                    error: function (error) {
                        cowu.disableModalLoading(modalId, function () {
                            showError(error.responseText);
                        });
                    }
                };
                self.model.configure(options['checkedRows'], callbackObj, options['type']);
            };

            cowu.createModal({
                modalId: modalId,
                className: 'modal-980',
                title: options['title'],
                body: editLayout,
                onSave: contrail.checkIfExist(options['onSave']) ? options['onSave'] : defaultSaveFn,
                onCancel: function () {
                    Knockback.release(self.model, document.getElementById(modalId));
                    kbValidation.unbind(self);
                    $("#" + modalId).modal('hide');
                }
            });

            self.renderView4Config($("#" + modalId).find("#" + prefixId + "-form"), this.model,
                                   jsonEditViewConfig, "configureValidation", null, null, function() {
                Knockback.applyBindings(self.model, document.getElementById(modalId));
            });
        },
        renderFormEditor: function(options) {
            var prefixId = options.prefixId,
                schemas = options.schemas;
                modalId = 'configure-' + prefixId,
                gridElId = options.gridElId,
                editTemplate = contrail.getTemplate4Id(cowc.TMPL_EDIT_FORM);

            var editLayout = editTemplate({prefixId: prefixId}),
                self = this;

            //self.model.contrailUIJSONSchemas(schemas);
            var defaultSaveFn = function () {
                var callbackObj = {
                    init: function () {
                        cowu.enableModalLoading(modalId);
                    },
                    success: function () {
                        options['callback']();
                        $("#" + modalId).modal('hide');
                        cowch.reset();
                    },
                    error: function (error) {
                        cowu.disableModalLoading(modalId, function () {
                            self.model.showErrorAttr(prefixId + cowc.FORM_SUFFIX_ID, error.responseText);
                            showError(error.responseText);
                        });
                    }
                };
                self.model.configure(options['checkedRows'], callbackObj,
                                     (!cowu.isNil(options['type'])) ? options.type :
                                     options.prefixId);
            };

            var modalConfig = {
                modalId: modalId,
                className: 'modal-980',
                title: options['title'],
                body: editLayout,
                onSave: contrail.checkIfExist(options['onSave']) ? options['onSave'] : defaultSaveFn,
                onCancel: function () {
                    Knockback.release(self.model, document.getElementById(modalId));
                    kbValidation.unbind(self);
                    $("#" + modalId).modal('hide');
                }
            };
            cowu.createModal(modalConfig);

            if((options.viewConfig)){
                modalConfig.onBack = function(){
                    var elements = $("#" + modalId).find("#" + prefixId + "-form").children(":first").children(":first");
                    if (typeof elements == "object") {
                        var path = elements.attr("data-path");
                        var _path = elements.attr("data-path").split(".");
                        var _rootViewPath = elements.attr("data-rootViewPath").split(".");

                        if(_path.length > _rootViewPath.length) {
                            _path.pop();
                            _path.pop();
                            _path.pop();
                            _path.pop();
                            path = _path.join(".");

                            $("#" + modalId).modal("hide");

                            var dataItem =
                                $(gridElId).data("contrailGrid")._dataView.getItem(options.rowIndex),
                                checkedRow = [dataItem],
                                title = options.title;

                            var viewConfigOptions = {
                                title: title,
                                path : path,
                                group : "",
                                page : "",
                                element : prefixId,
                                rowIndex: options.rowIndex,
                                gridElId: gridElId,
                                formType: "edit"
                            };

                            var schemaModel = new UISchemaModel(schemas.defaultSchema,
                                                                schemas.stSchema,
                                                                schemas.customSchema).schema;
                            var vcg = new ViewConfigGen(prefixId);
                            var viewConfig = vcg.generateViewConfig(viewConfigOptions, schemaModel,
                                                                    "default", "form");
                            self.renderFormEditor({
                                "title": title,
                                checkedRows: checkedRow,
                                rowIndex: options.rowIndex,
                                viewConfig: viewConfig,
                                prefixId: prefixId,
                                schemas: schemas,
                                gridElId: gridElId,
                                callback: function () {
                                    var dataView = $(gridElId).data("contrailGrid")._dataView;
                                    dataView.refreshData();
                                }
                            });
                        }
                        //update state of back button
                        if(path.split(".").length <= _rootViewPath.length){
                            $("#" + modalId).find("#backBtn").attr("disabled", true);
                        }
                    }
                };
            }

            cowu.createModal(modalConfig);

            var element = $("#" + modalId).find("#" + prefixId + "-form");
            self.renderView4Config($("#" + modalId).find("#" + prefixId + "-form"), this.model,
                                   options.viewConfig, "configureValidation", null, null,
                                   function() {
                self.model.showErrorAttr(prefixId + cowc.FORM_SUFFIX_ID, false);
                Knockback.applyBindings(self.model, document.getElementById(modalId));
                kbValidation.bind(self);

                if(options.viewConfig){
                    var _path = element.children(":first").children(":first").attr("data-path").split(".");
                    var _rootViewPath = element.children(":first").children(":first").attr("data-rootViewPath").split(".");

                    //update state of back button
                    if(_path.length <= _rootViewPath.length) {
                        $("#" + modalId).find("#backBtn").attr("disabled", true);
                    }
                }
            });
        }
    });

    var showError = function(message){
        $(".edit-json-error").remove();
        $(".modal-body").prepend("<div class='alert alert-error edit-json-error'><strong>Error: </strong><span>" + message + "</span></div>");
    }

    return JSONEditView;
});
