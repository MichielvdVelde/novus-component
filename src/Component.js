'use strict';

import { EventEmitter } from 'events';

import * as mqtt from 'mqtt';
import { default as extend } from 'extend';
import { default as mqtt_regex } from 'mqtt-regex';

import { MemoryStore } from 'novus-component-store-memory';

/**
 * Default options to use for new routes
**/
const DEFAULT_ROUTE_OPTIONS = {
  subscribe: true,
  once: false
};

/**
 * Component class
**/
export class Component extends EventEmitter {

  /**
   * Constructor
  **/
  constructor(componentId, options = {}) {
    super();
    this._componentId = componentId;
    options.clientId = options.clientId || componentId;
    this._options = options;
		this._store = this._options.store || new MemoryStore();

    this._connected = false;
    this._mqtt = null;
    this._routes = [];

    this.methods = {};
		this.plugins = {};
  }

  /**
   * Getter for the component ID
  **/
  get componentId() {
    return this._componentId;
  }

  /**
   * Set a key to a value in the Store
  **/
  set(key, value, override = true) {
    if((this._store.get(key) === null) || (this._store.get(key) !== null && override)) {
      this._store.set(key, value, override);
    }
  }

  /**
   * Get the value for a key in the Store
  **/
  get(key, def = null) {
    return this._store.get(key, def);
  }

  /**
   * Returns true if connected to MQTT broker
  **/
  isConnected() {
    return this._mqtt !== null && this._connected;
  }

	/**
	 * Register one or more plugins
	**/
	register(register, options = {}) {
		if(typeof register === 'function') {
			register = [{
        register: register,
        options: options
      }];
		}
    else if(!Array.isArray(register)) {
      register = [ register ];
    }

    let promises = [];
    for(let plugin of register) {
      promises.push(plugin.register(this, plugin.options || {}));
    }
    return promises;
	}

  /**
   * Add one or more routes
  **/
  route(routes, handler = null, options = {}) {
    if(typeof handler === 'function') {
      routes = [
        {
          route: routes,
          handler: handler,
          options: options
        }
      ];
    }
    else if(!Array.isArray(routes)) {
      routes = [ routes ];
    }
    for(let route of routes) {
      route.route = this._replacePlaceholders(route.route);
      route.options = extend(true, {}, DEFAULT_ROUTE_OPTIONS, route.options || {});
      let regex = mqtt_regex(route.route);
      route.topic = regex.topic;
      route.match = regex.exec;
      this._routes.push(route);
    }
  }

  /**
   * Publish a message on a topic
  **/
  publish(topic, message, options = {}) {
    return new Promise((resolve, reject) => {
      if(!this.isConnected()) {
        return reject(new Error('not connected to broker'));
      }
      topic = this._replacePlaceholders(topic);
      this._mqtt.publish(topic, message, options, (err) => {
        if(err) return reject(err);
        return resolve();
      });
    });
  }

  /**
   * Subscribe to a topic
  **/
  subscribe(topic, options = {}) {
    return new Promise((resolve, reject) => {
      if(!this.isConnected()) {
        return reject(new Error('not connected to broker'));
      }
      topic = this._replacePlaceholders(topic);
      this._mqtt.subscribe(topic, options, (err, granted) => {
        if(err) return reject(err);
        return resolve(granted);
      });
    });
  }

  /**
   * Unsubscribe from a topic
  **/
  unsubscribe(topic) {
    return new Promise((resolve, reject) => {
      if(!this.isConnected()) {
        return reject(new Error('not connected'));
      }
      topic = this._replacePlaceholders(topic);
      this._mqtt.unsubscribe(topic, () => {
        return resolve();
      });
    });
  }

  /**
   * Start the Component
  **/
  start() {
    return new Promise((resolve, reject) => {
      if(this._mqtt !== null) {
        return reject(new Error('already started'));
      }

      let promiseDone = false;
      const onError = (err) => {
        if(!promiseDone) {
          reject(err);
          promiseDone = true;
        }
      };

      const onClose = () => {
        this._connected = false;
        if(!promiseDone) {
          reject(new Error('connection closed'));
          promiseDone = true;
        }
      };

      const onConnect = (connack) => {
        this._connected = true;
        this._mqtt.removeListener('error', onError);
        this._mqtt.removeListener('close', onClose);

        this._attachListeners();
        this._subscribeToRoutes();
        return resolve(connack);
      };

      this._mqtt = mqtt.connect(this._options.url || this._options, this._options);
      this._mqtt.once('connect', onConnect);
      this._mqtt.once('error', onError);
      this._mqtt.once('close', onClose);
    });
  }

  /**
   * End the connection to the MQTT broker
  **/
  end(force = false) {
    return new Promise((resolve, reject) => {
      if(!this.isConnected()) {
        return reject(new Error('connection already closed'));
      }
      this._mqtt.end(force, () => {
        return resolve();
      });
    });
  }

  /**
   * Attach MQTT listeners
  **/
  _attachListeners() {

    const onMessage = (topic, message, packet) => {
      let route = this._matchTopicToRoute(topic);
      if(route !== null) {
        packet.params = route.match(topic);
        route.handler(packet, this);
      }
    };

    const onError = (err) => {
      this.emit('error', err);
    };

    const onClose = () => {
      this.emit('close');
      this._connected = false;
      this._mqtt = null;
    };

    this._mqtt.on('message', onMessage);
    this._mqtt.on('error', onError);
    this._mqtt.once('close', onClose);

  }

  /**
   * Subscribe to routes
  */
  _subscribeToRoutes() {
    for(let route of this._routes) {
      if(route.options.subscribe) {
        this._mqtt.subscribe(route.topic);
      }
    }
  }

  /**
   * Match a topic to a route
  **/
  _matchTopicToRoute(topic) {
    for(let route of this._routes) {
      if(route.match(topic)) {
        if(route.options.once) {
          this.unsubscribe(route.topic);
        }
        return route;
      }
    }
    return null;
  }

  /**
   * Replaces Component-specific keys in topics
  **/
  _replacePlaceholders(topic) {
    topic = topic.replace('{$componentId}', this._componentId);
    return topic;
  }

}
