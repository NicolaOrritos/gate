/* global before, after, describe, it */
'use strict';

var assert  = require('assert');
var request = require('request');
var cp      = require('child_process');
var fs      = require('fs');


var fake;
var proxy;


describe('"gate" proxy server, with just the "redirection" stage loaded,', function()
{
    before(function(done)
    {
        // 0. For these particular tests we should enable a particular configuration:
        fs.renameSync('./etc/gate.d/default/pipeline.conf', './etc/gate.d/default/pipeline.conf.allstages');
        fs.renameSync('./etc/gate.d/default/pipeline.conf.redirection', './etc/gate.d/default/pipeline.conf');

        // 1. Start target fake server
        fake = cp.fork('test/fakeserver.js', {silent: true})
        .once('message', function(msg)
        {
            if (msg.started)
            {
                // 2. Start gate proxy
                proxy = cp.fork('main.js', ['--conf', './etc/gate.d/'], {silent: true})
                .once('message', function(msg)
                {
                    if (msg.started)
                    {
                        // 3. Wait services to be up and running before starting tests
                        done();
                    }
                    else
                    {
                        throw new Error('Could not start gate server');
                    }
                });
            }
            else
            {
                throw new Error('Could not start fake server');
            }
        });
    });


    // 4. Start testing
    it('must redirect requests', function(done)
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


////////////////////////////////////////////////////////////////////////////////////////////

    it('must switch configuration to root-path', function(done)
    {
        proxy.once('close', function()
        {
            fs.renameSync('./etc/gate.d/default/pipeline.conf', './etc/gate.d/default/pipeline.conf.norootpath.redirection');
            fs.renameSync('./etc/gate.d/default/pipeline.conf.rootpath.redirection', './etc/gate.d/default/pipeline.conf');

            proxy = cp.fork('main.js', ['--conf', './etc/gate.d/'], {silent: true});

            setTimeout(function()
            {
                done();

            }, 1000);
        });

        proxy.kill();
    });


    it('must answer to my calls [root-path]', function(done)
    {
        request.get('http://localhost:9999/subpath1/proxy/are/you/there?', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');

            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/subpath1/proxy/are/you/there?');

                done();
            });
        });
    });

    it('cannot reply with 404 to non existent paths [root-path]: we don\'t have subaths here', function(done)
    {
        request.get('http://localhost:9999/I/dont/exist', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode !== 404);
            assert(res.statusCode === 200);

            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/I/dont/exist');

                done();
            });
        });
    });

    it('must re-enable old configuration [root-path]', function(done)
    {
        // 6. Re-enable the old configuration:
        fs.renameSync('./etc/gate.d/default/pipeline.conf', './etc/gate.d/default/pipeline.conf.rootpath.redirection');
        fs.renameSync('./etc/gate.d/default/pipeline.conf.norootpath.redirection', './etc/gate.d/default/pipeline.conf');

        done();
    });


    // 7. Kill the previously spawn processes and revert configuration
    after(function(done)
    {
        fake.once('close', function()
        {
            proxy.once('close', function()
            {
                fs.renameSync('./etc/gate.d/default/pipeline.conf', './etc/gate.d/default/pipeline.conf.redirection');
                fs.renameSync('./etc/gate.d/default/pipeline.conf.allstages', './etc/gate.d/default/pipeline.conf');

                done();
            });

            proxy.kill();
        });

        fake.kill();
    });
});


// "Substitution" stage doesn't work on its own, it MUST always follow a redirection stage
describe('"gate" proxy server, with "redirection" + "substitution" stages,', function()
{
    before(function(done)
    {
        // 0. For these particular tests we should enable a particular configuration:
        fs.renameSync('./etc/gate.d/default/pipeline.conf', './etc/gate.d/default/pipeline.conf.allstages');
        fs.renameSync('./etc/gate.d/default/pipeline.conf.substitution', './etc/gate.d/default/pipeline.conf');

        // 1. Start target fake server
        fake = cp.fork('test/fakeserver.js', {silent: true})
        .once('message', function(msg)
        {
            if (msg.started)
            {
                // 2. Start gate proxy
                proxy = cp.fork('main.js', ['--conf', './etc/gate.d/'], {silent: true})
                .once('message', function(msg)
                {
                    if (msg.started)
                    {
                        // 3. Wait services to be up and running before starting tests
                        done();
                    }
                    else
                    {
                        throw new Error('Could not start gate server');
                    }
                });
            }
            else
            {
                throw new Error('Could not start fake server');
            }
        });
    });


    it('must substitute characters in paths', function(done)
    {
        request.get('http://localhost:9999/subpath1/firstParam/points.must.become.underscores/', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');

            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/firstParam/points_must_become_underscores/');

                done();
            });
        });
    });

    it('must substitute subpaths, depending on the rules, and characters too', function(done)
    {
        request.get('http://localhost:9999/subpath1/firstParam/points...to...underscores/subpathXYZ', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');

            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/firstParam/points___to___underscores/ZYXsubpath');

                done();
            });
        });
    });

    it('must NOT substitute subpaths and characters when the clause "ONLY_APPLY_TO" states so', function(done)
    {
        request.get('http://localhost:9999/subpath1/points...to...underscores/subpathXYZ', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');

            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/points...to...underscores/ZYXsubpath');

                done();
            });
        });
    });


