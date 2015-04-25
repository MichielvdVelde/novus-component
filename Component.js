
var events = require('events');
var util = require('util');

var mqtt = require('mqtt');
var extend = require('extend');

var defaultOptions = {
	'timeout': 10000,
	'mqtt': {
		'url': 'mqtt://192.168.2.3'
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
	this.mqtt = mqtt.connect(this.options.mqtt.url, this.options.mqtt);
	this.mqtt.on('connect', function() {
		var subscribeToSetting = function(setting) {
			var topic = util.format('sys/%s/%s', self.componentId, setting);
			self.mqtt.subscribe(topic);
		};
		if(self.options.settings.length > 0) {
			self.options.settings.forEach(subscribeToSetting);
			self.readyTimeout = setTimeout(function() {
				if(!self.ready) return self.emit('timeout');
			}, self.options.timeout || 10000);
		}
		else if(self.options.settings.length == 0) {
			self.ready = true;
			return self.emit('ready');
		}
	});
	
	this.mqtt.on('message', function(topic, message, packet) {
	
		var handleSettingsMessage = function() {
			var property = packet.topic.split('/')[2];
			self.settings[property] = message;
			if(!self.ready && Object.keys(self.settings).length >= self.options.settings.length) {
				self.ready = true;
				if(self.readyTimeout != null) clearTimeout(self.readyTimeout);
				self.emit('ready');
			}
		}
	
		if(topic.indexOf('sys/') != -1) return handleSettingsMessage();
		return self.emit('message', packet);
	
	});
	this.mqtt.on('close', function() {
		self.emit('close');
	});
	
}

util.inherits(Component, events.EventEmitter);

exports = module.exports = Component;