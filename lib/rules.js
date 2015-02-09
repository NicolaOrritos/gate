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


module.exports =
{
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
