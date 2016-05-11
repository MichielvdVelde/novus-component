'use strict';

import { EventEmitter } from 'events';

import * as mqtt from 'mqtt';
import { default as extend } from 'extend';
import { MemoryStore } from 'novus-component-store-memory';

import { Route } from './Route';

/**
 * Default component options
**/
const DEFAULT_OPTIONS = {
	subscribeWhileConnected: false
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
		if(!options.clientId) options.clientId = componentId;
		this._store = options.store ? options.store : new MemoryStore();
		this._options = extend({}, DEFAULT_OPTIONS, options);

		this._mqttClient = null;
		this._routes = [];

	}

	/**
	 * Convenience method for getting settings variables
	**/
	get(key, def = null) {
		return this._store.get(key, def);
	}

	/**
	 * Convenience method for setting settings variables
	**/
	set(key, value) {
		return this._store.set(key, value);
	}

	/**
	 * Returns true if the component is connected to an MQTT broker
	**/
	get connected() {
		return this._mqttClient !== null && this._mqttClient.connected;
	}

	/**
	 * Returns the component's ID
	**/
	get componentId() {
		return this._componentId;
	}

	/**
	 * Start the component and connect to the MQTT broker
	**/
	start(url = this._options.url || null) {
		return new Promise((resolve, reject) => {

			const onConnect = (connack) => {
				this._mqttClient.connected = true;
				this._mqttClient.removeAllListeners();
				this._attachListeners()
					.then(() => {
						if(connack.sessionPresent) return true;
						return this._subscribeToRoutes();
					})
					.then(() => {
						return resolve(connack);
					})
					.catch((err) => {
						return reject(err);
					});
			};

			const onError = (err) => {
				this._mqttClient.removeAllListeners();
				this._mqttClient = null;
				return reject(err);
			};

			this._mqttClient = (url !== null) ? mqtt.connect(url, this._options) : mqtt.connect(this._options);
			this._mqttClient.once('connect', onConnect);
			this._mqttClient.once('error', onError);

		});
	}

	/**
	 * Subscribe to one or more topics
	**/
	subscribe(topic, options = {}) {
		return new Promise((resolve, reject) => {
			if(!this.connected) {
				return reject(new Error('not connected to broker'));
			}

			options = extend({
				qos: 0
			}, options);

			topic = this._normalizeTopic(topic);
			this._mqttClient.subscribe(topic, options, (err, granted) => {
				if(err) return reject(err);
				return resolve(granted);
			});
		});
	}

	/**
	 * Unsubscribe from one or more topics
	**/
	unsubscribe(topic, options = {}) {
		return new Promise((resolve, reject) => {
			if(!this.connected) {
				return reject(new Error('not connected to broker'));
			}

			topic = this._normalizeTopic(topic);
			this._mqttClient.unsubscribe(topic, options, () => {
				return resolve();
			});
		});
	}

	/**
	 * Publish a message on a topic
	**/
	publish(topic, message, options = {}) {
		return new Promise((resolve, reject) => {
			if(!this.connected) {
				return reject(new Error('not connected to broker'));
			}

			options = extend({
				qos: 0,
				retain: false
			}, options);

			if(typeof message === 'object') {
				if(message.toString) {
					message = message.toString();
				}
				else {
					message = JSON.stringify(message);
				}
			}

			topic = this._normalizeTopic(topic);
			this._mqttClient.publish(topic, message, options, () => {
				return resolve();
			});
		});
	}

	/**
	 * End the connection to the MQTT broker
	**/
	end(force = false) {
		return new Promise((resolve, reject) => {
			if(!this.connected) {
				return reject(new Error('not connected to broker'));
			}

			this._mqttClient.end(force, () => {
				this._mqttClient.removeAllListeners();
				this._mqttClient = null;
				return resolve();
			});
		});
	}

	//

	/**
	 * Add one or more new routes
	**/
	route(topic, handler = null, options = {}) {
		if(typeof handler === 'function') {
			topic = {
				topic: topic,
				handler: handler,
				options: options
			};
		}

		if(!Array.isArray(topic)) {
			topic = [ topic ];
		}

		topic.forEach((item) => {
			item.topic = this._normalizeTopic(item.topic);
			this._routes.push(new Route(item, this));
			if(!this.connected || this.connected && this._options.subscribeWhileConnected) {
				this._subscribeToRoutes([ this._routes[this._routes.length-1] ]);
			}
		});
	}

	/**
	 * Attach MQTT listeners
	**/
	_attachListeners() {
		return new Promise((resolve) => {

			const onConnect = () => {
				this._mqttClient.connected = true;
			};

			const onOffline = () => {
				this._mqttClient.connected = false;
			};

			const onClose = () => {
				onOffline();
			};

			const onError = (err) => {
				// TODO: Better error handling
				throw err;
			};

			const onMessage = (topic, message, packet) => {
				for(let route of this._routes) {
					let match = route.match(topic);
					if(match) {
						packet.params = match;
						return route.execute(packet);
					}
				}
				return this.emit('message', topic, message, packet);
			};

			this._mqttClient.on('connect', onConnect);
			this._mqttClient.on('offline', onOffline);
			this._mqttClient.on('close', onClose);
			this._mqttClient.on('error', onError);
			this._mqttClient.on('message', onMessage);

			return resolve();

		});
	}

	/**
	 * Subscribe to all registered routes
	**/
	_subscribeToRoutes(routes = this._routes) {
		let i = 0;
		let subscriptions = {};
		for(let route of routes) {
			if(!route.subscribe) continue;
			if(subscriptions[route.topic.topic]) continue;
			subscriptions[route.topic.topic] = route.qos;
			i++;
		}
		return (i > 0) ? this.subscribe(subscriptions) : true;
	}

	/**
	 * Normalize topic names
	**/
	_normalizeTopic(topic) {

		const normalize = (t) => {
			t = t.replace('{$componentId}', this._componentId);
			return t;
		};

		// Handle topic arrays
		if(Array.isArray(topic)) {
		  return topic.map(normalize);
		}

		// Handle topic objects
		if(typeof topic === 'object') {
			let newObj = {};
			for(let t in topic) {
				newObj[normalize(t)] = topic[t];
			}
			return newObj;
		}

		// Handle strings
		return normalize(topic);
	}

	/**
	 * Parse JSON or return original value
	**/
	_tryParseJSON(value) {
		try {
			value = JSON.parse(value);
		}
		catch(e) { }
		return value;
	}

	/**
	 * Stringify JSON or return origial value
	**/
	_tryStringifyJSON(value) {
		try {
			value = JSON.stringify(value);
		}
		catch(e) { }
		return value;
	}

}
