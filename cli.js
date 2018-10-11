#!/usr/bin/env node

const url = require('url')
const mkdirSync = require('fs').mkdirSync
const program = require('commander')
const tunnel = require('tunnel')
const ora = require('ora')()
const readline = require('readline')
const ms = require('ms')
const Interstice = require('./lib/interstice')

const { version, description } = require('./package.json')

program
  .description(description)
  .version(version, '-v, --version')
  .arguments('<url>')
  .option('-o, --output [dir]', 'output for recordings', './recordings')
  .option('-p, --proxy [proxy]', 'proxy', null)
  .option('-t, --timeout [ms]', 'milliseconds until connection timeout (0 will disable)', 0)
  .option('-r, --reconnect [ms]', 'milliseconds until reconnection (implies -t)', 4200)
  .action(runRip)
  .parse(process.argv)

if (!process.argv.slice(2).length) {
  program.help()
}

function runRip (endpoint) {
  let agent = null
  let reconnect = program.reconnect
  if (program.proxy) {
    let proxyUrl = url.parse(program.proxy)
    agent = tunnel.httpOverHttp({
      proxy: {
        host: proxyUrl.hostname,
        port: proxyUrl.port
      }
    })
  }

  try {
    mkdirSync(program.output)
  } catch (e) {
    if (e.code !== 'EEXIST') {
      ora.fail(e.message)
      process.exit()
    }
  }

  let ripper = new Interstice({
    output: program.output,
    timeout: program.timeout,
    agent
  })

  let isConnected = false
  let connectionRetries = 0
  ripper
    .on('connection', () => {
      isConnected = true
      connectionRetries = 0
      ora.succeed(`Connected to ${endpoint}`)
    })
    .on('song:start', title => {
      ora.start(`Downloading ${title}`)
    })
    .on('song:complete', title => {
      ora.succeed(`Completed ${title}`)
    })
    .on('stop', () => {
      ora.info('Exited gracefully')
      process.exit()
    })
    .on('error', e => {
      if (e instanceof Interstice.IntersticeError) {
        if ([ 'ConnectionError', 'DataTimeoutError' ].includes(e.name)) {
          let retriesMsg = connectionRetries++ > 0
            ? `(attempts: ${connectionRetries})`
            : ''
          ora.warn(`${e.message}, reconnecting in ${ms(reconnect, { long: true })} ${retriesMsg}`)
          isConnected = false
          setTimeout(rip, reconnect)
        }
      } else {
        ora.fail(`${e.message}, exiting...`)
        process.exit()
      }
    })

  readline.emitKeypressEvents(process.stdin)
  process.stdin.setEncoding('utf8')
  process.stdin.setRawMode(true)
  process.stdin.on('keypress', key => {
    if (key !== '\u0003') { return }
    if (ripper.isStopped || !isConnected) {
      ora.stop()
      process.exit()
    }
    ora.info('press Ctrl+C again to quit immediately')
    ripper.stop()
  })

  function rip () {
    ora.start('Connecting...')
    ripper.start(endpoint)
  }

  rip()
}
