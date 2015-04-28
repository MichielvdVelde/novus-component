# Novus Home Automation Component

This component is created for internal use in home automation and has several handy features. It is partially based on [HomA](https://github.com/binarybucks/homA). This component uses MQTT for communication and has support for retained per-component settings and easy loading. It aims to provide a clean interface.

This module is now available on npm, but no guarantee is given about its up-to-dateness. Currently this module has no documentation to speak of and (breaking) version changes may not be documented as well. Some comments within the source should help you along for now. I hope to add documentation in the future as this module matures. The API such as it is is by no means final and a lot of breaking changes are to be expected.

## Installation

	npm install novus-component

## Simple example

This example only provides a template for how this module might be used. It is a commented version of the Growl (using [Growly](https://github.com/theabraham/growly/)) component I built, which displays notifications received on an MQTT topic.

If no MQTT broker URL has been set (as is the case in the example below), the component tries to use the value `MQTT_BROKER_URL` in `process.env`. Should this fail too, an error will be emitted.

```js
var growly = require('growly');
var Component = require('novus-component');

// The first argument is the (unique) ID of the component
// The second argument is a list of options.
// See the component source file for more info
var component = new Component('notify-growl-component', {
	// These settings are automagically loaded if available
	// If not all settings can be retrieved, the component will emit a 'timeout' event and not continue
	// Settings are retrieved from topic sys/$componentId/property
	// See lib/Component.js for a list of all settings
	'settings': [ 'name', 'icon', 'protocol', 'topic' ]
});

// The ready event is fired when the connection to MQTT has been established
// and the settings (if any) are successfully loaded
component.on('ready', function() {

	// Register to Growl with all our settings
	growly.register(component.get('name', 'My Fallback App Name'), __dirname + '/' + component.get('icon'), [
		{ label: 'success', dispname: 'Success' },
		{ label: 'warning', dispname: 'Warning' }
	], function(err) {
		if(err) return console.log(err);
		console.log('Registered with Growl');
	
		// Subscribe to the notification topic for this device
		component.mqtt.subscribe(component.get('topic'));
	});
});

// The message event is fired when a message from MQTT is recevied that
// is not a setting. So it's probably a message on a topic you subscribed to
component.on('message', function(packet) {

	// This should never happen in this example, yet it's good to have a failsafe
	if(packet.topic.toString() != component.get('topic'))
		return;

	// Create Growl notification and display
	var content = JSON.parse(packet.payload.toString());
	growly.notify(content.body, {
		'title': content.title,
		'label': content.label || null,
		'sticky': content.sticky || false,
		'sound': content.sound || false,
		'priority': content.priority || 0
	});
});

// Only emitted when the settings could not be retrieved
// within the timeout established in the options (defaults to 10s)
component.on('timeout', function() {
	console.log('Timed out!');
	process.exit(-1);
});

// Emitted when the connection to the MQTT broker is closed
component.on('close', function() {
	console.log('Connection to MQTT broker closed!');
	// Note that this event is also emitted when MQTT is unable to connect to the broker
});
```

## License

Copyright 2015 Michiel van der Velde.

This software is licensed under the [MIT License](https://github.com/MichielvdVelde/novus-component/blob/master/LICENSE)