////////////////////////////////////////////////////////////////////////////////////////////

    it('must switch configuration to root-path', function(done)
    {
        fake.kill();
        proxy.kill();

        // 0. For these particular tests we should enable a particular configuration:
        fs.renameSync('./etc/gate.d/default/pipeline.conf', './etc/gate.d/default/pipeline.conf.norootpath.substitution');
        fs.renameSync('./etc/gate.d/default/pipeline.conf.rootpath.substitution', './etc/gate.d/default/pipeline.conf');

        // 1. Start target fake server
        fake = cp.fork('test/fakeserver.js', {silent: true})
        .once('message', function(msg)
        {
            if (msg.started)
            {
                // 2. Start gate proxy
                proxy = cp.fork('main.js', ['--conf', './etc/gate.d/'], {silent: true})
                .once('message', function(msg)
                {
                    if (msg.started)
                    {
                        // 3. Wait services to be up and running before starting tests
                        done();
                    }
                    else
                    {
                        throw new Error('Could not start gate server');
                    }
                });
            }
            else
            {
                throw new Error('Could not start fake server');
            }
        });
    });


    it('must substitute characters in paths [root-path]', function(done)
    {
        request.get('http://localhost:9999/subpath1/subpath2/points.must.become.underscores/', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');

            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/subpath1/subpath2/points_must_become_underscores/');

                done();
            });
        });
    });

    it('must substitute subpaths, depending on the rules, and characters too [root-path]', function(done)
    {
        request.get('http://localhost:9999/subpath1/subpath2/points...to...underscores/subpathXYZ', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');

            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/subpath1/subpath2/points___to___underscores/ZYXsubpath');

                done();
            });
        });
    });

    it('must NOT substitute subpaths and characters when the clause "ONLY_APPLY_TO" states so [root-path]', function(done)
    {
        request.get('http://localhost:9999/points...to...underscores/subpathXYZ', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');

            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/points...to...underscores/ZYXsubpath');

                done();
            });
        });
    });

    it('must re-enable old configuration [root-path]', function(done)
    {
        // 6. Re-enable the old configuration:
        fs.renameSync('./etc/gate.d/default/pipeline.conf', './etc/gate.d/default/pipeline.conf.rootpath.substitution');
        fs.renameSync('./etc/gate.d/default/pipeline.conf.norootpath.substitution', './etc/gate.d/default/pipeline.conf');

        done();
    });


    // 7. Kill the previously spawn processes and revert configuration
    after(function(done)
    {
        fake.once('close', function()
        {
            proxy.once('close', function()
            {
                fs.renameSync('./etc/gate.d/default/pipeline.conf', './etc/gate.d/default/pipeline.conf.substitution');
                fs.renameSync('./etc/gate.d/default/pipeline.conf.allstages', './etc/gate.d/default/pipeline.conf');

                done();
            });

            proxy.kill();
        });

        fake.kill();
    });
});


describe('"gate" proxy server, with just the "local" stage loaded,', function()
{
    before(function(done)
    {
        // 0. For these particular tests we should enable a particular configuration:
        fs.renameSync('./etc/gate.d/default/pipeline.conf', './etc/gate.d/default/pipeline.conf.allstages');
        fs.renameSync('./etc/gate.d/default/pipeline.conf.local', './etc/gate.d/default/pipeline.conf');

        // 1. Start target fake server
        fake = cp.fork('test/fakeserver.js', {silent: true})
        .once('message', function(msg)
        {
            if (msg.started)
            {
                // 2. Start gate proxy
                proxy = cp.fork('main.js', ['--conf', './etc/gate.d/'], {silent: true})
                .once('message', function(msg)
                {
                    if (msg.started)
                    {
                        // 3. Wait services to be up and running before starting tests
                        done();
                    }
                    else
                    {
                        throw new Error('Could not start gate server');
                    }
                });
            }
            else
            {
                throw new Error('Could not start fake server');
            }
        });
    });


    it('must get files from local filesystem and return their content', function(done)
    {
        request.get('http://localhost:9999/subpath2/test_resource.txt', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK\n');

            done();
        });
    });

    it('must return 404 when the files aren\'t found', function(done)
    {
        request.get('http://localhost:9999/subpath2/I_m_not_here.txt', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 404);

            done();
        });
    });


    // 7. Kill the previously spawn processes and revert configuration
    after(function(done)
    {
        fake.once('close', function()
        {
            proxy.once('close', function()
            {
                fs.renameSync('./etc/gate.d/default/pipeline.conf', './etc/gate.d/default/pipeline.conf.local');
                fs.renameSync('./etc/gate.d/default/pipeline.conf.allstages', './etc/gate.d/default/pipeline.conf');

                done();
            });

            proxy.kill();
        });

        fake.kill();
    });
});


