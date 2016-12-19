// const Component = require('./Component')

class Route {
  constructor (component = null, topic = null, handler = null, options = {}) {
    // if (component instanceof Component) throw new TypeError('component must be an instance of Component')
    if (!topic.topic || typeof topic.topic !== 'string') throw new TypeError('topic must be an mqtt-regex result')
    if (typeof handler !== 'function') throw new TypeError('handler must be a function')

    this._component = component
    this._topic = topic
    this._handler = handler
    this._options = options
  }

  get topic () {
    return this._topic
  }

  get options () {
    return this._options
  }

  getParams (topic) {
     return this._topic.exec(topic)
  }

  match (topic) {
    return this._topic.regex.exec(topic)
  }

  execute (packet) {
    return this._handler.bind(this._component)(packet)
  }
}

exports = module.exports = Route
