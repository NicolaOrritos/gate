/*global before, describe, it */
'use strict';

var assert  = require('assert');
var request = require('request');
var cp      = require('child_process');
var fs      = require('fs');


// 1. Start target fake server
var fake = cp.fork('test/fakeserver.js', {detached: true});

// 2. Start gate proxy
var proxy = cp.fork('lib/gate.js', {detached: true});

// 3. Wait services before starting tests
before(function(done)
{
    setTimeout(function()
    {
        done();
        
    }, 500);
});

// 4. Start testing
describe('"gate" proxy server', function()
{
    it('must have at least one test', function()
    {
        assert(true, 'This is a test. Ain\t it?');
    });
    
    it('must answer to my calls', function(done)
    {
        request.get('http://localhost:9999/proxy/are/you/there?', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');
            
            fs.readFile('path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/proxy/are/you/there?');
                
                // 5. Kill the previously spawn processes:
                fake.kill();
                proxy.kill();
                
                done();
            });
        });
    });
});

// 5. Cleanup files

