const Interstice = require('./interstice.js')

const split = [
  { 'event': 'connection', payload: undefined },
  { 'event': 'song:start', 'payload': { 'title': 'title1', 'filePath': 'testDir/20180101T001000Z-title1.mp3' } },
  { 'event': 'song:delete', 'payload': { 'title': 'title1', 'filePath': 'testDir/20180101T001000Z-title1.mp3' } },
  { 'event': 'song:start', 'payload': { 'title': 'title2', 'filePath': 'testDir/20180101T001100Z-title2.mp3' } },
  { 'event': 'song:complete', 'payload': { 'title': 'title2', 'filePath': 'testDir/20180101T001100Z-title2.mp3' } },
  { 'event': 'song:start', 'payload': { 'title': 'title3', 'filePath': 'testDir/20180101T001200Z-title3.mp3' } },
  { 'event': 'song:delete', 'payload': { 'title': 'title3', 'filePath': 'testDir/20180101T001200Z-title3.mp3' } },
  { 'event': 'stop', payload: undefined }
]

const abort = [
  { event: 'connection', payload: undefined },
  { event: 'song:start', payload: { 'title': 'title1', 'filePath': 'testDir/20180101T001000Z-title1.mp3' } },
  { event: 'song:delete', payload: { 'title': 'title1', 'filePath': 'testDir/20180101T001000Z-title1.mp3' } },
  { event: 'song:start', payload: { 'title': 'title2', 'filePath': 'testDir/20180101T001100Z-title2.mp3' } },
  { event: 'song:delete', payload: { 'title': 'title2', 'filePath': 'testDir/20180101T001100Z-title2.mp3' } },
  { event: 'error', payload: new Interstice.DataTimeoutError(10) }
]

module.exports = { split, abort }
