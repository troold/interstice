const path = require('path')

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

module.exports = {
  IntersticeError,
  ConnectionError,
  DataTimeoutError,
  FileDeleteError
}
