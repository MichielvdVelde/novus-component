# Novus Home Automation Component

``novus-component`` is a component that adds some handy sugar to MQTT.

Version 3 (the current version) has been rebuilt from the ground up to provide
more reliable service.

Included is an example of how to use the component. Further documentation is
forthcoming (time permitting).

## Install

```
npm i novus-component --save
```

## Example

```js
import { Component } from 'novus-component';

const component = new Component('my-component-id', {
	url: 'mqtt://broker.hivemq.com'
});

component.route({
	topic: 'just/get/some/topic',
	handler: function(packet) {
		console.log('I got', packet.payload.toString() + '!');
	}
});

component.start()
	.then((connack) => {
		console.log('Component started');

		component.publish('just/get/some/topic', 'YEEHAA')
			.then(() => {
				console.log('Published message');
			})
			.catch((err) => {
				console.error('Error publishing message:');
				console.error(err);
			});
	})
	.catch((err) => {
		console.error('Oops! Got an error:');
		console.error(err);
	});
```

## License

Copyright 2016 Michiel van der Velde.

This software is licensed under the [MIT License](LICENSE)
