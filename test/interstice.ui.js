const Command = require('commander').Command
const proxyquire = require('proxyquire')
const IntersticeFakeUI = require('./interstice.test-doubles.js').IntersticeFakeUI

process.argv = [
  'node',
  'cli.js',
  'www.example.com'
]

proxyquire('../cli.js', {
  './lib/interstice': IntersticeFakeUI,
  'commander': new Command()
})
