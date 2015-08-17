'use strict';


var sjl  = require('sjl');
var path = require('path');
var P    = require('bluebird');

var defaults =
{
    'PROXY':
    {
        'PORT': 9999
    },

    'PIPELINE':
    {
        'PATH': 'etc/gate.d/default',
        'STEPS':
        [
            'redirection',
            'substitution'
        ]
    }
};

var confPath = process.env.CONF_PATH || '.';
    confPath = path.join(confPath, 'gate.json');

module.exports =
{
    load: function()
    {
        return new P(function(resolve, reject)
        {
            sjl(confPath, defaults, {'silent': true})
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
