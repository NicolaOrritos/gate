/*global before, after, describe, it */
'use strict';

var assert  = require('assert');
var request = require('request');
var cp      = require('child_process');
var fs      = require('fs');


var fake;
var proxy;


before(function(done)
{
    // 1. Start target fake server
    fake = cp.fork('test/fakeserver.js', {detached: true});

    // 2. Start gate proxy
    proxy = cp.fork('lib/gate.js', {detached: true});

    // 3. Wait services before starting tests
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
        request.get('http://localhost:9999/subpath1/proxy/are/you/there?', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');
            
            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/proxy/are/you/there?');
                
                done();
            });
        });
    });
    
    it('must reply with 404 to non existent paths', function(done)
    {
        request.get('http://localhost:9999/I/dont/exist', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 404);
            
            done();
        });
    });
    
    it('must substitute characters in paths', function(done)
    {
        request.get('http://localhost:9999/subpath1/points.must.become.underscores/', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');
            
            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/points_must_become_underscores/');
                
                done();
            });
        });
    });
    
    it('must substitute subpaths, depending on the rules, and characters too', function(done)
    {
        request.get('http://localhost:9999/subpath1/points...to...underscores/subpathXYZ', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');
            
            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/points___to___underscores/ZYXsubpath');
                
                done();
            });
        });
    });
});


// 5. Kill the previously spawn processes:
after(function(done)
{
    fake.kill();
    proxy.kill();
    
    done();
});

