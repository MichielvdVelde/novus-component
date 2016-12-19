const EventEmitter = require('events').EventEmitter
const mqtt = require('mqtt')
const mqttRegex = require('mqtt-regex')
const debug = require('debug')('novus:Component')
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

      const subscribeToRoutes = () => {
        let promises = []
        this._routes.forEach(route => {
          promises.push(this.subscribe(route.topic.topic, route.options.subscribe || {}))
        })
        if (promises.length === 0) return Promise.resolve()
        return Promise.all(promises)
      }

      const onError = err => {
        reject(err)
      }

      const onConnect = connack => {
        debug('connected to broker')
        this._client.removeListener('error', onError)
        this._attachEventHandlers()

        if (!connack.sessionPresent) {
          subscribeToRoutes().then(() => {
            resolve(connack)
          }).catch(err => {
            reject(err)
          })
        } else {
          resolve(connack)
        }
      }

      const url = this._options.mqtt.url || this._options.mqtt
      debug(`attempting to connect to broker at ${url}`)
      this._client = mqtt.connect(url, Object.assign(this._options.mqtt, {
        clientId: this.componentId
      }))
      this._client.once('connect', onConnect)
      this._client.once('error', onError)
    })
  }

  end (force = false) {
    return new Promise((resolve, reject) => {
      if (!this.connected) return reject(new Error('not connected to broker'))
      this._client.end(force, () => {
        resolve()
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
        debug(`subscribing to ${topic}...`)
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
        debug(`unsubscribing from ${topic}...`)
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
        debug(`publishing on ${topic}...`)
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
        debug(`adding route for ${topic.topic}`)
        this._routes.set(topic.topic, new Route(this, topic, handler, options))
        if (this.connected) {
          return this.subscribe(topic.topic, options.subscribe || {})
        }
        return Promise.resolve()
      }
    }
  }

  _attachEventHandlers () {
    const onConnect = connack => {
      this.emit('connect')
    }

    const onReconnect = () => {
      this.emit('reconnect')
    }

    const onClose = () => {
      this.emit('close')
    }

    const onOffline = () => {
      this.emit('offline')
    }

    const onError = err => {
      this.emit('error', err)
    }

    const onMessage = (topic, message, packet) => {
      for (let route of this._routes.values()) {
        if (route.match(topic)) {
          packet.params = route.getParams(topic)
          return route.execute(packet)
        }
      }
      this.emit('message', packet)
    }

    this._client.on('connect', onConnect)
    this._client.on('reconnect', onReconnect)
    this._client.on('close', onClose)
    this._client.on('offline', onOffline)
    this._client.on('message', onMessage)
    this._client.on('error', onError)
  }

  _normalizeTopic (topic) {
    topic = topic.replace('{$componentId}', this.componentId)
    return topic
  }
}

exports = module.exports = Component
