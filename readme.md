<h1 align="center">
  <br>
  <img width="137" src="logo.png" alt="interstice">
  <br>
  <br>
  <br>
</h1>

> Simple NodeJS Icecast/SHOUTcast stream recorder

[![Build Status](https://travis-ci.org/atask/interstice.svg?branch=master)](https://travis-ci.org/atask/interstice)


## Install

```
$ npm install interstice
```

**NOTE:** Interstice will work only with Node.js 9.4 or newer.


## Usage

```js
const Interstice = require('interstice')
const interstice = new Interstice({ output: './my-recordings' })

interstice.on('song:complete', song => {
  console.log(`Successfully saved ${song.title}`)
})

interstice.start('http://www.example.com')
```


## API

### interstice = new Interstice([options])

##### options

Type: `Object`

###### output

Type: `string`

Output path to place recordings into.

###### agent

Type: `Object`

HTTP agent used for connecting, same as the [`agent` option](https://nodejs.org/api/http.html#http_http_request_url_options_callback) for `http.request`

###### timeout

Type: `number`

Milliseconds until connection timeout (0 will disable).

#### interstice.start(url)

Start recording from the given Icecast/SHOUTcast stream url. Returns instance for chain calling.

##### url

Type: `string`

#### interstice.stop()

Stops current recording.

#### interstice.on('connection', () => { ... })

Register to the `connection` event, fired once a connection to the stream is established.

#### interstice.on('song:start', song => { ... })

Register to the `song:start` event, fired once a song recording is started.

#### interstice.on('song:complete', song => { ... })

Register to the `song:complete` event, fired once a song recording is completed.

#### interstice.on('stop', () => { ... })

Register to the `stop` event, fired once the recording successfully stopped.

#### interstice.on('error', err => { ... })

Register to the `error` event, fired when an error occurs.

### Interstice.IntersticeError

Exposed for `instanceof` checks.

### Interstice.ConnectionError

The error thrown when interstice is unable to connect to the stream url.

### Interstice.DataTimeoutError

The error thrown when no data is received for the time specified with the _timeout_ option.

### Interstice.FileDeleteError

The error thrown when a song can not be deleted from the recording folder.
