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

    'PIPELINE': 'etc/gate.d/default'
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
