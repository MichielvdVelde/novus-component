'use strict';

import { default as extend } from 'extend';
import { default as mqtt_regex } from 'mqtt-regex';

import { Component } from './Component';

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
  constructor(route = null, component = null) {
    if(route === null) {
      throw new TypeError('route cannot be null');
    }

    if(!(component instanceof Component)) {
      throw new TypeError('component has to be an instance of Component');
    }

    if(typeof route.handler !== 'function') {
      throw new TypeError('handler must be a function');
    }

    this._component = component;
    this._id = route.id || null;
    this._topic = mqtt_regex(route.topic);
    this._handler = route.handler;
    this._options = extend({}, DEFAULT_OPTIONS, route.options || {});
  }

  /**
   *
  **/
  get id() {
    return this._id;
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
    return this._topic.exec(topic);
  }

  /**
   * Execute the route's handler
  **/
  execute(packet) {
    const bound = this._handler.bind(this._component);
    return bound(packet, this._options);
  }
}
