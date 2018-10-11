const tap = require('tap')
const proxyquire = require('proxyquire')

const doubles = require('./interstice.test-doubles.js')
const { DataTimeoutError } = require('../lib/errors')

// tap.runOnly = true

tap.test('successfully split the mp3 stream', t => {
  let nodeId3Fake = doubles.NodeId3Fake()
  let icyStub = doubles.IcyFake({
    sequence: [
      'META-title1',
      'DATA-test_data_1_test_data_1',
      'META-title2',
      'DATA-test_data_2_test_data_2',
      'META-title3',
      'DATA-test_data_3_test_data_3'
    ]
  })
  let fsFake = doubles.FsFake()
  let momentStub = doubles.MomentFake()

  let Interstice = proxyquire('../lib/interstice', {
    'icy': icyStub,
    'node-id3': nodeId3Fake,
    'fs': fsFake,
    'moment': momentStub,
    'events': doubles.EventEmitterSpy
  })

  let wantedEvents = [
    { event: 'connection', payload: undefined },
    { event: 'song:start', payload: 'title1' },
    { event: 'song:delete', payload: 'title1' },
    { event: 'song:start', payload: 'title2' },
    { event: 'song:complete', payload: 'title2' },
    { event: 'song:start', payload: 'title3' },
    { event: 'song:delete', payload: 'title3' },
    { event: 'stop', payload: undefined }
  ]

  let rip = new Interstice({ output: 'testDir' })

  rip
    .start('http://www.example.com')
    .on('song:start', title => {
      if (title === 'title3') { rip.stop() }
    })
    .on('stop', () => {
      let data1 = fsFake.files['testDir/20180101T001000Z-title1.mp3']
      t.equal(data1.deleted, true, 'first song is deleted by default')

      let data2 = fsFake.files['testDir/20180101T001100Z-title2.mp3']
      t.equal(data2.content, 'title2test_data_2_test_data_2', 'ripped correctly data (song 2)')
      t.equal(data2.deleted, false, '"inner" songs are kept')

      let data3 = fsFake.files['testDir/20180101T001200Z-title3.mp3']
      t.equal(data3.deleted, true, 'canceled songs are trashed')

      t.same(rip.events, wantedEvents, 'events are emitted in correct order')

      t.end()
    })
})

tap.test('abort when endpoint is not reachable', t => {
  let icyStub = doubles.IcyFake({ failRequest: true })

  let Interstice = proxyquire('../lib/interstice', {
    'icy': icyStub
  })

  let rip = new Interstice({ output: 'testDir' })

  rip
    .start('http://www.example.com')
    .on('error', error => {
      t.equal(error.name, 'ConnectionError', 'connect failure error is thrown')
      t.end()
    })
})

tap.test('abort when no data is received', t => {
  let nodeId3Fake = doubles.NodeId3Fake()
  let icyStub = doubles.IcyFake({
    sequence: [
      'META-title1',
      'DATA-test_data_1a_test_data_1a',
      'DATA-test_data_1b_test_data_1b',
      'META-title2',
      'DATA-test_data_2a_test_data_2a'
    ]
  })
  let fsFake = doubles.FsFake()
  let momentStub = doubles.MomentFake()

  let Interstice = proxyquire('../lib/interstice', {
    'icy': icyStub,
    'node-id3': nodeId3Fake,
    'fs': fsFake,
    'moment': momentStub,
    'events': doubles.EventEmitterSpy
  })

  let wantedEvents = [
    { event: 'connection', payload: undefined },
    { event: 'song:start', payload: 'title1' },
    { event: 'song:delete', payload: 'title1' },
    { event: 'song:start', payload: 'title2' },
    { event: 'song:delete', payload: 'title2' },
    { event: 'error', payload: new DataTimeoutError(10) }
  ]

  let rip = new Interstice({ output: 'testDir', timeout: 10 })

  rip
    .start('http://www.example.com')
    .on('error', () => {
      let data1 = fsFake.files['testDir/20180101T001000Z-title1.mp3']
      t.equal(data1.deleted, true, 'first song is deleted by default')

      let data2 = fsFake.files['testDir/20180101T001100Z-title2.mp3']
      t.equal(data2.deleted, true, 'incomplete song is trashed')

      t.same(rip.events, wantedEvents, 'events are emitted in correct order')

      t.end()
    })
})
