'use strict';


var path = require('path');
var P = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var utils = require('util');
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

function promisifyProcess(fn)
{
    return function(req, res, target)
    {
        return new P(function(resolve, reject)
        {
            try
            {
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
                            
                            stage.process = promisifyProcess(stage.process);
                            
                            self.stages.push(stage);
                            
                            resolve(self.stages);
                        }
                        // else skip it
                    }
                }
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
    return function(req, res)
    {
        var resultingTarget;
        var resultingReq = req;
        var resultingRes = res;
        
        if (this.stages)
        {
            log.info('Processing %s stage(s)...', this.stages.length);
            
            P.map(this.stages, function(stage)
            {
                log.info('Stage "%s" executing...', stage.name);

                stage.process(resultingReq, resultingRes, resultingTarget)
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


module.exports.from = function(definition)
{
    var pipeline = new Pipeline();

    module.exports.process = pipeline.process;

    return pipeline.load(definition);
};
