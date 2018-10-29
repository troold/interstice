const EventEmitter = require('events')
const Readable = require('stream').Readable
const Writable = require('stream').Writable

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

module.exports = {
  EventEmitterSpy,
  FsFake,
  IcyFake,
  MomentFake,
  NodeId3Fake
}
