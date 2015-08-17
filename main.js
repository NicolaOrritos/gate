#!/usr/bin/env node

'use strict';

var Logger   = require('bunyan');
var progenic = require('progenic');
var docopt   = require('docopt').docopt;


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


var log = new Logger(
{
    name: 'gate',

    streams:
    [
        {
            stream: process.stdout,
            level: 'debug'
        }
    ]
});

var cmd = docopt(options);

if (cmd)
{
    process.env.CONF_PATH = cmd['--conf'] || DEFAULT_CONF_DIR;

    progenic.run('gate', 'lib/gate', 1, true, log);
}
