
var events = require('events');
var util = require('util');

var mqtt = require('mqtt');
var extend = require('extend');

/*
	Default component options
*/
var defaultOptions = {
	'timeout': 10000,
	'mqtt': {
		'url': process.env['MQTT_BROKER_URL'] || null
	},
	'settings': []
};

var Component = function(componentId, options) {
	events.EventEmitter.call(this);
	
	this.componentId = componentId;
	this.options = extend(defaultOptions, options || {});
	this.options.mqtt.clientId = componentId;
	this.settings = {};
	this.ready = false;
	this.readyTimeout = null;
	
	var self = this;
	// Check to see if the URL to the MQTT broker has been set
	if(!this.options.mqtt.url || this.options.mqtt.url == null)
		return this.emit('error', new Error('MQTT broker URL required but not set'));
	
	// Connect to the MQTT broker
	this.mqtt = mqtt.connect(this.options.mqtt.url, this.options.mqtt);
	this.mqtt.on('connect', function() {
		// Function that subscribes to a single setting topic
		var subscribeToSetting = function(setting) {
			var topic = util.format('sys/%s/%s', self.componentId, setting);
			self.mqtt.subscribe(topic);
		};
		// Check if there are settings that need to be retrieved
		if(self.options.settings.length > 0) {
			// Retrieve settings and set the timeout
			self.options.settings.forEach(subscribeToSetting);
			// The timeout event is fired if the settings were not received within the specified timeframe
			self.readyTimeout = setTimeout(function() {
				if(!self.ready) return self.emit('timeout');
			}, self.options.timeout || 10000);
		}
		else if(self.options.settings.length == 0) {
			// If no settings need to be retrieved, we're done
			self.ready = true;
			return self.emit('ready');
		}
	});
	
	this.mqtt.on('message', function(topic, message, packet) {
	
		// Function to handle a message that relays a setting
		var handleSettingsMessage = function() {
			var property = packet.topic.split('/')[2];
			self.settings[property] = message.toString();
			
			// If we now have all settings, clear timeout and emit ready
			if(!self.ready && Object.keys(self.settings).length >= self.options.settings.length) {
				self.ready = true;
				if(self.readyTimeout != null) clearTimeout(self.readyTimeout);
				self.emit('ready');
			}
		}
	
		if(topic.indexOf('sys/') != -1) return handleSettingsMessage();
		// If it's not a settings message, re-emit
		return self.emit('message', packet);
	
	});
	this.mqtt.on('close', function() {
		self.emit('close');
	});
	
	/**
	* Get a settings value
	**/
	this.get = function(property) {
		if(self.settings.hasOwnProperty(property))
			return self.settings[property];
		return null;
	};
	
	/**
	 * Set a settings value
	**/
	this.set = function(property, value, propagate) {
		self.settings[property] = value;
		if(propagate) {
			// Update the value on the MQTT broker as well
			self.mqtt.publish(util.format('sys/%s/%s', self.componentId, property), value, { 'retain': true });
		}
	};
	
}

util.inherits(Component, events.EventEmitter);
exports = module.exports = Component;