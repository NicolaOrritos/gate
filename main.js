#!/usr/bin/env node

'use strict';

var Logger   = require('bunyan');
var progenic = require('progenic');

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

progenic.run('gate', 'lib/gate', 1, true, log);
