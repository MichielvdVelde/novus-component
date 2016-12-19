const EventEmitter = require('events').EventEmitter
const mqtt = require('mqtt')
const mqttRegex = require('mqtt-regex')
const Route = require('./Route')

const DEFAULT_OPTIONS = {
  //
}

class Component extends EventEmitter {
  constructor (componentId = null, options = {}) {
    super()

    this._componentId = componentId
    this._client = null
    this._routes = new Map()
    this._options = Object.assign({}, DEFAULT_OPTIONS, options)
  }

  get componentId () {
    return this._componentId
  }

  get connected () {
    return this._client !== null && this._client.connected
  }

  start () {
    return new Promise((resolve, reject) => {
      if (this.connected) return reject(new Error('already connected to broker'))

      const onConnect = connack => {
        // TODO
      }

      const onReconnect = () => {
        // TODO
      }

      const onMessage = (topic, message, packet) => {
        this._onMQTTMessage(packet)
      }

      const onError = err => {
        this.emit('error', err)
      }

      this._client = mqtt.connect(this._options.mqtt)
      this._client.on('connect', onConnect)
      this._client.on('reconnect', onReconnect)
      this._client.on('message', onMessage)
      this._client.on('error', onError)
      this._client.once('close', () => {
        //
      })
    })
  }

  subscribe (topic = null, options = {}) {
    if (Array.isArray(topic)) {
      let promises = []
      topic.forEach(sub => this.subscribe(sub.topic, sub.options || {}))
      return Promise.all(promises)
    } else if (typeof topic === 'string') {
      return new Promise((resolve, reject) => {
        topic = this._normalizeTopic(topic)
        options = Object.assign({ qos: 0 }, options)
        this._client.subscribe(topic, options, (err, granted) => {
          if (err) return reject(err)
          return resolve(granted)
        })
      })
    } else {
      return Promise.reject(new Error('invalid parameters for subscribe()'))
    }
  }

  unsubscribe (topic = null) {
    if (typeof topic === 'object') {
      topic = [ topic ]
    }
    if (Array.isArray(topic)) {
      let promises = []
      topic.forEach(str => promises.push(this.unsubscribe(str)))
      return Promise.all(promises)
    } else if (typeof topic === 'string') {
      return new Promise((resolve, reject) => {
        topic = this._normalizeTopic(topic)
        this._client.unsubscribe(topic, err => {
          if (err) return reject(err)
          return resolve()
        })
      })
    } else {
      return Promise.reject(new Error('invalid parameters for unsubscribe()'))
    }
  }

  publish (topic = null, message = null, options = {}) {
    if (topic === null) return Promise.reject(new Error('topic cannot be null'))
    if (typeof topic === 'object') {
      topic = [ topic ]
    }
    if (Array.isArray(topic)) {
      let promises = []
      topic.forEach(arr => promises.push(this.publish(arr.topic, arr.message, arr.options || {})))
      return Promise.all(promises)
    } else if (typeof topic === 'string') {
      return new Promise((resolve, reject) => {
        if (message === null) return reject(new Error('message cannot be null'))
        topic = this._normalizeTopic(topic)
        options = Object.assign({ qos: 0, retain: false }, options)
        this._client.publish(topic, message, options, err => {
          if (err) return reject(err)
          return resolve()
        })
      })
    } else {
      return Promise.reject(new Error('invalid parameters for publish()'))
    }
  }

  route (topic = null, handler = null, options = {}) {
    if (typeof topic === 'object') {
      topic = [ topic ]
    }
    if (Array.isArray(topic)) {
      let promises = []
      topic.forEach(arr => this.route(arr.topic, arr.handler, arr.options || {}))
      return Promise.all(promises)
    } else if (typeof topic === 'string') {
      topic = mqttRegex(this._normalizeTopic(topic))
      if (this._routes.has(topic.topic)) {
        return Promise.reject(new Error(`route with topic (${topic.topic}) already exists`))
      } else {
        this._routes.set(topic.topic, new Route(this, topic, handler, options))
        return Promise.resolve()
      }
    }
  }

  _onMQTTMessage (packet) {
    //
  }

  _normalizeTopic (topic) {
    topic = topic.replace('{$componentId}', this.componentId)
    return topic
  }
}

exports = module.exports = Component
