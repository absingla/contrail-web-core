define([
    'underscore',
    'contrail-remote-data-handler'
], function (_, ContrailRemoteDataHandler) {
    var ContrailGraphModel = joint.dia.Graph.extend({

        initialize: function (graphModelConfig) {
            var defaultCacheConfig = {
                cacheConfig: {
                    cacheTimeout: cowc.GRAPH_CACHE_UPDATE_INTERVAL,
                    loadOnTimeout: true
                }
            };

            var modelConfig = $.extend(true, {}, graphModelConfig, defaultCacheConfig);

            joint.dia.Graph.prototype.initialize.apply(this);

            this.cacheConfig = modelConfig['cacheConfig'];
            this.ucid = modelConfig['cacheConfig']['ucid'];
            this.setData2Cache = modelConfig['cacheConfig']['setData2Cache'];
            this.getDataFromCache = modelConfig['cacheConfig']['getDataFromCache'];
            this.graphConfig = modelConfig;
            this.generateElements = modelConfig.generateElementsFn;
            this.forceFit = modelConfig.forceFit;

            return this;
        },

        fetchData: function (successCallback) {
            var self = this, useCache = true,
                cacheConfig = self.cacheConfig;

            self.elementMap = {node: {}, link: {}};

            var remoteHandlerConfig = getRemoteHandlerConfig(self, successCallback),
                cachedData = (cacheConfig.getDataFromCache != null) ? cacheConfig.getDataFromCache(cacheConfig.ucid) : null;


            if(cacheConfig.cacheTimeout == 0 || cachedData == null) {
                useCache = false;
            } else if (cachedData != null && (cacheConfig.cacheTimeout < ($.now() - cachedData['lastUpdateTime'])) && cacheConfig.loadOnTimeout == false) {
                useCache = false;
            }

            if (useCache) {
                self.contrailDataHandler = createGraphFromCache(cachedData, self, successCallback, remoteHandlerConfig);
            } else {
                self.contrailDataHandler = new ContrailRemoteDataHandler(remoteHandlerConfig);
            }
        },

        isPrimaryRequestInProgress: function() {
            return (self.contrailDataHandler != null) ? self.contrailDataHandler.isPrimaryRequestInProgress() : false;
        },

        isLazyRequestInProgress: function() {
            return (self.contrailDataHandler != null) ? self.contrailDataHandler.isLazyRequestInProgress() : false;
        },

        isRequestInProgress: function() {
            return (self.contrailDataHandler != null) ? self.contrailDataHandler.isRequestInProgress() : false;
        }
    });

    var createGraphFromCache = function (cachedData, contrailGraphModel, successCallback, remoteHandlerConfig) {
        var contrailDataHandler,
            cachedGraphModel = cachedData['dataObject']['graphModel'],
            cachedElementsMap = cachedGraphModel.elementMap,
            cachedResponse = cachedData['dataObject']['response'],
            cachedTime = cachedData['lastUpdateTime'];

        var elementMap = {node: {}, link: {}};
        var elementsObject = contrailGraphModel.generateElements(cachedResponse, elementMap);

        contrailGraphModel.resetCells(elementsObject['elements']);
        contrailGraphModel.elementMap = cachedElementsMap;

        if (contrailGraphModel.forceFit) {
            contrailGraphModel.directedGraphSize = graphLayoutHandler.layout(contrailGraphModel, getForceFitOptions(null, null, elementsObject['nodes'], elementsObject['links']));
        }

        successCallback(contrailGraphModel.directedGraphSize);

        if (cowc.GRAPH_CACHE_UPDATE_INTERVAL < ($.now() - cachedTime)) {
            contrailDataHandler = new ContrailRemoteDataHandler(remoteHandlerConfig);
        }

        return contrailDataHandler;
    };

    var getRemoteHandlerConfig = function (contrailGraphModel, successCallback) {
        var remoteHandlerConfig = {},
            primaryRemote = contrailGraphModel.graphConfig.remote,
            lazyRemote = contrailGraphModel.graphConfig.lazyRemote,
            primaryRemoteConfig = {
                ajaxConfig: primaryRemote.ajaxConfig,
                dataParser: primaryRemote.dataParser,
                initCallback: primaryRemote.initCallback,
                successCallback: function (response) {
                    var elementMap = {node: {}, link: {}};
                    var elementsObject = contrailGraphModel.generateElements(response, elementMap);

                    contrailGraphModel.resetCells(elementsObject['elements']);
                    contrailGraphModel.elementMap = elementMap;

                    if (contrailGraphModel.forceFit) {
                        contrailGraphModel.directedGraphSize = graphLayoutHandler.layout(contrailGraphModel, getForceFitOptions(null, null, elementsObject['nodes'], elementsObject['links']));
                    }
                    successCallback(contrailGraphModel.directedGraphSize);
                },
                updateCacheCallback: function(completeResponse) {
                    var response = completeResponse[0];
                    if (contrailGraphModel.setData2Cache != null) {
                        //TODO: Binding of cached gridModel (if any) with existing view should be destroyed.
                        contrailGraphModel.setData2Cache(contrailGraphModel.ucid, {
                            graphModel: contrailGraphModel,
                            response: response
                        });
                    }
                },
                failureCallback: function (xhr) {
                    if (contrail.checkIfFunction(primaryRemote.failureCallback)) {
                        primaryRemote.failureCallback(xhr, contrailGraphModel);
                    }
                }
            },
            lazyRemoteConfig;

        remoteHandlerConfig['primaryRemoteConfig'] = primaryRemoteConfig;
        remoteHandlerConfig['lazyRemoteConfig'] = [];

        for (var i = 0; lazyRemote != null && i < lazyRemote.length; i++) {
            var lSuccessCallback = lazyRemote[i].successCallback,
                lFailureCallback = lazyRemote[i].failureCallback;

            lazyRemoteConfig = {
                getAjaxConfig: lazyRemote[i].getAjaxConfig,
                dataParser: lazyRemote[i].dataParser,
                initCallback: lazyRemote[i].initCallback,
                successCallback: function (response) {
                    if (contrail.checkIfFunction(lSuccessCallback)) {
                        lSuccessCallback(response, contrailGraphModel);
                    }
                },
                failureCallback: function (xhr) {
                    if (contrail.checkIfFunction(lFailureCallback)) {
                        lFailureCallback(xhr, contrailGraphModel);
                    }
                }
            }
            remoteHandlerConfig['lazyRemoteConfig'].push(lazyRemoteConfig);
        }

        return remoteHandlerConfig;
    };

    var graphLayoutHandler = $.extend(true, joint.layout.DirectedGraph, {
        layout: function (graph, opt) {

            opt = opt || {};

            var inputGraph = this._prepareData(graph);
            var runner = dagre.layout();

            if (opt.debugLevel) {
                runner.debugLevel(opt.debugLevel);
            }
            if (opt.rankDir) {
                runner.rankDir(opt.rankDir);
            }
            if (opt.rankSep) {
                runner.rankSep(opt.rankSep);
            }
            if (opt.edgeSep) {
                runner.edgeSep(opt.edgeSep);
            }
            if (opt.nodeSep) {
                runner.nodeSep(opt.nodeSep);
            }

            var layoutGraph = runner.run(inputGraph);

            layoutGraph.eachNode(function (u, value) {
                if (!value.dummy) {
                    graph.get('cells').get(u).set('position', {
                        x: value.x + GRAPH_MARGIN - value.width / 2,
                        y: value.y + GRAPH_MARGIN - value.height / 2
                    });
                }
            });

            if (opt.setLinkVertices) {

                layoutGraph.eachEdge(function (e, u, v, value) {
                    var link = graph.get('cells').get(e);
                    if (link) {
                        graph.get('cells').get(e).set('vertices', value.points);
                    }
                });
            }
            return {width: layoutGraph.graph().width, height: layoutGraph.graph().height};
        }
    });

    return ContrailGraphModel;
});