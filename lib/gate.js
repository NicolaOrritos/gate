'use strict';

var P         = global.Promise || require('bluebird');
var http      = require('http');
var httpProxy = require('http-proxy');
var rules     = require('./rules.js');


require('./conf.js').load()
.then(function(CONF)
{
    var preprocessTarget = function(req)
    {
        return new P(function(resolve, reject)
        {
            // A. Build target URL
            var path = req.url.slice(1);
            var ix   = path.indexOf('/');
            
            if (ix > 0)
            {
                path = req.url.slice(0, 1 + ix);
            }
            
            
            var target;

            if (   path
                && CONF.TARGETS[path]
                && CONF.TARGETS[path].HOST
                && CONF.TARGETS[path].PORT)
            {
                target = 'http';

                if (CONF.TARGETS[path].SECURE)
                {
                    target += 's';
                }

                target += '://';
                target += CONF.TARGETS[path].HOST;
                target += ':';
                target += CONF.TARGETS[path].PORT;
                
                console.log('target = %s', target);
            }

            
            // B. Modify request
            if (target)
            {
                req.url = req.url.replace(path, '');
                
                // C. Resolve promise
                return resolve([req, target]);
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
        .spread(function(newReq, target)
        {
            return rules.apply(newReq, target);
        })
        .spread(function(translatedReq, translatedTarget)
        {
            proxy.web(translatedReq, res,
            {
                target: translatedTarget
            });
        })
        .catch(function(err)
        {
            console.log('Could not proxy request to URL "%s". %s', req.url, err);
            
            res.statusCode = 404;
            res.end(err.toString());
        });
    });

    server.listen(CONF.PROXY.PORT, function()
    {
        console.log('Gate proxy listening on port %s..', CONF.PROXY.PORT);
    });
});