describe('"gate" proxy server, with just the "track" stage loaded,', function()
{
    before(function(done)
    {
        // 0. For these particular tests we should enable a particular configuration:
        fs.renameSync('./etc/gate.d/default/pipeline.conf', './etc/gate.d/default/pipeline.conf.allstages');
        fs.renameSync('./etc/gate.d/default/pipeline.conf.track', './etc/gate.d/default/pipeline.conf');

        // 1. Start target fake server
        fake = cp.fork('test/fakeserver.js', {silent: true})
        .once('message', function(msg)
        {
            if (msg.started)
            {
                // 2. Start gate proxy
                proxy = cp.fork('main.js', ['--conf', './etc/gate.d/'], {silent: true})
                .once('message', function(msg)
                {
                    if (msg.started)
                    {
                        // 3. Wait services to be up and running before starting tests
                        done();
                    }
                    else
                    {
                        throw new Error('Could not start gate server');
                    }
                });
            }
            else
            {
                throw new Error('Could not start fake server');
            }
        });
    });


    var subpath = '/subpath2/I_m_not_here';

    it('must return 404 when paths aren\'t found', function(done)
    {
        request.get('http://localhost:9999' + subpath, function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 404);

            done();
        });
    });

    it('requests must appear at the "metrics" URL', function(done)
    {
        var sjl = require('sjl');

        sjl('etc/gate.d/default/pipeline.conf', {}, {silent: true})
        .then(function(conf)
        {
            if (conf && conf.CONFIGURATION && conf.CONFIGURATION.track && conf.CONFIGURATION.track.METRICS_PORT)
            {
                var port = conf.CONFIGURATION.track.METRICS_PORT;

                request.get('http://localhost:' + port + '/metrics', function(err, res)
                {
                    assert(err == null, 'There was an error connecting to the metrics endpoint. ' + err);
                    assert(res.statusCode === 200, 'Status code was: ' + res.statusCode);
                    assert(res.body);

                    assert(res.body.indexOf('requests_URLs{url="' + subpath + '"} 1') !== -1);
                    assert(res.body.indexOf('requests_targets{target="undefined"} 1') !== -1);
                    assert(res.body.indexOf('requests_endpoints{endpoint="undefined"} 1') !== -1);

                    done();
                });
            }
            else
            {
                throw new Error('Could not load configuration');
            }
        });
    });


    // 7. Kill the previously spawn processes and revert configuration
    after(function(done)
    {
        fake.once('close', function()
        {
            proxy.once('close', function()
            {
                fs.renameSync('./etc/gate.d/default/pipeline.conf', './etc/gate.d/default/pipeline.conf.track');
                fs.renameSync('./etc/gate.d/default/pipeline.conf.allstages', './etc/gate.d/default/pipeline.conf');

                done();
            });

            proxy.kill();
        });

        fake.kill();
    });
});



describe('"gate" proxy server, with all stages loaded,', function()
{
    before(function(done)
    {
        // 1. Start target fake server
        fake = cp.fork('test/fakeserver.js', {silent: true})
        .once('message', function(msg)
        {
            if (msg.started)
            {
                // 2. Start gate proxy
                proxy = cp.fork('main.js', ['--conf', './etc/gate.d/'], {silent: true})
                .once('message', function(msg)
                {
                    if (msg.started)
                    {
                        // 3. Wait services to be up and running before starting tests
                        done();
                    }
                    else
                    {
                        throw new Error('Could not start gate server');
                    }
                });
            }
            else
            {
                throw new Error('Could not start fake server');
            }
        });
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
        request.get('http://localhost:9999/subpath1/firstParam/points.must.become.underscores/', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');

            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/firstParam/points_must_become_underscores/');

                done();
            });
        });
    });

    it('must substitute subpaths, depending on the rules, and characters too', function(done)
    {
        request.get('http://localhost:9999/subpath1/firstParam/points...to...underscores/subpathXYZ', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');

            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/firstParam/points___to___underscores/ZYXsubpath');

                done();
            });
        });
    });

    it('must NOT substitute subpaths and characters when the clause "ONLY_APPLY_TO" states so', function(done)
    {
        request.get('http://localhost:9999/subpath1/points...to...underscores/subpathXYZ', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');

            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/points...to...underscores/ZYXsubpath');

                done();
            });
        });
    });


