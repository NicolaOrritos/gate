Gate
====

# Configurable, Translating, Lightweight Reverse-Proxy


[npm-url]: https://npmjs.org/package/node-gate
[npm-image]: https://badge.fury.io/js/node-gate.svg
[daviddm-url]: https://david-dm.org/NicolaOrritos/node-gate.svg?theme=shields.io
[daviddm-image]: https://david-dm.org/NicolaOrritos/node-gate


## Introduction
_Gate_ is a micro-service offering advanced reverse-proxy capabilities, minus the configuration headaches.  
In fact setting the service up is taken care by JSON files easy to both edit and understand.

Founding concepts of _Gate_ are:
- Reverse-proxying to another service MUST be easily configurable  
  E.g. A few lines of a JSON file should be enough:
  ```JSON
  "TARGETS":
  {
      "/subpath1":
      {
          "HOST":   "localhost",
          "PORT":   5050,
          "SECURE": false
      }
  }
  ```
- Some, *useful*, string translations MAY be configured on the paths being proxied.  
  E.g. `"/myserver/mypath" => "/myserver/yourpath"`
- Configuration and paths processing MUST be handled in a _pipeline_ fashion.  
  I.e. Reverse-proxying and URL paths translation occurs in subsequent, ordered, configurable steps.

## Gate capabilities
Gate keeps it simple, but is equipped with a few useful features:
- Reverse-proxying (its core business)
- URL sub-paths translation
- Static files serving
- Simple URLs tracking


## Install

```sh
$ sudo npm install -g node-gate
```


## Configure

_(Coming soon...)_


## Run

Copy configuration files to `/etc/gate.d/` and then:

```sh
$ sudo gate
```


## License

MIT © [Nicola Orritos](nicolaorritos.github.io)
