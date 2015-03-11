'use strict';


var sjl = require("sjl");
var P   = require('bluebird');

var defaults =
{
    "PROXY":
    {
        "PORT": 9999
    },
    
    "PIPELINE":
    {
        "PATH": "etc/pipelines.d/default",
        "STEPS":
        [
            "step1",
            "step2"
        ]
    }
};

module.exports =
{
    'load': function()
    {
        return new P(function(resolve, reject)
        {
            sjl('/etc/gate.conf', defaults, {'silent': true})
            .then(function(conf)
            {
                if (conf)
                {
                    resolve(conf);
                }
                else
                {
                    reject(new Error('Could not load configuration'));
                }
            });
        });
    }
};


