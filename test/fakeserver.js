#!/usr/bin/env node

'use strict';

var fs   = require('fs');
var http = require('http');


var server = http.createServer(function(req, res)
{
    console.log('Got request for URL "%s"', req.url);

    if (req.url !== '/favicon.ico')
    {
        // Save to file so that tests can verify it:
        fs.writeFile('test/path.txt', req.url, function()
        {
            res.end('OK');
        });
    }
});

server.listen(5050, function()
{
    process.send({started: true});

    console.log('Fake test server listening on port %s..', 5050);
});
