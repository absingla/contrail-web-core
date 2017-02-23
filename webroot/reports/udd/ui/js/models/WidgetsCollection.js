/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */
define([
    "lodash",
    "backbone",
    "core-basedir/reports/udd/ui/js/common/udd.constants",
    "core-basedir/reports/udd/ui/js/models/WidgetModel"
], function(_, Backbone, uddConstants, Widget) {

    function markWidgetAsReady(widget) {
        _.merge(widget.config, {
            isReady: true,
            step: uddConstants.steps.SHOW_VISUALIZATION,
            editingTitle: false,
            canProceed: true
        });

        return widget;
    }

    var WidgetsCollection = Backbone.Collection.extend({
        tabModels: {}, // a map recording the Backbone collection of each tab
        initialize: function(attrs, options) {
            var self = this;
            this.model = Widget;
            this.url = options ? options.url : "";

            setTimeout(function() {
                self._tabName = self.getTabName();
            });
        },
        comparator: function (w) {
            return w.attributes.tabCreationTime;
        },
        parse: function(response) {
            var _res = _.get(response, "result.rows", []);

            return _.map(_res, markWidgetAsReady);
        },
        //TODO it would be good to use synced subcollections like: https://github.com/anthonyshort/backbone.collectionsubset
        // both params are mandatory to access filtered collections right
        filterBy: function(dashboardId, tabId) {
            if (this.tabModels[tabId]) {
                return this.tabModels[tabId].collections;
            }

            var tabInfoFields = [
                    "customizedTabListOrder",
                    "tabCreationTime",
                    "tabId",
                    "tabName"
                ],
                filtered = new WidgetsCollection(
                    this.filter(function(model) {
                        var isValid = !dashboardId || model.get("dashboardId") === dashboardId;

                        isValid = isValid && (!tabId || model.get("tabId") === tabId);

                        return isValid;
                    }),
                    {
                        url: this.url
                    }
                );

            filtered.on("add", this._onAdd.bind(this, tabId));

            var onefilteredWidget = filtered.at(0);

            this.tabModels[tabId] = {
                info: _.pick(onefilteredWidget ? onefilteredWidget.attributes : {}, tabInfoFields),
                collection: filtered
            };

            return filtered;
        },
        dashboardIds: function() {
            return _.uniq(this.pluck("dashboardId"));
        },
        tabIds: function(dashboardId) {
            var widgetsByDashboard = this.filter(function(model) {
                return model.get("dashboardId") === dashboardId;
            });

            return _.uniq(_.pluck(widgetsByDashboard, "attributes.tabId"));
        },
        setTabName: function(tabName) {
            this._tabName = tabName;
            _.each(this.models, function(widget) {
                widget.set("tabName", tabName);
                widget.save();
            });
        },
        setTabCreationTime: function(tabCreationTime) {
            this._tabCreationTime = tabCreationTime;
            _.each(this.models, function(widget) {
                widget.set("tabCreationTime", tabCreationTime);
                widget.save();
            });
        },
        // this handler is bound to parent collection
        _onAdd: function (tabId, model) {
            if (_.isEmpty(this.tabModels[tabId].info)) {
                // if info is missing, we are adding the first widget to the tab,
                // the tab's info needs to be synced
                this.tabModels[tabId].info = {
                    tabId: tabId,
                    tabName: model.collection._tabName,
                    tabCreationTime: model.collection._tabCreationTime,
                    customizedTabListOrder: this.models[0] ? this.models[0].get("customizedTabListOrder") : ""
                };

                model.set(this.tabModels[tabId].info);
            }

            this.add(model);
        },
        // each tab has its own collection
        getTabName: function() {
            return this.models[0] ? (this.models[0].get("tabName") || this.models[0].get("tabId")) : this._tabName;
        },
        getTabCreationTime: function() {
            return this.models[0] ? this.models[0].get("tabCreationTime") : Date.now();
        },
        getCustomizedTabListOrder: function() {
            if (this.models.length > 0) {
                var deserialized = this.models[0].get("customizedTabListOrder").split(/&?UUID=/img);
                _.remove(deserialized, _.isEmpty);
                return deserialized;
            } else {
                return [];
            }
        }
    });
    return WidgetsCollection;
});