////////////////////////////////////////////////////////////////////////////////////////////

    it('must switch configuration to root-path', function(done)
    {
        fake.kill();
        proxy.kill();

        // 0. For these particular tests we should enable a particular configuration:
        fs.renameSync('./etc/gate.d/default/pipeline.conf', './etc/gate.d/default/pipeline.conf.norootpath');
        fs.renameSync('./etc/gate.d/default/pipeline.conf.rootpath', './etc/gate.d/default/pipeline.conf');

        // 1. Start target fake server
        fake = cp.fork('test/fakeserver.js', {silent: true})
        .once('message', function(msg)
        {
            if (msg.started)
            {
                // 2. Start gate proxy
                proxy = cp.fork('main.js', ['--conf', './etc/gate.d/'], {silent: true})
                .once('message', function(msg)
                {
                    if (msg.started)
                    {
                        // 3. Wait services to be up and running before starting tests
                        done();
                    }
                    else
                    {
                        throw new Error('Could not start gate server');
                    }
                });
            }
            else
            {
                throw new Error('Could not start fake server');
            }
        });
    });


    it('must answer to my calls [root-path]', function(done)
    {
        request.get('http://localhost:9999/subpath1/proxy/are/you/there?', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');

            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/subpath1/proxy/are/you/there?');

                done();
            });
        });
    });

    it('cannot reply with 404 to non existent paths [root-path]: we don\'t have subaths here', function(done)
    {
        request.get('http://localhost:9999/I/dont/exist', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode !== 404);
            assert(res.statusCode === 200);

            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/I/dont/exist');

                done();
            });
        });
    });

    it('must substitute characters in paths [root-path]', function(done)
    {
        request.get('http://localhost:9999/subpath1/subpath2/points.must.become.underscores/', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');

            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/subpath1/subpath2/points_must_become_underscores/');

                done();
            });
        });
    });

    it('must substitute subpaths, depending on the rules, and characters too [root-path]', function(done)
    {
        request.get('http://localhost:9999/subpath1/subpath2/points...to...underscores/subpathXYZ', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');

            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/subpath1/subpath2/points___to___underscores/ZYXsubpath');

                done();
            });
        });
    });

    it('must NOT substitute subpaths and characters when the clause "ONLY_APPLY_TO" states so [root-path]', function(done)
    {
        request.get('http://localhost:9999/points...to...underscores/subpathXYZ', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 200);
            assert(res.body === 'OK');

            fs.readFile('test/path.txt', {encoding: 'utf8'}, function(err2, data)
            {
                assert(err2 == null, 'There was an error veryfing proxy\'s work. ' + err2);
                assert(data === '/points...to...underscores/ZYXsubpath');

                done();
            });
        });
    });

    it('must re-enable old configuration [root-path]', function(done)
    {
        fake.kill();
        proxy.kill();

        // 6. Re-enable the old configuration:
        fs.renameSync('./etc/gate.d/default/pipeline.conf', './etc/gate.d/default/pipeline.conf.rootpath');
        fs.renameSync('./etc/gate.d/default/pipeline.conf.norootpath', './etc/gate.d/default/pipeline.conf');

        done();
    });


////////////////////////////////////////////////////////////////////////////////////////////

    it('must switch configuration to root-path', function(done)
    {
        // 1. DO NOT start target fake server

        // 2. Start gate proxy
        proxy = cp.fork('main.js', ['--conf', './etc/gate.d/'], {silent: true});

        // 3. Wait services before starting tests
        setTimeout(function()
        {
            done();

        }, 1000);
    });


    it('must answer to my calls with a 404', function(done)
    {
        request.get('http://localhost:9999/subpath1/proxy/are/you/there?', function(err, res)
        {
            assert(err == null, 'There was an error connecting to the proxy. ' + err);
            assert(res.statusCode === 404);

            request.get('http://localhost:9999/', function(err, res)
            {
                assert(err == null, 'There was an error connecting to the proxy. ' + err);
                assert(res.statusCode === 404);

                done();
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
});
