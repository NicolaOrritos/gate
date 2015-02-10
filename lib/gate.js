'use strict';

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
    var proxy  = httpProxy.createProxyServer({xfwd: true});

    var server = http.createServer(function(req, res)
    {
        rules.preprocessTarget(req)
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
            },
            function(err)
            {
                log.error('Could not proxy request to URL "%s". %s', req.url, err);
                
                res.statusCode = 404;
                res.end(err.toString());
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
        log.info('Gate proxy listening on port %s..', CONF.PROXY.PORT);
    });
});

