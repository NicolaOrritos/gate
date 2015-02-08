'use strict';


var sjl = require("sjl");
var P   = global.Promise || require('bluebird');

var defaults =
{
    "TARGET":
    {
        "HOST":   "localhost",
        "PORT":   5050,
        "SECURE": false,
        "PATH":   ""
    },
    
    "PROXY":
    {
        "PORT": 9999
    },
    
    "TRANSLATION":
    {
        "INGOING":
        [
            {
                "FROM": "pippo",
                "TO":   "paperino"
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
};

module.exports =
{
    'load': function()
    {
        return new P(function(resolve, reject)
        {
            sjl('/etc/gate.json', defaults, {'silent': true})
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


