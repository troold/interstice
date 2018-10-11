const EventEmitter = require('events')
const Readable = require('stream').Readable
const Writable = require('stream').Writable
const intersticeErrors = require('../lib/errors')
const { ConnectionError, DataTimeoutError } = intersticeErrors

class EventEmitterSpy extends EventEmitter {
  constructor () {
    super()
    this.events = []
  }

  emit (event, payload) {
    this.events.push({ event, payload })
    EventEmitter.prototype.emit.call(this, ...arguments)
  }
}

function FsFake () {
  let files = {}

  return {
    files,
    createWriteStream (path) {
      let file = { deleted: false, content: '' }
      let outStream = new Writable({
        encoding: 'ascii',
        write (chunk, encoding, callback) {
          file.content = file.content.concat(chunk)
          callback()
        }
      })
      files[path] = file
      return outStream
    },
    unlink (path) {
      files[path].deleted = true
    }
  }
}

function IcyFake ({ sequence = [], failRequest = false }) {
  let _sequence = sequence
  let _req = new EventEmitter()
  let _stream = new Readable({
    encoding: 'ascii',
    read () {
      let event, data
      while (_sequence.length > 0 && event !== 'DATA') {
        [ event, data ] = _sequence.shift().split('-')
        switch (event) {
          case 'META':
            this.emit('metadata', data)
            break

          case 'DATA':
            this.push(data)
            break
        }
      }
    }
  })

  return {
    get (url, cb) {
      if (failRequest) {
        setImmediate(() => { _req.emit('error', 'connect-failed') })
      } else {
        cb(_stream)
      }
      return _req
    },
    parse (meta) { return { StreamTitle: meta } }
  }
}

function MomentFake (minute) {
  let _minute = minute || 0
  let moment = () => ({
    utc: () => ({
      format: () => `20180101T001${_minute++}00Z`
    })
  })
  return moment
}

function NodeId3Fake () {
  return {
    create ({ title }) { return title }
  }
}

class IntersticeFakeUI extends EventEmitter {
  constructor ({
    timeout = 5000,
    probability = { connection: 0.75, file: 0.75 },
    maxTime = { connection: 3000, file: 5000, stop: 2000 }
  } = {}) {
    super()

    this.status = 'DISCONNECTED'
    this._song = 0
    this._connection = 0
    this._timeout = timeout
    this._probability = probability
    this._maxTime = maxTime
  }

  start (url) {
    this.isStopped = false
    this._drawInterval(() => {
      if (this._test(this._probability.connection)) {
        this.status = 'CONNECTED'
        this._connection++
        this.emit('connection', url)
        this._startSong()
      } else {
        this.emit('error', new ConnectionError({ href: url }))
      }
    }, this._maxTime.connection)
  }

  stop () {
    this.isStopped = true
    this._drawInterval(() => {
      this.emit('stop')
    }, this._maxTime.stop)
  }

  _startSong () {
    let song = `song-${this._connection}-${++this._song}`
    this.emit('song:start', song)
    this._drawInterval(() => {
      if (this._test(this._probability.connection)) {
        this.emit('song:complete', song)
        this._startSong()
      } else {
        this.emit('error', new DataTimeoutError(this._timeout))
      }
    }, this._maxTime.file)
  }

  _drawInterval (fn, maxTime) {
    let timeout = Math.random() * maxTime
    return setTimeout(fn, timeout)
  }

  _test (prob) {
    return Math.random() < prob
  }
}

Object.assign(IntersticeFakeUI, intersticeErrors)

module.exports = {
  EventEmitterSpy,
  FsFake,
  IcyFake,
  MomentFake,
  NodeId3Fake,
  IntersticeFakeUI
}
