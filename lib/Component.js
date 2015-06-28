
var events = require('events');
var util = require('util');

var mqtt = require('mqtt');
var extend = require('extend');

/*
	Default component options
*/
var defaultOptions = {
	'timeout': {
		'enabled': true,
		'ms': 10000
	},
	'mqtt': {
		'url': process.env['MQTT_BROKER_URL'] || null
	},
	'settings': [],
	'events': []
};

var Component = function(componentId, options) {
	events.EventEmitter.call(this);
	
	this.componentId = componentId;
	this.options = extend(defaultOptions, options || {});
	this.options.mqtt.clientId = componentId;
	this.settings = {};
	this.events = this.options.events || {};
	this.ready = false;
	this.connected = false;
	this.readyTimeout = null;
	
	var self = this;
	// Check to see if the URL to the MQTT broker has been set
	if(!this.options.mqtt.url || this.options.mqtt.url == null)
		return this.emit('error', new Error('MQTT broker URL required but not set'));
	
	// Connect to the MQTT broker
	this.mqtt = mqtt.connect(this.options.mqtt.url, this.options.mqtt);
	this.mqtt.on('connect', function() {
		self.connected = true;
		// Function that subscribes to a single setting topic
		var subscribeToSetting = function(setting) {
			if(self.connected) self.mqtt.subscribe(self.formatSysTopic(setting));
		};
		
		// Check if there are settings that need to be retrieved
		if(self.options.settings.length == 0) {
			// If no settings need to be retrieved, we're done
			self.ready = true;
			return self.emit('ready');
		}
		
		// Retrieve settings and set the timeout
		self.options.settings.forEach(subscribeToSetting);
		
		if(!self.options.timeout.enabled) return self.emit('ready');
		// The timeout event is fired if the settings were not received within the specified timeframe
		self.readyTimeout = setTimeout(function() {
			if(!self.ready) return self.emit('timeout');
		}, self.options.timeout.ms || 10000);
	});
	
	this.mqtt.on('message', function(topic, message, packet) {
	
		var decodePossibleJSON = function() {
			try {
				packet.json = JSON.parse(message);
			}
			catch(err) { }
		};
	
		// Function to handle a message that relays a setting
		var handleSettingsMessage = function() {
			var property = topic.replace('sys/' + self.componentId + '/', '');
			self.settings[property] = packet.json || packet.payload.toString();
			
			// If we now have all settings, clear timeout and emit ready
			if(!self.ready && Object.keys(self.settings).length == self.options.settings.length) {
				self.ready = true;
				if(self.readyTimeout != null) clearTimeout(self.readyTimeout);
				self.emit('ready');
			}
		}
	
		// First handle possible JSON parsing
		decodePossibleJSON();
		// If we received a message on sys/, it was a settings message
		if(topic.indexOf('sys/') != -1) return handleSettingsMessage();
		// If a custom event is specified for this topic, fire this event
		if(Object.keys(self.events).length > 0 && self.events.hasOwnProperty(topic)) return self.emit(self.events[topic], packet);
		// If it's not a settings message and has no custom event, emit message event
		return self.emit('message', packet);
	
	});
	this.mqtt.on('close', function() {
		if(self.connected) self.emit('close');
		self.connected = false;
	});
	
	this.formatSysTopic = function(property) {
		return util.format('sys/%s/%s', self.componentId, property);
	};
	
	/**
	 * Set an event for a topic. If a message on the specified topic is received,
	 * the callback will be fired instead of the usual 'message' event.
	**/
	this.setMessageEvent = function(topic, eventName) {
		self.events[topic] = eventName;
	};
	
	/**
	 * Remove a previously set topic event.
	**/
	this.removeMessageEvent = function(topic) {
		if(self.events.hasOwnProperty(topic))
			delete self.events[topic];
	};
	
	/**
	* Get a settings value
	**/
	this.get = function(property, def) {
		if(self.settings.hasOwnProperty(property))
			return self.settings[property];
		return (def) ? def : null;
	};
	
	/**
	 * Set a settings value
	**/
	this.set = function(property, value, propagate) {
		self.settings[property] = value;
		if(propagate) {
			if(!self.connected) return self.emit('error', new Error('Unable to propagate setting: no active connection'));
			return self.mqtt.publish(self.formatSysTopic(property), value, { 'retain': true });
		}
	};
	
}

util.inherits(Component, events.EventEmitter);
exports = module.exports = Component;