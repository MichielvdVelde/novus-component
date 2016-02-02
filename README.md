# Novus Home Automation Component

This will become version 2 of the component. More information will be added here
in due time.

## Example

```js
import { Component } from 'novus-component';

const component = new Component('my-component-id');

component.route([
	{
		route: 'sys/{$componentId}/+key',
		handler: function(packet) {
			console.log('Received setting - %s: %s', packet.params.key, packet.payload.toString());
		}
	},
	{
		route: 'sensors/+sensor',
		handler: function(packet) {
			console.log('Sensor %s has value %s', packet.params.sensor, packet.payload.toString());
		}
	}
]);

component.start()
	.then(() => {
		console.log('Component started');
	}
);
```

## License

Copyright 2016 Michiel van der Velde.

This software is licensed under the [MIT License](https://github.com/MichielvdVelde/novus-component/blob/master/LICENSE)
