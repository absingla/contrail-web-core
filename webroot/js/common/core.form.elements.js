/*
 * Copyright (c) 2016
 * Juniper Networks, Inc. All rights reserved.
 */

(function($) {
    $.fn.contrailDropdown = function(defaultOption, args) {
        var self = this;
        self.data('contrailDropdown', constructSelect2(self, defaultOption, args));
        return self;
    };

    $.fn.contrailMultiselect = function(option,option2){
        var self = this;
        option.multiple = true;
        self.data('contrailMultiselect', constructSelect2(self, option, option2));
        return self;
    };

    function  fetchSourceMapData(index, data){
        var arr = index.split("."),
            returnVal = data;

        $.each(arr, function(key, value){
            if('children' in returnVal){
                returnVal = returnVal.children[value];
            } else{
                returnVal = returnVal[value];
            }
        });
        return returnVal;
    };

    function constructSelect2(self, customConfig, args) {
        if(typeof args !== 'undefined') {
            self.select2(customConfig, args);
        } else{
            var dataObject = {
                    cachedValue: null,
                    isRequestInProgress: false
                },
                config = {},
                defaultConfig = {
                    minimumResultsForSearch : 7,
                    dropdownAutoWidth : false,
                    dataTextField: 'text',
                    dataValueField: 'id',
                    data: [],
                    // query: function (q) {
                    //     // console.log(q)
                    //     if(q.term != null){
                    //         var pageSize = 50;
                    //         var results = _.filter(this.data,
                    //             function(e) {
                    //                 return (q.term == ""  || e.text.toUpperCase().indexOf(q.term.toUpperCase()) >= 0 );
                    //             });
                    //         q.callback({results:results.slice((q.page-1)*pageSize, q.page*pageSize),
                    //             more:results.length >= q.page*pageSize });
                    //     } else {
                    //         var t = q.term,
                    //             filtered = { results: [] },
                    //             process;
                    //
                    //         process = function(datum, collection) {
                    //             var group, attr;
                    //             datum = datum[0];
                    //             if (datum.children) {
                    //                 group = {};
                    //                 for (attr in datum) {
                    //                     if (datum.hasOwnProperty(attr)) group[attr]=datum[attr];
                    //                 }
                    //                 group.children=[];
                    //                 $(datum.children).each2(function(i, childDatum) { process(childDatum, group.children); });
                    //                 if (group.children.length || query.matcher(t, '', datum)) {
                    //                     collection.push(group);
                    //                 }
                    //             } else {
                    //                 if (q.matcher(t, '', datum)) {
                    //                     collection.push(datum);
                    //                 }
                    //             }
                    //         };
                    //         if(t != ""){
                    //             $(this.data).each2(function(i, datum) { process(datum, filtered.results); })
                    //         }
                    //         q.callback({results:this.data});
                    //     }
                    // },
                    formatResultCssClass: function(obj){
                        if(obj.label && 'children' in obj){
                            return 'select2-result-label';
                        }
                    }

                    // Use dropdownCssClass : 'select2-large-width' when initialzing ContrailDropDown
                    // to specify width of dropdown for Contrail Dropdown
                    // Adding a custom CSS class is also possible. Just add a custom class to the contrail.custom.css file
                },
                source = [];

            //To add newly entered text to the option of multiselect.
            // if (customConfig.multiple == true && customConfig.tags != null && customConfig.tags == true) {
            //     customConfig['createSearchChoice'] = function (term,data) {
            //         return {
            //             id: $.trim(term),
            //             text: $.trim(term)
            //         };
            //     }
            //     customConfig['tags'] = true;
            //     customConfig['tokenSeparators'] = [","];
            //     customConfig['initSelection'] = function (element, callback) {
            //         var data = [];
            //
            //         function splitVal(string, separator) {
            //             var val, i, l;
            //             if (string === null || string.length < 1) return [];
            //             val = string.split(separator);
            //             for (i = 0, l = val.length; i < l; i = i + 1) val[i] = $.trim(val[i]);
            //             return val;
            //         }
            //
            //         $(splitVal(element.val(), ",")).each(function () {
            //             data.push({
            //                 id: this,
            //                 text: this
            //             });
            //         });
            //
            //         callback(data);
            //     };
            // }

            if (contrail.checkIfExist(customConfig.dropdownCssClass)) {
                customConfig.dropdownAutoWidth = true;
            }

            $.extend(true, config, defaultConfig, customConfig);
            config.dataTextField = {dsVar: config.dataTextField, apiVar: 'text'};
            config.dataValueField = {dsVar: config.dataValueField, apiVar: 'id'};

            //subcribe to popup open and close events
            var openFunction = function() {
                if (contrail.checkIfFunction(config.open)) {
                    config.open();
                }
            };

            var changeFunction = function(e) {
                if (contrail.checkIfFunction(config.change)) {
                    config.change(e);
                }
            };
            
            var closeFunction = function() {
                if (contrail.checkIfFunction(config.close)) {
                    config.close();
                }
            };

            var selectingFunction = function(e) {
                if (contrail.checkIfFunction(config.selecting)) {
                    config.selecting(e);
                }
            };

            function initSelect2() {
                config.data = formatData(config.data, config);

                if (contrail.checkIfExist(self.data('select2'))) {
                    self.select2("destroy")
                        .html('')
                        .off("change", changeFunction)
                        .off("select2:selecting", selectingFunction)
                        .off("select2:open", openFunction)
                        .off("select2:close", closeFunction);
                }

                self.select2(config)
                    .on("change", changeFunction)
                    .on("select2:selecting", selectingFunction)
                    .on("select2:open", openFunction)
                    .on("select2:close", closeFunction);

                config.sourceMap = constructSourceMap(config.data, 'id');

                // if (option.data.length > 0) {
                //     if (contrail.checkIfExist(option.multiple)) {
                //     } else {
                //         // set value for Dropdown
                //         if (contrail.checkIfExist(option.defaultValueId) &&
                //             option.defaultValueId >= 0 && option.data.length > option.defaultValueId) {
                //             // set default value
                //             var selectedOption = option.data[option.defaultValueId];
                //             if (contrail.checkIfExist(option.data[0].children) && option.data[0].children.length > 1) {
                //                 selectedOption = option.data[0].children[option.defaultValueId];
                //             }
                //             self.val(selectedOption[option.dataValueField.dsVar]).trigger('change');
                //         }
                //     }
                // }

            }

            if(!$.isEmptyObject(config) && contrail.checkIfExist(config.dataSource)) {
                var dataSourceOption = config.dataSource;
                if(dataSourceOption.type == "remote"){
                    var ajaxConfig = {
                        url: dataSourceOption.url,
                        dataType: contrail.checkIfExist(dataSourceOption.dataType) ? dataSourceOption.dataType : 'json'
                    };
                    if(dataSourceOption.contentType) {
                        ajaxConfig['contentType'] = dataSourceOption.contentType;
                    }
                    if(dataSourceOption.timeout) {
                        ajaxConfig['timeout'] = dataSourceOption.timeout;
                    }
                    if(dataSourceOption.requestType && (dataSourceOption.requestType).toLowerCase() == 'post') {
                        ajaxConfig['type'] = 'POST';
                        ajaxConfig['data'] = dataSourceOption.postData;
                    }

                    contrail.ajaxHandler(ajaxConfig, function(){
                        dataObject.isRequestInProgress = true
                    }, function(data) {
                        dataObject.isRequestInProgress = false;

                        if(typeof dataSourceOption.parse !== "undefined"){
                            data = dataSourceOption.parse(data);
                        }

                        dataObject.setData(data, dataObject.cachedValue, true);
                    });

                } else if(dataSourceOption.type == "local"){
                    source = formatData(dataSourceOption.data, config);
                }
                config.data = source;
            }
            if (contrail.checkIfExist(config.data)) {
                initSelect2();
            }

            $.extend(true, dataObject, {
                getAllData: function(){
                    if(self.data('select2') != null)
                        return self.data('select2').data();
                },
                getSelectedData: function() {
                    var selectedValue = self.val(),
                        selectedObjects = [], index;
                    if (selectedValue == null) {
                        selectedValue = [];
                    } else if (!(selectedValue instanceof Array)) {
                        selectedValue = [selectedValue];
                    }
                    for(var i = 0; i < selectedValue.length; i++) {
                        index = config.sourceMap[selectedValue[i]];
                        selectedObjects.push(fetchSourceMapData(index, config.data));
                    }
                    return selectedObjects;
                },
                text: function(text) {
                    if(typeof text !== 'undefined') {
                        var data = self.data('select2').data();
                        var answer = findTextInObj(text, data);
                        self.val(answer.id);
                    } else {
                        if(self.select2('data') != null && typeof self.select2('data').length !== 'undefined' && self.select2('data').length > 0){
                            var result = [];
                            for(var i=0; i< self.select2('data').length; i++){
                                result.push(self.select2('data')[i].text);
                            }
                            return result;
                        }
                        if (self.select2('data') != null){
                            return (self.select2('data') != null) ? self.select2('data').text : null;
                        }
                    }
                },
                value: function(value) {
                    if (contrail.checkIfExist(value)) {
                        if (dataObject.isRequestInProgress == true) {
                            dataObject.cachedValue = value;
                        }
                        self.val(value)
                            .trigger('change');
                    } else {
                        return self.val();
                    }
                },
                setData: function(data) {
                    if(dataObject.isRequestInProgress == true && contrail.checkIfExist(value)) {
                        dataObject.cachedValue = value;
                    }

                    config.data = data;
                    initSelect2()
                },
                enableOptionList: function (flag, disableItemList) {
                    for (var j = 0; j < disableItemList.length; j++) {
                        for (var i = 0; i < config.data.length; i++) {
                            if(config.data[i].children === undefined) {
                                if (disableItemList[j] === config.data[i][config.dataValueField.dsVar]) {
                                    config.data[i].disabled = !flag;
                                }
                            } else {
                                for(var k = 0;k < config.data[i].children.length; k++) {
                                    if(disableItemList[j] === config.data[i].children[k][config.dataValueField.dsVar]) {
                                        config.data[i].children[k].disabled = !flag;
                                    }
                                }
                            }
                        }
                    }
                    self.select2('destroy');
                    self.select2(config);
                    self.val("");
                },
                enable: function(flag){
                    self.select2("enable", flag);
                },
                isEnabled: function(){
                    if($(self.selector).prop('disabled')){
                        return false;
                    }else{
                        return true;
                    }
                },
                isEnabledOption: function (optionText) {
                    for (var i = 0; i < config.data.length; i++) {
                        if (config.data[i].text === optionText) {
                            if (config.data[i].disabled) {
                                return false;
                            }
                        }
                    }
                    return true;
                },
                destroy: function(){
                    self.off("change", changeFunction)
                        .select2('destroy');
                },
                hide: function() {
                    self.select2("container").hide();
                },
                show: function() {
                    self.select2("container").show();
                }
            });

            return dataObject;
        }
    }
})(jQuery);