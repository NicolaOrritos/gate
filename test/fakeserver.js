'use strict';

var fs   = require('fs');
var http = require('http');


var server = http.createServer(function(req, res)
{
    console.log('Got request for URL %s', req.url);
    
    // Save to file so that tests can verify it:
    
    
    res.end('OK');
});

server.listen(5050, function()
{
    console.log('Fake test server listening on port %s..', 5050);
});
