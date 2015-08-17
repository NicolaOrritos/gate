
'use strict';


var P = require('bluebird');


// Just shut up JSHint
function NOT_USED()
{}

function buildEndpoint(target, conf, log)
{
    log = log || console;

    var endpoint;

    log.debug('Going to build an endpoint from target "%s"...', target);

    if (   target
        && conf
        && conf.TARGETS[target]
        && conf.TARGETS[target].HOST
        && conf.TARGETS[target].PORT)
    {
        endpoint = 'http';

        if (conf.TARGETS[target].SECURE)
        {
            endpoint += 's';
        }

        endpoint += '://';
        endpoint += conf.TARGETS[target].HOST;
        endpoint += ':';
        endpoint += conf.TARGETS[target].PORT;
    }

    log.debug('Resulting endpoint is "%s"', endpoint);

    return endpoint;
}

function preprocessTarget(req, conf, log)
{
    return new P(function(resolve, reject)
    {
        var target;
        var endpoint;


        if (conf.TARGETS['/'])
        {
            // 0. Root ('/') target overrides all the others:
            target = '/';

            log.debug('Found root-path selection. Overriding everything else...');
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
        endpoint = buildEndpoint(target, conf, log);


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
            return reject(new Error('Could not find endpoint'));
        }
    });
}


module.exports =
{
    'name': 'redirection',

    'process': function(req, res, target, endpoint, next, conf, log)
    {
        NOT_USED(endpoint);

        preprocessTarget(req, conf, log)
        .spread(function(req2, target2, endpoint2)
        {
            return next(req2, res, target2, endpoint2);
        })
        .catch(function(err)
        {
            return next(err);
        });
    }
};
