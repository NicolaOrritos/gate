'use strict';

var P           = global.Promise || require('bluebird');
var pathrewrite = require('pathrewrite');
var CONF;


require('./conf.js').load()
.then(function(conf)
{
    CONF = conf;
});


module.exports =
{
    apply: function(req)
    {
        return new P(function(resolve, reject)
        {
            if (req)
            {
                // 1. Complex sub-paths rules
                var rules = new pathrewrite.Rules.loadMulti(CONF.TRANSLATION.INGOING);

                req.url = pathrewrite.go(req.url, rules);
                
                
                // 2. Simple string replacement rules:
                rules = CONF.TRANSLATION.REPLACE_RULES;
                
                for (var a=0; a<rules.length; a++)
                {
                    if (rules[a] && rules[a].FROM)
                    {
                        req.url = req.url.replace(rules[a].FROM, rules[a].TO);
                    }
                }
                

                resolve(req);
            }
            else
            {
                reject(new Error('Empty request'));
            }
        });
    }
};
