
'use strict';


var fs   = require('fs');
var path = require('path');


function pipeFile(file, to, cb)
{
    if (file && to)
    {
        var readStream = fs.createReadStream(file);

        readStream.on('end', cb);
        readStream.on('error', cb);

        readStream.pipe(to);
    }
}

function findTarget(url)
{
    var target;

    if (url && url.slice)
    {
        target = url.slice(1);
        var ix = target.indexOf('/');

        if (ix > 0)
        {
            target = url.slice(0, 1 + ix);
        }
    }

    return target;
}


module.exports =
{
    'name': 'local',

    'process': function(req, res, target, endpoint, next, conf, log)
    {
        log = log || console;

        target = target || findTarget(req.url);

        var baseFolder = conf.TARGETS[target].FOLDER || '/var/gate.d/public';

        var subpath = req.url.replace(target, '');

        var file = path.join(baseFolder, subpath);
            file = path.resolve(file);

        log.info('Going to serve file from "%s" [target was "%s"]...', file, target);

        pipeFile(file, res, function(err)
        {
            var result = err || req;

            log.debug('Piped file with result "%s"', err || 'OK');

            next(result, res, target);
        });
    }
};
