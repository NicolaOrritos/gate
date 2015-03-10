'use strict';


var path = require('path');
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
    return function(req, res, target)
    {
        return new P(function(resolve, reject)
        {
            try
            {
                log.info('Processing stage "%s"...', name);
                
                fn(req, res, target, function(newReq, newRes, newTarget)
                {
                    resolve([newReq, newRes, newTarget]);
                });
            }
            catch (err)
            {
                reject(err);
            }
        });
    };
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
                
                resolve(self);
            }
            else
            {
                reject(new Error('Empty path'));
            }
        }
        else
        {
            reject(new Error('Empty definition'));
        }
    });
};

Pipeline.prototype.process = function(cb)
{
    var self = this;
    
    return function(req, res)
    {
        log.info('Going to process request for URL "%s" [self: %s]...', req.url, self);
        
        var resultingTarget;
        var resultingReq = req;
        var resultingRes = res;
        
        if (self.stages)
        {
            log.info('Processing %s stage(s)...', self.stages.length);
            
            // Pipeline config:
            var confPath = path.resolve(path.join(self.definition.PATH, 'pipeline.conf'));
            
            sjl(confPath, {}, {'silent': true})
            .then(function(conf)
            {
                P.map(self.stages, function(stage)
                {
                    log.info('Stage "%s" executing...', stage.name);

                    // Load stage config:
                    var stageConf = conf[stage.name];

                    stage.process(resultingReq, resultingRes, resultingTarget, stageConf)
                    .spread(function(req, res, target)
                    {
                        resultingReq = req;
                        resultingRes = res;
                        resultingTarget = target;

                        log.debug('Done');
                    })
                    .catch(function(err)
                    {
                        log.error('Could not process stage "%s". %s', stage, err);
                    });
                })
                .then(function()
                {
                    if (cb)
                    {
                        cb(resultingReq, resultingRes, resultingTarget);
                    }
                });
            });
        }
        else
        {
            if (cb)
            {
                cb(resultingReq, resultingRes, resultingTarget);
            }
        }
    };
};

Pipeline.prototype.toString = function()
{
    return '[pipeline Pipeline]';
};


module.exports.from = function(definition)
{
    var pipeline = new Pipeline();

    return pipeline.load(definition);
};
