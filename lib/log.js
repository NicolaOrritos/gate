'use strict';

var Logger = require('bunyan');


module.exports = new Logger(
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
