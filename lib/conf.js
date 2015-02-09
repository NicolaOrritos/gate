'use strict';


var sjl = require("sjl");
var P   = global.Promise || require('bluebird');

var defaults =
{
    "PROXY":
    {
        "PORT": 9999
    },
    
    "TARGETS":
    {
        "/subpath1":
        {
            "HOST":   "localhost",
            "PORT":   5050,
            "SECURE": false,
            "TRANSLATION":
            {
                "INGOING":
                [
                    {
                        "FROM": "subpathXYZ",
                        "TO":   "ZYXsubpath"
                    }
                ],

                "OUTGOING":
                [],

                "REPLACE_RULES":
                [
                    {
                        "FROM": ".",
                        "TO":   "_"
                    }
                ]
            }
        }
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


