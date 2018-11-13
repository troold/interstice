const EventEmitter = require('events')
const url = require('url')
const icy = require('icy')
const path = require('path')
const sanitize = require('sanitize-filename')
const NodeID3 = require('node-id3')
const pick = require('lodash/pick')
const fs = require('fs')
const moment = require('moment')

const TIMESTAMP_FORMAT = 'YYYYMMDD[T]HHmmss[Z]'

class Interstice extends EventEmitter {
  constructor ({
    output = '.',
    agent = null,
    timeout = 0
  } = {}) {
    super()
    this.output = output
    this.agent = agent
    this.timeout = timeout
  }

  start (endpoint) {
    this.icyReq = null
    this.icyRes = null
    this.noDataTimeout = null
    this.isStopped = false
    this.isFirstSong = true
    this.deleteIncomplete = true
    this.songs = []

    let endpointUrl = url.parse(endpoint)
    if (this.agent) { endpointUrl.agent = this.agent }
    setImmediate(this._connect.bind(this, endpointUrl))
    return this
  }

  _connect (url) {
    this.icyReq = icy
      .get(url, this._onIcyResponse.bind(this))
      .on('error', () => { this.emit('error', new ConnectionError(url)) })
  }

  _onIcyResponse (res) {
    this.icyRes = res
    this.emit('connection')
    this._startTimeout()
    res
      .on('metadata', this._onMetadata.bind(this))
      .on('readable', () => {
        let chunk = null
        while ((chunk = res.read()) !== null && this.isStopped === false) {
          this._onData(chunk)
        }
      })
  }

  _cleanUp () {
    this.icyRes.removeAllListeners()
    if (this.songs.length) {
      this.songs
        .filter(song => song.stream != null)
        .forEach(song => {
          song.toDelete = this.deleteIncomplete
          this._endSong(song)
        })
    }
  }

  _onMetadata (metadata) {
    let meta = icy.parse(metadata)
    let streamTitle = meta.StreamTitle
    let offset = this.icyRes.readableLength
    let willDelete = this.isFirstSong && this.deleteIncomplete
    this.isFirstSong = false
    this._queueSong(this.output, streamTitle, offset, willDelete)
  }

  _onData (data) {
    this._stopTimeout()
    if (this.songs.length) {
      let i
      for (i = 0; i < this.songs.length - 1; i++) {
        let doneSong = this.songs[i]
        let nextSong = this.songs[i + 1]
        let doneData = data.slice(doneSong.offset, nextSong.offset)
        this._writeSong(doneSong, doneData)
        this._endSong(doneSong)
      }
      let lastSong = this.songs[i]
      if (lastSong.offset < data.length) {
        let lastData = data.slice(lastSong.offset)
        this._writeSong(lastSong, lastData)
      }
      lastSong.offset = 0
      this.songs = this.songs.slice(-1)
    }

    if (this.isStopped) {
      this._cleanUp()
      this.emit('stop')
    } else {
      this._startTimeout()
    }
  }

  _startTimeout () {
    if (this.timeout === 0) { return null }
    this.noDataTimeout = setTimeout(
      () => {
        this._cleanUp()
        this.emit('error', new DataTimeoutError(this.timeout))
      },
      this.timeout
    )
  }

  _stopTimeout () {
    clearTimeout(this.noDataTimeout)
  }

  _queueSong (dir, title, offset, toDelete) {
    let timestamp = moment().utc().format(TIMESTAMP_FORMAT)
    let saneFileName = sanitize(`${timestamp}-${title}`)
    let filePath = path.join(dir, `${saneFileName}.mp3`)
    this.songs.push({ title, filePath, offset, toDelete })
  }

  _writeSong (song, data) {
    if (song.stream == null) {
      let stream = fs.createWriteStream(song.filePath)
      let title = song.title
      let tag = NodeID3.create({ title })
      stream.write(tag)
      song.stream = stream
      let payload = pick(song, [ 'title', 'filePath' ])
      this.emit('song:start', payload)
    }
    song.stream.write(data)
  }

  _endSong (song) {
    song.stream.end()
    let payload = pick(song, [ 'title', 'filePath' ])
    if (song.toDelete) {
      fs.unlink(song.filePath, err => {
        if (err) { this.emit('error', new FileDeleteError(song.filePath)) }
      })
      this.emit('song:delete', payload)
    } else {
      this.emit('song:complete', payload)
    }
  }

  stop () {
    this.isStopped = true
  }
}

class IntersticeError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

class ConnectionError extends IntersticeError {
  constructor (url) {
    super(`Could not connect to ${url.href}`)
    this.url = url
  }
}

class DataTimeoutError extends IntersticeError {
  constructor (delay) {
    super(`Data was not received for ${delay}ms`)
    this.delay = delay
  }
}

class FileDeleteError extends IntersticeError {
  constructor (filePath) {
    super(`Could not delete ${path.basename(filePath)}`)
    this.filePath = filePath
  }
}

module.exports = Object.assign(Interstice, {
  IntersticeError,
  ConnectionError,
  DataTimeoutError,
  FileDeleteError
})
