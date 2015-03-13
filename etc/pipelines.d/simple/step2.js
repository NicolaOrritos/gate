
var P = require('bluebird');
var pathrewrite = require('pathrewrite');
var log = require('../../../lib/log');


function apply(req, target, conf)
{
    return new P(function(resolve, reject)
    {
        if (req && target && conf)
        {
            log.debug('Applying rewrite rules...');
            
            var rules = new pathrewrite.Rules.loadMulti(conf.TARGETS[target]);

            req.url = pathrewrite.go(req.url, rules);


            return resolve([req, target]);
        }
        else
        {
            return reject(new Error('Empty request'));
        }
    });
}


module.exports =
{
    'name': 'step2',
    
    'process': function(req, res, target, endpoint, next, conf)
    {
        apply(req, target, conf)
        .spread(function(req2, target2)
        {
            log.debug('Step2 calling next step (req, res, target, endpoint): %s, %s, %s, %s', req2, res, target2, endpoint);
            
            return next(req2, res, target2);
        });
    }
};
