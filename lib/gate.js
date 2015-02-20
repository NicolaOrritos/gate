'use strict';

var http      = require('http');
var httpProxy = require('http-proxy');
var log       = require('./log');
var pipeline  = require('./pipeline.js');


require('./conf.js')
.load()
.then(function(CONF)
{
    pipeline.from(CONF.PIPELINE_PATH)
    .then(function()
    {
        log.info('Pipeline loaded from "%s"', CONF.PIPELINE_PATH);
        
        var proxy  = httpProxy.createProxyServer({xfwd: true});

        var server = http.createServer(pipeline.process(function(req, res, target)
        {
            if (req && res && target)
            {
                proxy.web(req, res, {target: target}, function(err)
                {
                    log.error('Could not proxy request to URL "%s". %s', req.url, err);

                    res.statusCode = 404;
                    res.end(err.toString());
                });
            }
            else
            {
                log.error('Could not proxy request to URL "%s". Internal error.', req.url);

                res.statusCode = 500;
                res.end();
            }
        }));
        
        server.listen(CONF.PROXY.PORT, function()
        {
            log.info('Gate proxy listening on port %s..', CONF.PROXY.PORT);
        });
    })
    .catch(function(err)
    {
        log.error('Pipeline not loaded. %s', err);
    });
});

