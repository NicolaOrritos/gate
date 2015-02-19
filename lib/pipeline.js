'use strict';


var fs = require('fs');
var path = require('path');
var P = global.Promise || require('bluebird');
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


function Pipeline()
{
    this.stages = [];
}

utils.inherits(Pipeline, EventEmitter);

Pipeline.prototype.load = function(stagesPath)
{
    var self = this;
    
    return new P(function(resolve, reject)
    {
        self.path = stagesPath;
        
        if (self.path)
        {
            fs.readdir(self.path, function(err, files)
            {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    var jsFiles = [];
                    
                    for (var a=0; a<files.length; a++)
                    {
                        if (files[a] && files[a].slice(-3) === '.js')
                        {
                            jsFiles.push(files[a]);
                        }
                    }
                    
                    P.map(jsFiles, function(file)
                    {
                        var filePath = path.join(self.path, file);
                        
                        var stage = require(filePath);
                        
                        return stage;
                    })
                    .reduce(function(stages, stage)
                    {
                        if (stages === undefined || stages === null)
                        {
                            stages = [];
                        }
                        
                        if (isValid(stage))
                        {
                            stages.push(stage);
                        }
                        
                        return stages;
                    })
                    .then(function(stages)
                    {
                        this.stages = stages;
                        
                        resolve(this.stages);
                    })
                    .catch(reject);
                }
            });
        }
        else
        {
            reject(new Error('Empty path'));
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
            P.map(this.stages, function(stage)
            {
                log.info('Processing stage "%s"...', stage.name);

                stage.process(resultingReq, resultingRes, resultingTarget)
                .then(function(req, res, target)
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


module.exports =
{
    from: function(path)
    {
        var pipeline = new Pipeline();
        
        return pipeline.load(path);
    }
};