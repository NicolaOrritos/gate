'use strict';

var http      = require('http');
var httpProxy = require('http-proxy');
var rules     = require('./rules.js');


require('./conf.js').load()
.then(function(CONF)
{
    var targetEndpoint = 'http';

    if (CONF.TARGET.SECURE)
    {
        targetEndpoint += 's';
    }

    targetEndpoint += '://';
    targetEndpoint += CONF.TARGET.HOST;
    targetEndpoint += ':';
    targetEndpoint += CONF.TARGET.PORT;


    var proxy = httpProxy.createProxyServer({xfwd: true});


    var server = http.createServer(function(req, res)
    {
        rules.apply(req)
        .then(function(newReq)
        {
            proxy.web(newReq, res,
            {
                target: targetEndpoint
            });
        })
        .catch(function(err)
        {
            console.log('Could not proxy request. %s', err);
        });
    });

    server.listen(CONF.PROXY.PORT, function()
    {
        console.log('Gate proxy listening on port %s..', CONF.PROXY.PORT);
    });
});

