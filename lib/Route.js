const Component = require('./Component')

class Route {
  constructor (component = null, topic = null, handler = null, options = {}) {
    if (component instanceof Component) throw new TypeError('component must be an instance of Component')
    if (typeof topic !== 'string') throw new TypeError('topic must be a string')
    if (typeof handler !== 'function') throw new TypeError('handler must be a function')

    this._component = component
    this._topic = topic
    this._handler = handler
    this._options = options
  }
}

exports = module.exports = Route
