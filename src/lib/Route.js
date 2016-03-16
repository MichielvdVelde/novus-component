'use strict';

import { default as extend } from 'extend';
import { default as mqtt_regex } from 'mqtt-regex';

/**
 * Default route options
**/
const DEFAULT_OPTIONS = {
  subscribe: true,
  qos: 0
};

/**
 * Route class
**/
export class Route {

  /**
   * Constructor
  **/
  constructor(route = null) {
    if(route === null) {
      throw new TypeError('route cannot be null');
    }

    if(typeof route.handler !== 'function') {
      throw new TypeError('handler must be a function');
    }

    this._topic = mqtt_regex(route.topic);
    this._handler = route.handler;
    this._options = extend({
      subscribe: true,
      qos: 0
    }, route.options || {});
  }

  /**
   * Get the topic
  **/
  get topic() {
    return this._topic;
  }

  /**
   * Get subscribe (bool)
  **/
  get subscribe() {
    return this._options.subscribe;
  }

  /**
   * Get QoS
  **/
  get qos() {
    return this._options.qos;
  }

  /**
   * Check if the given topic is a match for this route
  **/
  match(topic) {
    let match = this._topic.exec(topic);
    return match ? match : null;
  }

  /**
   * Execute the route's handler
  **/
  execute(component, packet) {
    const bound = this._handler.bind(component);
    return bound(packet);
  }
}
