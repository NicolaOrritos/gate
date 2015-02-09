'use strict';

var P         = global.Promise || require('bluebird');
var http      = require('http');
var httpProxy = require('http-proxy');
var Logger    = require('bunyan');
var rules     = require('./rules.js');

var log = new Logger(
{
    name: 'gate',

    streams:
    [
        {
            stream: process.stdout,
            level: 'debug'
        }
    ]
});


require('./conf.js').load()
.then(function(CONF)
{
    var preprocessTarget = function(req)
    {
        return new P(function(resolve, reject)
        {
            // A. Build target endpoint URL
            var target = req.url.slice(1);
            var ix   = target.indexOf('/');
            
            if (ix > 0)
            {
                target = req.url.slice(0, 1 + ix);
            }
            
            
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
                
                console.log('endpoint = %s', endpoint);
            }

            
            // B. Modify request
            if (endpoint)
            {
                req.url = req.url.replace(target, '');
                
                // C. Resolve promise
                return resolve([req, target, endpoint]);
            }
            else
            {
                return reject(new Error('Could not find target'));
            }
        });
    };
    
    
    var proxy  = httpProxy.createProxyServer({xfwd: true});

    var server = http.createServer(function(req, res)
    {
        preprocessTarget(req)
        .spread(function(newReq, target, endpoint)
        {
            log.debug('Target:   %s', target);
            log.debug('Endpoint: %s', endpoint);
            
            return rules.apply(newReq, target, endpoint);
        })
        .spread(function(translatedReq, translatedEndpoint)
        {
            log.debug('%s  =>  %s', req.url, translatedReq.url);
            
            proxy.web(translatedReq, res,
            {
                target: translatedEndpoint
            });
        })
        .catch(function(err)
        {
            log.error('Could not proxy request to URL "%s". %s', req.url, err);
            
            res.statusCode = 404;
            res.end(err.toString());
        });
    });

    server.listen(CONF.PROXY.PORT, function()
    {
        console.log('Gate proxy listening on port %s..', CONF.PROXY.PORT);
    });
});

