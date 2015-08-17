
'use strict';


var P = require('bluebird');
var pathrewrite = require('pathrewrite');


function escapeRegExp(string)
{
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(find, replace, str)
{
    var result = str;
    var regex  = new RegExp(escapeRegExp(find), 'g');

    if (str.match(regex))
    {
        result = str.replace(regex, replace);
    }

    return result;
}

function apply(req, target, conf, log)
{
    return new P(function(resolve, reject)
    {
        log = log || console;

        if (req && target && conf)
        {
            log.debug('Applying rewrite rules...');

            // 1. Complex sub-paths rules
            var rules = new pathrewrite.Rules.loadMulti(conf.TARGETS[target].TRANSLATION.INGOING);

            req.url = pathrewrite.go(req.url, rules);


            // 2. Simple string replacement rules:
            rules = conf.TARGETS[target].TRANSLATION.REPLACE_RULES;

            for (var a=0; a<rules.length; a++)
            {
                if (rules[a] && rules[a].FROM)
                {
                    if (rules[a].ONLY_APPLY_TO)
                    {
                        var pos = rules[a].ONLY_APPLY_TO.replace('%', '');
                            pos = parseInt(pos, 10);

                        if (!isNaN(pos))
                        {
                            var tokens = req.url.split('/');

                            if (tokens && tokens.length && tokens[pos])
                            {
                                tokens[pos] = replaceAll(rules[a].FROM, rules[a].TO, tokens[pos]);

                                var startsWithSlash = req.url.indexOf('/') === 0;
                                var endsWithSlash   = req.url.lastIndexOf('/') === (req.url.length - 1);

                                req.url = startsWithSlash ? '/' : '';

                                // Re-unit tokens:
                                for (var b=0; b<tokens.length; b++)
                                {
                                    req.url += tokens[b] + '/';
                                }

                                if (!endsWithSlash)
                                {
                                    req.url = req.url.slice(0, -1);
                                }
                            }
                            // URLs which don't match are simply left untouched
                        }
                        // URLs which don't match are simply left untouched
                    }
                    else
                    {
                        var from = rules[a].FROM;
                        var to   = rules[a].TO || '';

                        req.url = replaceAll(from, to, req.url);
                    }
                }
            }


            return resolve([req, target]);
        }
        else
        {
            return reject(new Error('Empty request'));
        }
    });
}


module.exports =
{
    'name': 'substitution',

    'process': function(req, res, target, endpoint, next, conf, log)
    {
        log = log || console;

        apply(req, target, conf, log)
        .spread(function(req2, target2)
        {
            log.debug('Step2 calling next step (req, res, target, endpoint): %s, %s, %s, %s', req2, res, target2, endpoint);

            return next(req2, res, target2);
        });
    }
};
