'use strict';

var P           = global.Promise || require('bluebird');
var pathrewrite = require('pathrewrite');
var CONF;


require('./conf.js').load()
.then(function(conf)
{
    CONF = conf;
});


function escapeRegExp(string)
{
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(find, replace, str)
{
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function buildEndpoint(target)
{
    var endpoint;
    
    if (   target
        && CONF.TARGETS[target]
        && CONF.TARGETS[target].HOST
        && CONF.TARGETS[target].PORT)
    {
        endpoint = 'http';

        if (CONF.TARGETS[target].SECURE)
        {
            endpoint += 's';
        }

        endpoint += '://';
        endpoint += CONF.TARGETS[target].HOST;
        endpoint += ':';
        endpoint += CONF.TARGETS[target].PORT;
    }
    
    return endpoint;
}


module.exports =
{
    preprocessTarget: function(req)
    {
        return new P(function(resolve, reject)
        {
            var target;
            var endpoint;
            
            
            if (CONF.TARGETS['/'])
            {
                // 0. Root ('/') target overrides all the others:
                target = '/';
            }
            else
            {
                // 1. Find target in the URL
                target = req.url.slice(1);
                var ix   = target.indexOf('/');

                if (ix > 0)
                {
                    target = req.url.slice(0, 1 + ix);
                }
            }
            
            // 2. Build target endpoint URL
            endpoint = buildEndpoint(target);


            // 3. Modify request
            if (endpoint)
            {
                if (target !== '/')
                {
                    req.url = req.url.replace(target, '');
                }

                // 4a. Resolve promise
                return resolve([req, target, endpoint]);
            }
            else
            {
                // 4b. Reject promise
                return reject(new Error('Could not find target'));
            }
        });
    },
    
    apply: function(req, target, endpoint)
    {
        return new P(function(resolve, reject)
        {
            if (req && target && endpoint)
            {
                // 1. Complex sub-paths rules
                var rules = new pathrewrite.Rules.loadMulti(CONF.TARGETS[target].TRANSLATION.INGOING);

                req.url = pathrewrite.go(req.url, rules);
                
                
                // 2. Simple string replacement rules:
                rules = CONF.TARGETS[target].TRANSLATION.REPLACE_RULES;
                
                for (var a=0; a<rules.length; a++)
                {
                    if (rules[a] && rules[a].FROM)
                    {
                        req.url = replaceAll(rules[a].FROM, rules[a].TO, req.url);
                    }
                }
                

                return resolve([req, endpoint]);
            }
            else
            {
                return reject(new Error('Empty request'));
            }
        });
    }
};
