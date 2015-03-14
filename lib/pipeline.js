'use strict';


var path = require('path');
var clock = require('clck');
var P = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var utils = require('util');
var sjl = require("sjl");
var log = require('./log');


function isValid(stage)
{
    var result = false;
    
    if (   stage
        && stage.name
        && stage.process)
    {
        result = true;
    }
    
    return result;
}

function promisifyProcess(fn, name)
{
    return function(req, res, target, endpoint, conf)
    {
        return new P(function(resolve, reject)
        {
            try
            {
                log.info('Processing stage "%s"...', name);
                
                fn(req, res, target, endpoint, function(newReq, newRes, newTarget, newEndpoint)
                {
                    resolve([newReq, newRes, newTarget, newEndpoint]);
                    
                }, conf);
            }
            catch (err)
            {
                reject(err);
            }
        });
    };
}

function reportDuration(duration, id)
{
    log.debug('"%s" took %d milliseconds', id, duration);
}


function Pipeline()
{
    this.stages = [];
}

utils.inherits(Pipeline, EventEmitter);

Pipeline.prototype.load = function(definition)
{
    var self = this;
    
    return new P(function(resolve, reject)
    {
        clock.start('Pipeline#load.promise');
        
        if (definition && definition.PATH && definition.STEPS)
        {
            log.info('Going to load pipeline from "%s"...', definition.PATH);
            
            self.definition = definition;
            
            var stagesPath  = definition.PATH;

            self.path = path.resolve(stagesPath);

            if (self.path)
            {
                self.stages = [];
                
                for (var a=0; a<definition.STEPS.length; a++)
                {
                    var fileName = definition.STEPS[a];
                    
                    if (fileName.indexOf('.js') === -1)
                    {
                        fileName += '.js';
                    }
                    
                    var file = path.join(self.path, fileName);
                        file = path.resolve(file);
                    
                    if (file)
                    {
                        var stage = require(file);
                        
                        if (isValid(stage))
                        {
                            log.info('Stage "%s" loaded', stage.name);
                            
                            stage.process = promisifyProcess(stage.process, stage.name);
                            
                            self.stages.push(stage);
                        }
                        // else skip it
                    }
                }
                
                clock.stop('Pipeline#load.promise', reportDuration);
                
                resolve(self);
            }
            else
            {
                clock.stop('Pipeline#load.promise', reportDuration);
                
                reject(new Error('Empty path'));
            }
        }
        else
        {
            clock.stop('Pipeline#load.promise', reportDuration);
            
            reject(new Error('Empty definition'));
        }
    });
};

Pipeline.prototype.process = function(cb)
{
    var self = this;
    
    return function(req, res)
    {
        clock.start('Pipeline#process');
        
        log.info('Going to process request for URL "%s"...', req.url);
        
        var resultingTarget;
        var resultingEndpoint;
        var resultingReq = req;
        var resultingRes = res;
        
        if (self.stages)
        {
            log.info('Processing %s stage(s)...', self.stages.length);
            
            var stepSubProcessing = function(conf, nextStep)
            {
                nextStep = nextStep || 0;
                
                var stage = self.stages[nextStep++];

                log.info('Stage "%s" executing...', stage.name);

                // Load stage config:
                var stageConf = conf[stage.name];

                stage.process(resultingReq, resultingRes, resultingTarget, resultingEndpoint, stageConf)
                .spread(function(req, res, target, endpoint)
                {
                    // Check for errors on the first parameter
                    if (req instanceof Error)
                    {
                        log.error('Aborting at step "%s". %s', stage.name, req);
                        
                        if (cb)
                        {
                            clock.stop('Pipeline#process', reportDuration);
                            
                            cb(req, res, endpoint);
                        }
                    }
                    else
                    {
                        // Assignments with fallback to previous value
                        resultingReq      = req      || resultingReq;
                        resultingRes      = res      || resultingRes;
                        resultingTarget   = target   || resultingTarget;
                        resultingEndpoint = endpoint || resultingEndpoint;

                        if (nextStep === self.stages.length)
                        {
                            if (cb)
                            {
                                clock.stop('Pipeline#process', reportDuration);
                                
                                cb(resultingReq, resultingRes, resultingEndpoint);
                            }
                        }
                        else
                        {
                            stepSubProcessing(conf, nextStep);
                        }
                    }
                })
                .catch(function(err)
                {
                    log.error('Could not process stage "%s". %s', stage, err);
                    
                    clock.stop('Pipeline#process', reportDuration);
                    
                    cb(err, resultingRes, resultingEndpoint);
                });
            };
            
            // Pipeline config:
            var confPath = path.resolve(path.join(self.definition.PATH, 'pipeline.conf'));
            
            sjl(confPath, {}, {'silent': true}).then(stepSubProcessing);
        }
        else
        {
            if (cb)
            {
                cb(resultingReq, resultingRes, resultingTarget, resultingEndpoint);
            }
        }
    };
};

Pipeline.prototype.toString = function()
{
    return '[pipeline Pipeline] from "' + this.definition.PATH + '"';
};


module.exports.from = function(definition)
{
    var pipeline = new Pipeline();

    return pipeline.load(definition);
};
