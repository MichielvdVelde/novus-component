const debug = require('debug')('novus:example')
const Component = require('./lib/Component')

const component = new Component('my-component', {
  mqtt: {
    url: 'mqtt://broker.hivemq.com'
  }
})

component.on('message', packet => {
  debug(`got unbound message on ${packet.topic}`)
})

component.route('test/some/+topic', packet => {
  debug(`got message on topic ${packet.topic}: ${packet.payload.toString()}`)
}).then(() => {
  return component.start()
}).then(connack => {
  debug('connected to broker')
}).then(() => {
  return component.publish('test/some/topic', 'Hello, bitches!')
}).catch(err => {
  debug(`connection error: ${err.message}`)
})
