'use strict';

var http      = require('http');
var httpProxy = require('http-proxy');
var log       = require('./log');
var Pipeline  = require('./pipeline.js');


require('./conf.js')
.load()
.then(function(CONF)
{
    log.info('Configuration loaded from "%s"', process.env.CONF_PATH || '.');

    Pipeline.from(CONF.PIPELINE)
    .then(function(pipeline)
    {
        log.info('Pipeline loaded from "%s"', pipeline.path);

        var proxy  = httpProxy.createProxyServer({xfwd: true});

        var server = http.createServer(pipeline.process(function(req, res, endpoint)
        {
            // Check first parameter for error
            if (req instanceof Error)
            {
                log.error('Could not proxy request. Internal error. %s', req);

                res.statusCode = 404;
                res.end(req.toString());
            }
            else if (req && res && endpoint)
            {
                proxy.web(req, res, {target: endpoint}, function(err)
                {
                    log.error('Could not proxy request to URL "%s". %s', req.url, err);

                    res.statusCode = 404;
                    res.end(err.toString());
                });
            }
            else
            {
                log.error('Could not proxy request to URL "%s". Could not route it to the right target.', req.url);

                res.statusCode = 404;
                res.end();
            }
        }));

        server.listen(CONF.PROXY.PORT, function()
        {
            process.send({started: true});

            log.info('Gate proxy listening on port %s..', CONF.PROXY.PORT);
        });
    })
    .catch(function(err)
    {
        log.error('Pipeline not loaded. %s', err);
    });
});
