# Novus Home Automation Component

Version 2 of the Novus Component. This is a complete rework of the component,
allowing for new use cases and ease of use. It has been designed to work with
[MQTT](http://mqtt.org), and provides a clean interface to the functionality
of the transport, as well as several handy features that help you organize and
structure your code.

The component was designed to be used my myself in my home automation system.
Because of this, it's a little opinionated, but it should be usable for a lot
of different use cases.

The component has been written in ES2015, and attempts to use the new features
provided by the specification.

## Install

```
npm i novus-component --save
```

The package includes a non-ES2015 version (which is kept up-to-date with the
ES2015 version), so you can use it out of the box in any non-ES2015 environment.
For your convenience, the package's `package.json` links to the non-ES2015 version.

## Example

```js
import { Component } from 'novus-component';

const component = new Component('my-component-id', {
	url: 'mqtt://...'
});

component.route([
	{
		route: 'sys/{$componentId}/+key',
		handler: function(packet) {
			// Store a setting in the component's internal store
			let key = packet.params.key;
			let value = packet.payload.toString();
			component.set(key, value);
		}
	},
	{
		route: 'sensors/+sensor',
		handler: function(packet) {
			let sensor = packet.params.sensor;
			let value = packet.payload.toString();
			console.log('Sensor %s has value %d', sensor, value);
		}
	}
]);

// Start the component
component.start()
	.then(() => {
		console.log('Component started');
	})
	.catch((err) => {
		console.error('Error while starting component:');
		console.error(err);
	});
```

## Reference

### Component(componentId, options)

Create a new component with the given component ID and options.

**_componentId_**

A unique ID for the component. If `clientId` is not manually set in the `options`,
this value will be set as the MQTT client's `clientId`.

**_options_**

Component configuration options.

Supports all options from [the MQTT package](https://github.com/mqttjs/MQTT.js#mqttclientstreambuilder-options). The component will attempt
to first use `url` to connect to the MQTT broker. If no `url` is set, the entire
options object is sent to `mqtt.connect`.

```js
const component = new Component('my-component-id', {
	url: 'mqtt://...'
});
```

### .route(topic, handler, options = {})

Add a route to the component. Routes are MQTT topics. The accompanying `handler`
will be called when a message is received on said topic.

You can either add one route at a time:

```js
component.route('my/topic', function(packet) {
	// do some things here
});
```

Or multiple routes (also see the example at the top):

```js
component.route([
	{
		route: 'my/topic',
		handler: function(packet) {
			// do something
		},
		options: {
			subscribe: true
		}
	},
	//... add more routes
])
```

**_topic_**

The topic this route will handle.

_Special support 1_:

If you use `{$componentId}` in a route (aka topic), this placeholder will be
replaced by the component's ID at initialization.

```js
component.route([
	{
		// {$componentId} will be replaced by the ID of the component
		route: 'some/topic/for/{$componentId}',
		// ...
	}
]);
```

_Special support 2_:

Topics use [mqtt-regex](https://github.com/RangerMauve/mqtt-regex) internally. This allows you to do some
really cool extra things; add parameters.

A small example:

```js
// Replace a single wildcard with a parameter:
let topic = 'some/+value';

// Replace a # wildcard:
let topic = 'some/#path';
```

The `packet` object contains a `params` attribute which can be used to get the
values of these parameters:

```js
// ...
handler: function(packet) {
	// Matches '+value' above
	let value = packet.params.value;

	// Matches `#path` above
	let path = packet.params.path;
}
```

**_handler_**

The method that will be called when a message is received on said topic. It has
the signature `function(packet, component)`. `packet` is a [mqtt-packet](https://github.com/mqttjs/mqtt-packet#publish), and
`component` is a reference to the component (you don't say!).

**_options_**

Options for this route.

* `subscribe`: If set to `true`, the component will subscribe to this topic when
it connects to the MQTT broker (default `true`).

### .start()

Start the component. This method returns a Promise. See the example above.

### .isConnected()

Returns `true` if the component is currently connectd to an MQTT broker.

### .publish(topic, message, options = {})

Publish a message. This method returns a Promise.

**_topic_**

The topic to publish the message on.

**_message_**

The message to publish. **Note:** as of this moment, sending any non-string
messages may result in an error!

**_options_**

Options to set for this publish. Also see [this reference](https://github.com/mqttjs/MQTT.js#mqttclientpublishtopic-message-options-callback).

* `qos`: QoS level, `Number`, defaults to `0`
* `retain`: retain flag, `Boolean`, default `false`

## .subscribe(topic, options ={})

Subscribe to an MQTT topic. This method returns a Promise.

**_topic_**

The topic to subscribe to.

**_options_**

Subscription options. Also see [this reference](https://github.com/mqttjs/MQTT.js#mqttclientsubscribetopictopic-arraytopic-object-options-callback).

* `qos`: QoS subscription level, default `0`

## .set(key, value)

Set a key to a value in the internal store.

**_key_**

The key name.

**_value_**

The value for the key.

### .get(key, def = null)

Get the value for a key from the internal store.

**_key_**

The key to get from the store.

**_def_**

The value to return when the key is not found. Defaults to `null`.

### Packet

When a route handler is called, the first argument is the `packet`. See [this reference](https://github.com/mqttjs/mqtt-packet#publish).

In addition, **a `params` key is added**. This attribute gives you access to
any parameters you've used in the route (see above).

## Version history

* v2.0.3 (13 Jan 2016)
  * Add support for basic plugins and custom component methods
* v2.0.0 - 2.0.2 (10 Jan 2016)
  * (2.0.1) Update dependencies
  * (2.0.0) Initial publish

## License

Copyright 2016 Michiel van der Velde.

This software is licensed under the [MIT License](LICENSE)
