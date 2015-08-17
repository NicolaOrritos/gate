
'use strict';


var Prometheus = require('prometheus-client');


var client = new Prometheus();

var URLsCounter = client.newCounter(
{
    namespace:  'requests',
    name:       'URLs',
    help:       'The number of requests received, with their external URL'
});

var targetsCounter = client.newCounter(
{
    namespace:  'requests',
    name:       'targets',
    help:       'The number of requests received, with their resulting target'
});

var endpointsCounter = client.newCounter(
{
    namespace:  'requests',
    name:       'endpoints',
    help:       'The number of requests received, with their resulting endpoint'
});


module.exports =
{
    'name': 'track',

    'process': function(req, res, target, endpoint, next, conf, log)
    {
        log = log || console;

        URLsCounter.increment({url: req.url});
        targetsCounter.increment({target: target});
        endpointsCounter.increment({endpoint: endpoint});

        return next(req, res, target);
    }
};
