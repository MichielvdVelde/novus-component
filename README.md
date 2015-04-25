# Novus Home Automation Component

This component is created for internal use in home automation and has several handy features. It is partically based on [HomA](https://github.com/binarybucks/homA). This component uses MQTT for communication and has support for retained per-component settings and easy loading. It aims to provide a clean interface.

Currently this module is not on npm and has no documentation to speak of. I hope to change this in the future as this module matures.

## Simple example

This example only provides a template for how this module might be used. It is pased from a Growl component that displays relayed notifications.

```js
var component = new Component('notify-growl-component', {
	// These settings are automagically loaded if available
	// If not all settings can be retrieved, the component will emit a 'timeout' event and not continue
	'settings': [ 'name', 'icon', 'protocol', 'topic' ]
});

var registered = false;
// The ready event is fired when the connection to MQTT has been established
// and the settings (if any) are successfully loaded
component.on('ready', function() {

	// Register to Growl with all our settings
	growly.register(component.settings.name, __dirname + '/' + component.settings.icon, [
		{ label: 'success', dispname: 'Success' },
		{ label: 'warning', dispname: 'Warning' }
	], function(err) {
		if(err) return console.log(err);
		console.log('Registered with Growl');
		registered = true;
	});
	
	// Subscribe to the notification topic for this device
	component.mqtt.subscribe(component.settings.topic);
});

// The message event is fired when a message from MQTT is recevied that
// is not a setting. So it's probably a message on a topic you subscribed to
component.on('message', function(packet) {

	// Prevent notifiying when app is not registered
	if(!registered) return;

	// Create Growl notification and display
	var content = content = JSON.parse(packet.payload.toString());
	growly.notify(content.body, {
		'title': content.title,
		'label': content.label || null,
		'sticky': content.sticky || false,
		'sound': content.sound || false,
		'priority': content.priority || 0
	});
});
```