const tap = require('tap')
const sinon = require('sinon')
const proxyquire = require('proxyquire')
const restoreCursor = require('restore-cursor')

const { ConnectionError } = require('../lib/errors')
const stdin = require('mock-stdin').stdin()

function createOraStub () {
  return sinon.stub().returns({
    start: sinon.stub(),
    succeed: sinon.stub(),
    info: sinon.stub(),
    warn: sinon.stub(),
    error: sinon.stub(),
    stop: sinon.stub()
  })
}

// tap.runOnly = true

tap.test('forcefully exit after 2 sigints', t => {
  let fsStub = require('fs')
  sinon.stub(fsStub, 'mkdirSync')

  let exitStub = sinon.stub(process, 'exit')

  let Interstice = require('../lib/interstice')
  let intersticeStub = new Interstice()
  let stopSpy = sinon.spy(intersticeStub, 'stop')
  sinon.stub(intersticeStub, 'start')
  let IntersticeFake = sinon.stub().returns(intersticeStub)

  let Command = require('commander').Command
  process.argv = [
    'node',
    'cli.js',
    'www.example.com'
  ]

  proxyquire('../cli.js', {
    './lib/interstice': IntersticeFake,
    'fs': fsStub,
    'ora': createOraStub(),
    'commander': new Command()
  })

  stdin.send('\u0003', 'utf8')
  // process.stdin.emit('keypress', '\u0003')
  t.ok(stopSpy.calledOnce, 'ripping is stopped')

  stdin.send('\u0003', 'utf8')
  // process.stdin.emit('keypress', '\u0003')
  t.ok(exitStub.called, 'process exits')

  t.end()

  stdin.reset()
  sinon.restore()
  restoreCursor()
})

tap.test('retry on connection error', t => {
  let fsStub = require('fs')
  sinon.stub(fsStub, 'mkdirSync')

  let Interstice = require('../lib/interstice')
  let intersticeStub = new Interstice()
  let startStub = sinon.stub(intersticeStub, 'start')
  let IntersticeFake = sinon.stub().returns(intersticeStub)

  let clock = sinon.useFakeTimers()

  let Command = require('commander').Command
  process.argv = [
    'node',
    'cli.js',
    'www.example.com'
  ]

  proxyquire('../cli.js', {
    './lib/interstice': IntersticeFake,
    'fs': fsStub,
    'ora': createOraStub(),
    'commander': new Command()
  })

  t.ok(startStub.calledOnce, 'start called once')

  intersticeStub.emit('error', new ConnectionError({
    href: 'www.example.com'
  }))
  clock.next()
  t.ok(startStub.calledTwice, 'start called twice')
  t.end()

  clock.restore()
  sinon.restore()
  restoreCursor()
})
