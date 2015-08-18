
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

var listening = false;


module.exports =
{
    'name': 'track',

    'process': function(req, res, target, endpoint, next, conf, log)
    {
        log = log || console;

        URLsCounter.increment({url: req.url});
        targetsCounter.increment({target: target});
        endpointsCounter.increment({endpoint: endpoint});

        if (!listening)
        {
            var port = conf.METRICS_PORT || 9090;

            listening = true;

            client.listen(port);

            log.info('Started client service on port "%s"', port);
        }

        return next(req, res, target);
    }
};
