#!/usr/bin/env node

'use strict';

var log     = require('./lib/log.js');
var blocked = require('blocked');
var docopt  = require('docopt').docopt;


blocked(function(ms)
{
    log.warn('Event-loop blocked for %sms', (ms | 0));
});


var DEFAULT_CONF_DIR = '.';

var options = 'Start the Gate server \n'
            + '  \n'
            + 'Usage: \n'
            + '  gate [--conf <PATH_TO_CONF_DIR>]\n'
            + '  gate -h | --help \n'
            + '  \n'
            + 'Options: \n'
            + '  --conf <PATH_TO_CONF_DIR> Load configuration from <PATH_TO_CONF_DIR> (default is "' + DEFAULT_CONF_DIR + '") \n'
            + '  -h --help                 Shows this help \n';



var cmd = docopt(options);

if (cmd)
{
    process.env.CONF_PATH = cmd['--conf'] || DEFAULT_CONF_DIR;

    require('./lib/gate');
}
