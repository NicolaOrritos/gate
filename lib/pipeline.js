'use strict';


var P            = require('bluebird');
var sjl          = require("sjl");
var path         = require('path');
var clock        = require('clck');
var utils        = require('util');
var EventEmitter = require('events').EventEmitter;
var log          = require('./log');


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
    if (fn && name && fn.apply)
    {
        return function(req, res, target, endpoint, conf, log)
        {
            return new P(function(resolve, reject)
            {
                try
                {
                    log.info('Processing stage "%s"...', name);

                    fn(req, res, target, endpoint, function(newReq, newRes, newTarget, newEndpoint)
                    {
                        resolve([newReq, newRes, newTarget, newEndpoint]);

                    }, conf, log);
                }
                catch (err)
                {
                    reject(err);
                }
            });
        };
    }
    else
    {
        throw new Error('Missing or malformed parameters when trying to promisify a stage\'s function');
    }
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

        if (definition && definition.PATH && definition.STEPS && definition.CONFIGURATION)
        {
            self.definition = definition;

            var stagesPath  = definition.PATH;

            self.path = path.resolve(stagesPath);

            if (self.path)
            {
                log.info('Loading stages from the pipeline...');

                self.stages = [];

                for (var a=0; a<definition.STEPS.length; a++)
                {
                    clock.start('Stage#load');

                    var fileName = definition.STEPS[a];

                    if (fileName.indexOf('.js') === -1)
                    {
                        fileName += '.js';
                    }

                    var file;

                    if (fileName.indexOf('$BUILTINS/') === 0)
                    {
                        fileName = fileName.replace('$BUILTINS/', '');

                        file = path.join('lib', 'builtins', fileName);
                    }
                    else
                    {
                        file = path.join(self.path, fileName);
                    }

                    if (file)
                    {
                        file = path.resolve(file);

                        log.info('Going to load stage from "%s"...', file);

                        var stage = require(file);

                        if (isValid(stage))
                        {
                            log.info('Stage "%s" loaded', stage.name);

                            stage.process = promisifyProcess(stage.process, stage.name);

                            self.stages.push(stage);
                        }
                        // else skip it
                        else
                        {
                            log.error('Could not load stage from "%s". Skipping it...', file);
                        }
                    }

                    clock.stop('Stage#load', reportDuration);
                }

                clock.stop('Pipeline#load.promise', reportDuration);

                log.debug('Resulting stages: %s', JSON.stringify(self.stages));

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

            var stepFinish = function(conf, nextStep)
            {
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
            };

            var stepSubProcessing = function(conf, nextStep)
            {
                nextStep = nextStep || 0;

                var stage = self.stages[nextStep++];

                log.info('Stage "%s" executing...', stage.name);

                // Load stage config:
                var stageConf = conf[stage.name];

                stage.process(resultingReq, resultingRes, resultingTarget, resultingEndpoint, stageConf, log)
                .spread(function(req, res, target, endpoint)
                {
                    // Check for errors on the first parameter
                    if (req instanceof Error)
                    {
                        log.error('Aborting at step "%s". %s', stage.name, req);

                        if (stageConf.ERRORS.TOLERANT)
                        {
                            stepFinish(conf, nextStep);
                        }
                        else if (cb)
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

                        stepFinish(conf, nextStep);
                    }
                })
                .catch(function(err)
                {
                    log.error('Could not process stage "%s". %s', stage.name, err);

                    clock.stop('Pipeline#process', reportDuration);

                    if (stageConf.ERRORS.TOLERANT)
                    {
                        stepFinish(conf, nextStep);
                    }
                    else
                    {
                        cb(err, resultingRes, resultingEndpoint);
                    }
                });
            };

            stepSubProcessing(self.definition.CONFIGURATION);
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


module.exports.from = function(definitionPath)
{
    return new P(function(resolve, reject)
    {
        var pipeline = new Pipeline();

        definitionPath = path.join(definitionPath, 'pipeline.conf');

        sjl(definitionPath, {}, {'silent': true})
        .then(function(definition)
        {
            definition.PATH = definitionPath;

            log.info('Going to load pipeline from "%s"...', definitionPath);

            return pipeline.load(definition);
        })
        .then(resolve)
        .catch(reject);
    });
};
